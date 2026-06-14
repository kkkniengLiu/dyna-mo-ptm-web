# Codex brief — build the Dyna-MO PTM web interface

> Hand this whole file to codex as the initial prompt. Everything codex needs to know to start is here.

---

## Context

We are publishing **Dyna-MO PTM**, a molecular-dynamics database of 1,095 post-translationally modified proteins covering six PTM types: acetyl-K, methyl-K, methyl-R, phospho-S, phospho-T, phospho-Y. Total simulation time 32.85 μs. The submission target is *Nucleic Acids Research* Database issue, which requires the data to be accessible via an open web interface — that is what you are building. The paper draft, methods, and figures are already written and live in `submission/`.

The project root is `C:\Users\lkn\Desktop\Dyna-MO PTM\`. A `dyna-mo-web/` directory was planned but never built (it is currently listed in `.gitignore`; you will be building it now). This brief lives at `dyna-mo-web/CODEX_BRIEF.md`.

## Goal

A **static** GitHub Pages site (no backend) that:

1. Renders the per-system descriptor table `submission/master_table_all_v2.csv` (1,095 rows × 100 columns) as a sortable / filterable browser interface.
2. Provides a landing page per system with the input AF3 structure embedded in a 3D viewer (NGL.js preferred, Mol* fallback), plus the system's descriptor row laid out cleanly.
3. Has a home / overview page summarising the dataset (6 PTM counts, length distribution, total simulation time, link to the paper).

Trajectory files are too large for the web bundle — deep-link to Zenodo for users who want them. Only the input AF3 PDB (and optionally the rep1 final-frame snapshot) need to be hosted in the web bundle.

## Inputs available locally

- `submission/master_table_all_v2.csv` — primary user-facing artefact, 1,095 rows × 100 cols. Key columns to surface in the table:
  - `system` (ID), `uniprot`, `ptm_type` (one of `acetyl_K` / `methyl_K` / `methyl_R` / `phos_S` / `phos_T` / `phos_Y`), `mod_residue`, `n_residues`, `sim_time_ns`
  - `rmsd_equil_mean_A`, `rg_mean_A`, `rmsf_mean_A`, `rmsf_max_A`
  - `sasa_site_mean_nm2`, `n_sb_contacts_mean`
  - `chi1_dominant_rotamer`, `chi2_dominant_rotamer`, `site_ss_dominant`
  - K/R-PTM-only site-context cols: `terminal_proximal`, `burial_class`, `local_pLDDT_8A`
- `submission/master_table_README.md` — column dictionary. If a column type is ambiguous, infer it from values.
- `submission/figures/` — pre-rendered v2 PDFs / PNGs for Figs. 1, 3, 4, 5, 6. Reuse `fig1_composition_v2.png` on the homepage.
- `inputs/all_ptm_pdbs.tar.gz` — AF3 input PDBs for K/R-PTM systems (754 of 1,095). The 341 phos PDBs are NOT yet locally archived; the system detail page must gracefully handle "PDB not available locally — hosted at Zenodo".

## Stack constraints

- **Static only** — HTML / CSS / JS. No Node backend, no server runtime.
- **Build output** in `dyna-mo-web/dist/`; GitHub Pages will serve from there (or from `gh-pages` branch via deploy workflow).
- 1,095-row table must use **client-side virtualization** for snappy filter / sort / scroll. Acceptable choices: TanStack Table + TanStack Virtualizer, Tabulator with virtual DOM, or AG Grid Community.
- 3D viewer: **NGL Viewer** preferred (smaller bundle, well-documented PDB loading). Switch to Mol* only if NGL cannot do what we need (e.g. selection highlighting of a specific HETATM residue).
- Framework: your call. Recommended is **Vite + Svelte** or **Vite + Vue 3** for fast dev and small bundle. Avoid Next.js — SSR is overkill for a static data browser.
- **Bundle the descriptor table at build time**: convert `master_table_all_v2.csv` → `public/data/master_table.json` once during the build step, then the SPA loads it as a single static asset.

## Required pages

1. **Home / overview** (`/`):
   - Hero: title, dataset stats (1,095 systems / 32.85 μs / 6 PTM types).
   - Embed `submission/figures/fig1_composition_v2.png` (PTM counts + length histogram) — copy into `public/figures/` at build.
   - "Browse the database" CTA → `/browse`.
   - Footer links: GitHub repo (`__GITHUB_URL__` placeholder), Zenodo (`__ZENODO_DOI__` placeholder), paper DOI (`__PAPER_DOI__` placeholder).

2. **Table view** (`/browse`):
   - Virtualised table of all 1,095 systems.
   - Filter chips for `ptm_type` (six values).
   - Free-text search across `system` and `uniprot`.
   - Sortable on every visible column.
   - Visible columns: `system`, `uniprot`, `ptm_type`, `mod_residue`, `n_residues`, `rmsd_equil_mean_A`, `rg_mean_A`, `chi1_dominant_rotamer`, `site_ss_dominant`.
   - Each row clickable → `/system/[id]`.

3. **System detail** (`/system/[id]`):
   - Header: system ID, UniProt link-out, PTM type chip, modified residue number.
   - 3D viewer (NGL): load `public/structures/{system}.pdb`, highlight the HETATM modified residue (CCD code ALY / MLZ / AGM / SEP / TPO / PTR).
   - If the PDB is not locally hosted (phos subset), show a clean fallback panel: "Structure data hosted at Zenodo — \[deep link\]".
   - Descriptor panel: 2-column key/value layout, grouped under Provenance / Global QC / Site biophysics / Site structural context (K/R-PTM only).
   - "Download trajectories" CTA → Zenodo deep-link for that system.

4. **About** (`/about`):
   - Short version of paper Abstract + Methods summary.
   - Citation instructions (BibTeX block — populate from `submission/references.bib`).
   - Licences: CC-BY 4.0 for data, MIT for code.

## Data hosting rules

- Extract `inputs/all_ptm_pdbs.tar.gz` during build, deduplicate, and place one PDB per K/R-PTM system at `public/structures/{system}.pdb`.
- For the 341 phos systems, render the Zenodo fallback panel (above) — do NOT block the build on missing files.
- Do NOT host `.xtc` trajectory files — always defer to Zenodo.

## Deliverables

- A complete `dyna-mo-web/` directory at the project root with `package.json`, `vite.config.{js,ts}`, source tree, and ready-to-run dev / build scripts.
- `dyna-mo-web/README.md` explaining: install, dev server, production build, GitHub Pages deploy path, and where to grep-replace the placeholder strings (`__ZENODO_DOI__`, `__GITHUB_URL__`, `__PAPER_DOI__`) at submission time.
- `.github/workflows/deploy-web.yml` for automatic GitHub Pages deploy on push to `main` (only when files under `dyna-mo-web/` or `submission/master_table_all_v2.csv` change).
- A short MIGRATION note in `README.md` describing what to do when the phos AF3 PDBs become available later (drop them into the same `public/structures/` layout, rebuild).

## Style

- Clean, academic. White background, restrained palette.
- Sans-serif (Inter or Atkinson Hyperlegible).
- Match the figure palette in `submission/figures/` for visual continuity. The PTM-type 6-colour palette is defined in `scripts/md_analysis/make_fig1_v2.py` — read the `PTM_COLORS = {...}` dict from there and reuse exactly the same hex codes throughout the UI (chips, table cells, badges).
- Mobile-tolerant but desktop-first (NAR readers are on desktops).
- Don't add emoji or icon-set sugar.

## Workflow

Please start by:

1. Reading `submission/master_table_README.md` and the project root `README.md`.
2. Skimming the v1 manuscript at `submission/manuscript_v1_NAR.md` for vocabulary and tone.
3. Reading `scripts/md_analysis/make_fig1_v2.py` to extract the colour palette.
4. Proposing a directory layout + tech-stack pick (Svelte vs Vue vs vanilla) in a short note.
5. Asking the user (Liu Kaining) to confirm the stack pick before implementing.
6. Then implementing — committing in small, reviewable chunks.

## Open placeholders (do not block on these)

- Zenodo DOI: not yet issued. Use `__ZENODO_DOI__`.
- GitHub repo URL: `__GITHUB_URL__`.
- Paper DOI: `__PAPER_DOI__`.
- Phos AF3 PDBs: not yet locally archived. Render Zenodo fallback panel for those 341 systems.

When you finish a chunk, summarise what changed and what still depends on the user (CSV updates, palette change, PDB drop, etc.) so they can act on it.
