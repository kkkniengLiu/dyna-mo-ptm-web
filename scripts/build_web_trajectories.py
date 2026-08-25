#!/usr/bin/env python3
"""Build static web trajectory assets for DynaMo PTM.

The script fetches rep1 GROMACS trajectories from the GPU server, aligns and
subsets them with mdtraj when available, and writes browser-loadable
``<system_id>.gro`` / ``<system_id>.xtc`` files under
``dyna-mo-web/public/trajectories``.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import posixpath
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_REMOTE = "liukaining@10.109.92.237"
DEFAULT_REMOTE_RUNS = "/home/liukaining/projects/dyna_mo_ptm/runs"


@dataclass(frozen=True)
class SystemRow:
    system_id: str
    ptm_type: str
    ccd_code: str
    site_num: int | None
    sim_time_ns: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remote", default=DEFAULT_REMOTE)
    parser.add_argument("--remote-runs", default=DEFAULT_REMOTE_RUNS)
    parser.add_argument(
        "--manifest",
        default="dyna-mo-web/public/data/master_table.json",
        help="Static web JSON produced by prepare-static-data.ts.",
    )
    parser.add_argument(
        "--csv",
        default="submission/master_table_all_v2.csv",
        help="Fallback source when master_table.json is unavailable.",
    )
    parser.add_argument(
        "--out",
        default="dyna-mo-web/public/trajectories",
        help="Directory receiving <system_id>.gro and <system_id>.xtc.",
    )
    parser.add_argument("--systems", nargs="*", help="Specific system IDs.")
    parser.add_argument("--systems-file", help="Newline-delimited system IDs.")
    parser.add_argument("--limit", type=int, help="Limit for smoke tests.")
    parser.add_argument("--frames", type=int, default=100)
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Reuse existing <system_id>.pdb/.gro/.xtc outputs and only refresh manifest metadata.",
    )
    parser.add_argument(
        "--allow-unprocessed-copy",
        action="store_true",
        help="Copy remote md.gro/md_fit.xtc directly when mdtraj is missing.",
    )
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path.cwd()
    systems = load_systems(project_root / args.manifest, project_root / args.csv)
    wanted_items = list(args.systems or [])
    if args.systems_file:
        wanted_items.extend(
            item.strip()
            for item in (project_root / args.systems_file).read_text(encoding="utf-8").splitlines()
            if item.strip()
        )
    if wanted_items:
        wanted = {item.lower() for item in wanted_items}
        systems = [row for row in systems if row.system_id.lower() in wanted]
    if args.limit:
        systems = systems[: args.limit]

    if not systems:
        print("No systems selected", file=sys.stderr)
        return 2

    mdtraj_available = has_mdtraj()
    if not args.dry_run and not mdtraj_available and not args.allow_unprocessed_copy:
        print(
            "mdtraj is required for production trajectory assets. "
            "Install mdtraj or pass --allow-unprocessed-copy for a small "
            "viewer smoke test.",
            file=sys.stderr,
        )
        return 2

    out_dir = project_root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    failures = []

    with tempfile.TemporaryDirectory(prefix="dynamo_traj_") as tmp_name:
        tmp_dir = Path(tmp_name)
        for index, row in enumerate(systems, start=1):
            print(f"[{index}/{len(systems)}] {row.system_id}")
            try:
                result = build_one(
                    row=row,
                    remote=args.remote,
                    remote_runs=args.remote_runs,
                    tmp_dir=tmp_dir,
                    out_dir=out_dir,
                    frames=args.frames,
                    mdtraj_available=mdtraj_available,
                    allow_unprocessed_copy=args.allow_unprocessed_copy,
                    skip_existing=args.skip_existing,
                    dry_run=args.dry_run,
                )
                manifest.append(result)
            except Exception as exc:  # noqa: BLE001 - report and continue
                failures.append({"system_id": row.system_id, "error": str(exc)})
                print(f"  FAILED: {exc}", file=sys.stderr)

    if not args.dry_run:
        (out_dir / "manifest.json").write_text(
            json.dumps(
                {
                    "generated_by": "scripts/build_web_trajectories.py",
                    "requested": len(systems),
                    "available": len(manifest),
                    "failed": len(failures),
                    "systems": manifest,
                    "failures": failures,
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    print(f"available={len(manifest)} requested={len(systems)} failed={len(failures)}")
    return 0 if not failures else 1


def load_systems(manifest_path: Path, csv_path: Path) -> list[SystemRow]:
    if manifest_path.exists():
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        rows = payload.get("systems", [])
        return [
            SystemRow(
                system_id=str(row["id"]),
                ptm_type=str(row["ptm_type"]),
                ccd_code=str(row.get("ccd_code") or "").strip().upper(),
                site_num=as_int(row.get("site_num")),
                sim_time_ns=as_float(row.get("sim_time_ns"), 10.0),
            )
            for row in rows
            if row.get("id") and row.get("ptm_type")
        ]

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return [
            SystemRow(
                system_id=row.get("system") or row.get("protein_name") or infer_system_id(row),
                ptm_type=row.get("ptm_type", ""),
                ccd_code=str(row.get("site_res") or row.get("site_resname") or "").strip().upper(),
                site_num=as_int(row.get("site_num") or row.get("site_resnum")),
                sim_time_ns=as_float(row.get("sim_time_ns"), 10.0),
            )
            for row in reader
            if row.get("ptm_type")
        ]


def build_one(
    *,
    row: SystemRow,
    remote: str,
    remote_runs: str,
    tmp_dir: Path,
    out_dir: Path,
    frames: int,
    mdtraj_available: bool,
    allow_unprocessed_copy: bool,
    skip_existing: bool,
    dry_run: bool,
) -> dict[str, object]:
    remote_dir = f"{remote_runs}/{row.ptm_type}/{row.system_id}/rep1"
    out_pdb = out_dir / f"{row.system_id}.pdb"
    out_gro = out_dir / f"{row.system_id}.gro"
    out_xtc = out_dir / f"{row.system_id}.xtc"
    if skip_existing and out_pdb.exists() and out_gro.exists() and out_xtc.exists():
        return {
            "system_id": row.system_id,
            "ptm_type": row.ptm_type,
            "pdb": out_pdb.name,
            "gro": out_gro.name,
            "xtc": out_xtc.name,
            "size_bytes": out_xtc.stat().st_size,
            "sim_time_ns": row.sim_time_ns,
            "source": "existing",
        }

    local_dir = tmp_dir / row.system_id
    if local_dir.exists():
        shutil.rmtree(local_dir)
    local_dir.mkdir()

    cleanup_remote_dir: str | None = None
    fit_remote = first_existing_remote(remote, [f"{remote_dir}/md_fit.xtc"])
    gro_remote = None
    xtc_candidates = []
    if fit_remote and row.ccd_code:
        gro_remote = build_remote_protein_ptm_topology(
            remote=remote,
            remote_dir=remote_dir,
            ccd_code=row.ccd_code,
        )
        if gro_remote:
            cleanup_remote_dir = posixpath.dirname(gro_remote)
            xtc_candidates = [fit_remote]

    if not gro_remote:
        gro_remote = first_existing_remote(
            remote,
            [f"{remote_dir}/md.gro", f"{remote_dir}/start.gro"],
        )
        # Fallback path. These files are larger, but keep the rollout robust
        # when the upstream fitted trajectory or PTM index group is absent.
        xtc_candidates = [f"{remote_dir}/md_noPBC.xtc", f"{remote_dir}/md.xtc", f"{remote_dir}/md_fit.xtc"]
    xtc_remote = first_existing_remote(remote, xtc_candidates)
    if not gro_remote or not xtc_remote:
        raise FileNotFoundError(f"missing remote topology or trajectory in {remote_dir}")

    if dry_run:
        return {
            "system_id": row.system_id,
            "ptm_type": row.ptm_type,
            "gro_remote": gro_remote,
            "xtc_remote": xtc_remote,
        }

    local_gro = local_dir / "input.gro"
    local_xtc = local_dir / "input.xtc"
    try:
        run(["scp", f"{remote}:{gro_remote}", str(local_gro)])
        run(["scp", f"{remote}:{xtc_remote}", str(local_xtc)])
    finally:
        if cleanup_remote_dir:
            subprocess.run(
                ["ssh", remote, f"rm -rf {shell_quote(cleanup_remote_dir)}"],
                check=False,
            )

    if mdtraj_available:
        process_with_mdtraj(
            input_gro=local_gro,
            input_xtc=local_xtc,
            output_pdb=out_pdb,
            output_gro=out_gro,
            output_xtc=out_xtc,
            site_num=row.site_num,
            frames=frames,
        )
    elif allow_unprocessed_copy:
        shutil.copyfile(local_gro, out_pdb)
        shutil.copyfile(local_gro, out_gro)
        shutil.copyfile(local_xtc, out_xtc)

    return {
        "system_id": row.system_id,
        "ptm_type": row.ptm_type,
        "pdb": out_pdb.name,
        "gro": out_gro.name,
        "xtc": out_xtc.name,
        "size_bytes": out_xtc.stat().st_size,
        "sim_time_ns": row.sim_time_ns,
        "source": "md_fit" if fit_remote and cleanup_remote_dir else "fallback",
    }


def process_with_mdtraj(
    *,
    input_gro: Path,
    input_xtc: Path,
    output_pdb: Path,
    output_gro: Path,
    output_xtc: Path,
    site_num: int | None,
    frames: int,
) -> None:
    import mdtraj as md  # type: ignore[import-not-found]

    traj = md.load(str(input_xtc), top=str(input_gro))
    if traj.n_frames > frames:
        stride = max(1, traj.n_frames // frames)
        traj = traj[::stride][:frames]
    traj.superpose(traj[0])

    topology = traj.topology
    protein_heavy = set(topology.select("protein and not element H").tolist())
    site_heavy: set[int] = set()
    if site_num is not None:
        for atom in topology.atoms:
            if atom.residue.resSeq == site_num and atom.element.symbol != "H":
                site_heavy.add(atom.index)

    atom_indices = sorted(protein_heavy | site_heavy)
    if not atom_indices:
        atom_indices = topology.select("not water and not element H").tolist()
    if not atom_indices:
        raise ValueError("empty atom selection after heavy-atom filtering")

    slim = traj.atom_slice(atom_indices)
    slim[0].save_pdb(str(output_pdb))
    slim[0].save_gro(str(output_gro))
    slim.save_xtc(str(output_xtc))


def build_remote_protein_ptm_topology(
    *,
    remote: str,
    remote_dir: str,
    ccd_code: str,
) -> str | None:
    group_name = f"Protein_{ccd_code}"
    command = (
        "source ~/software/miniconda3/etc/profile.d/conda.sh 2>/dev/null; "
        "conda activate md 2>/dev/null; "
        f"cd {shell_quote(remote_dir)}; "
        "tmp=$(mktemp -d /tmp/dynamo_web_top_XXXXXX); "
        "printf '1|13\\nq\\n' | "
        "gmx_mpi make_ndx -f md.tpr -o \"$tmp/protein_ptm.ndx\" >/dev/null 2>&1; "
        f"printf {shell_quote(group_name + chr(10))} | "
        "gmx_mpi trjconv -s md.tpr -f md.gro -n \"$tmp/protein_ptm.ndx\" "
        "-o \"$tmp/protein_ptm.gro\" >/dev/null 2>&1; "
        "test -f \"$tmp/protein_ptm.gro\" && echo \"$tmp/protein_ptm.gro\""
    )
    result = subprocess.run(
        ["ssh", remote, command],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip().splitlines()[0]
    return None


def first_existing_remote(remote: str, candidates: Iterable[str]) -> str | None:
    quoted = " ".join(shell_quote(item) for item in candidates)
    command = f"for f in {quoted}; do test -f \"$f\" && echo \"$f\" && exit 0; done; exit 1"
    result = subprocess.run(
        ["ssh", remote, command],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode == 0:
        return result.stdout.strip().splitlines()[0]
    return None


def has_mdtraj() -> bool:
    try:
        import mdtraj  # noqa: F401

        return True
    except Exception:
        return False


def infer_system_id(row: dict[str, str]) -> str:
    protein = (row.get("protein_id") or row.get("uniprot") or row.get("uniprot_id") or "").lower()
    site_aa = (row.get("site_aa") or row.get("site_res") or row.get("site") or "x").lower()
    site_num = row.get("site_num") or row.get("site_resnum") or ""
    suffix = {
        "acet_K": "acetyl",
        "methyl_K": "methyl",
        "methyl_R": "methyl",
        "phos_S": "phospho",
        "phos_T": "phospho",
        "phos_Y": "phospho",
    }.get(row.get("ptm_type", ""), row.get("ptm_type", "ptm").lower())
    return f"{protein}_{site_aa}{site_num}_{suffix}".strip("_")


def as_int(value: object) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(float(str(value)))
    except ValueError:
        return None


def as_float(value: object, default: float) -> float:
    try:
        if value in (None, ""):
            return default
        return float(str(value))
    except ValueError:
        return default


def shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


if __name__ == "__main__":
    raise SystemExit(main())
