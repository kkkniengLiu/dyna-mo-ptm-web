import { parse } from "csv-parse/sync";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type CsvRecord = Record<string, string>;

type PublicSystem = {
  id: string;
  uniprot: string;
  ptm_type: string;
  ptm_label: string;
  ptm_family: "K/R-PTM" | "phosphorylation";
  color: string;
  mod_residue: string;
  site_num: number | null;
  ccd_code: string;
  status: string;
  final_flag: string;
  site_status: string;
  schema_version: string;
  n_residues: number | null;
  sim_time_ns: number | null;
  traj_ns_total: number | null;
  rmsd_equil_mean_A: number | null;
  rg_mean_A: number | null;
  rmsf_mean_A: number | null;
  rmsf_max_A: number | null;
  sasa_site_mean_nm2: number | null;
  n_sb_contacts_mean: number | null;
  chi1_dominant_rotamer: string;
  chi2_dominant_rotamer: string;
  site_ss_dominant: string;
  terminal_proximal: string;
  burial_class: string;
  site_plddt: number | null;
  local_pLDDT_8A: number | null;
  has_structure: boolean;
  structure_path: string;
  zenodo_url: string;
  raw: CsvRecord;
};

type PublicSystemSummary = Omit<PublicSystem, "raw">;

type StaticPayload = {
  generated_at: string;
  source_csv: string;
  schema_version: string;
  stats: {
    systems: number;
    ptm_types: number;
    total_simulation_us: number;
    local_structures: number;
    median_length: number | null;
    counts: Array<{
      ptm_type: string;
      label: string;
      color: string;
      count: number;
    }>;
  };
  systems: PublicSystem[];
};

const root = path.resolve(process.cwd(), "..");
const webRoot = process.cwd();
const publicDir = path.join(webRoot, "public");
const dataDir = path.join(publicDir, "data");
const apiDir = path.join(publicDir, "api");
const apiSystemDir = path.join(apiDir, "system");
const figuresDir = path.join(publicDir, "figures");
const structuresDir = path.join(publicDir, "structures");
const staticDataPath = path.join(dataDir, "master_table.json");
const csvPath = path.join(root, "submission", "master_table_all_v2.csv");
const fig1Path = path.join(
  root,
  "submission",
  "figures",
  "fig1_dataset_overview_v2.png",
);
const pdbTarPath = path.join(root, "inputs", "all_ptm_pdbs.tar.gz");
const tmpPdbDir = path.join(webRoot, ".cache", "pdb_extract");

const PTM_ORDER = [
  "acet_K",
  "methyl_K",
  "methyl_R",
  "phos_S",
  "phos_T",
  "phos_Y",
];
const PTM_LABELS: Record<string, string> = {
  acet_K: "acetyl-K",
  acetyl_K: "acetyl-K",
  methyl_K: "methyl-K",
  methyl_R: "methyl-R",
  phos_S: "phospho-S",
  phos_T: "phospho-T",
  phos_Y: "phospho-Y",
};
const PTM_COLORS: Record<string, string> = {
  acet_K: "#1f77b4",
  acetyl_K: "#1f77b4",
  methyl_K: "#ff7f0e",
  methyl_R: "#2ca02c",
  phos_S: "#d62728",
  phos_T: "#9467bd",
  phos_Y: "#8c564b",
};
const RAW_VALUE_TRANSLATIONS: Record<string, string> = {
  ["\u5404\u6307\u6807\u53ef\u63a5\u53d7"]: "All QC metrics acceptable",
};

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(apiSystemDir, { recursive: true });
fs.mkdirSync(figuresDir, { recursive: true });
fs.mkdirSync(structuresDir, { recursive: true });

if (!fs.existsSync(csvPath)) {
  throw new Error(`Missing CSV: ${csvPath}`);
}

const csvText = fs.readFileSync(csvPath, "utf8");
const records = parse(csvText, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as CsvRecord[];

const allowedStructureIds = new Set(
  records
    .map((row) => first(row.system, row.protein_name))
    .filter((id) => id && !id.includes("_phospho")),
);

cleanDirectory(dataDir);
cleanDirectory(apiDir);
cleanDirectory(figuresDir);
copyFigureAssets();
extractPdbAssets(allowedStructureIds);

const systems = records.map(normalizeSystem);
const schemaVersion = inferSchemaVersion(systems);
const counts = PTM_ORDER.map((ptm) => ({
  ptm_type: ptm,
  label: PTM_LABELS[ptm],
  color: PTM_COLORS[ptm],
  count: systems.filter((system) => system.ptm_type === ptm).length,
}));
const lengths = systems
  .map((system) => system.n_residues)
  .filter((value): value is number => value !== null && value > 0);

const payload: StaticPayload = {
  generated_at: new Date().toISOString(),
  source_csv: "submission/master_table_all_v2.csv",
  schema_version: schemaVersion,
  stats: {
    systems: systems.length,
    ptm_types: counts.length,
    total_simulation_us: 32.85,
    local_structures: systems.filter((system) => system.has_structure).length,
    median_length: median(lengths),
    counts,
  },
  systems,
};

fs.writeFileSync(staticDataPath, JSON.stringify(payload), "utf8");
fs.writeFileSync(
  path.join(dataDir, "master_table_all_v2.csv"),
  sanitizeCsvText(csvText),
  "utf8",
);
writeApiFiles(payload);
writeSeoFiles(systems);

console.log(
  `Prepared static data: ${systems.length} systems, ${payload.stats.local_structures} local PDBs, static API files`,
);

function normalizeSystem(row: CsvRecord): PublicSystem {
  const id = first(row.system, row.protein_name);
  const uniprot = first(row.uniprot, row.uniprot_id).toUpperCase();
  const ptm = normalizePtm(row.ptm_type);
  const siteNum = numberOrNull(
    first(row.site_num, row.site_resnum, row.site_resid),
  );
  const modResidue =
    first(
      row.mod_residue,
      row.site,
      siteNum ? `${first(row.site_aa, "").toLowerCase()}${siteNum}` : "",
    ) || "NA";
  const ccd = first(row.site_res, row.site_resname);
  const structurePath = `/structures/${id}.pdb`;
  const hasStructure = fs.existsSync(path.join(structuresDir, `${id}.pdb`));

  return {
    id,
    uniprot,
    ptm_type: ptm,
    ptm_label: PTM_LABELS[ptm] ?? ptm,
    ptm_family: ptm.startsWith("phos") ? "phosphorylation" : "K/R-PTM",
    color: PTM_COLORS[ptm] ?? "#14766f",
    mod_residue: modResidue,
    site_num: siteNum,
    ccd_code: ccd,
    status: first(
      row.status,
      row.final_flag,
      ptm.startsWith("phos") ? "PHOSPHO_PENDING" : "not available",
    ),
    final_flag: first(row.final_flag, "not available"),
    site_status: first(
      row.site_status,
      ptm.startsWith("phos") ? "SITE_PENDING" : "not available",
    ),
    schema_version: first(row.schema_version, "not available"),
    n_residues: numberOrNull(row.n_residues),
    sim_time_ns: numberOrNull(row.sim_time_ns),
    traj_ns_total: numberOrNull(row.traj_ns_total) ?? 30,
    rmsd_equil_mean_A: numberOrNull(row.rmsd_equil_mean_A),
    rg_mean_A: numberOrNull(row.rg_mean_A),
    rmsf_mean_A: numberOrNull(row.rmsf_mean_A),
    rmsf_max_A: numberOrNull(row.rmsf_max_A),
    sasa_site_mean_nm2: numberOrNull(
      first(row.sasa_site_mean_nm2, row.sasa_site_nm2),
    ),
    n_sb_contacts_mean: numberOrNull(
      first(row.n_sb_contacts_mean, row.sb_contacts_mean),
    ),
    chi1_dominant_rotamer: first(row.chi1_dominant_rotamer, row.chi1_dominant),
    chi2_dominant_rotamer: first(row.chi2_dominant_rotamer, row.chi2_dominant),
    site_ss_dominant: first(row.site_ss_dominant, row.ss_dominant),
    terminal_proximal: first(row.terminal_proximal, row.is_terminal_lt10),
    burial_class: first(row.burial_class, "not available"),
    site_plddt: numberOrNull(first(row.site_plddt, row.plddt_mean)),
    local_pLDDT_8A: numberOrNull(first(row.local_pLDDT_8A, row.local_plddt_8A)),
    has_structure: hasStructure,
    structure_path: structurePath,
    zenodo_url: `https://doi.org/__ZENODO_DOI__?system=${encodeURIComponent(id)}`,
    raw: sanitizeRawRecord(row),
  };
}

function sanitizeRawRecord(row: CsvRecord): CsvRecord {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, translateRawValue(value)]),
  );
}

function translateRawValue(value: string) {
  const trimmed = value.trim();
  return RAW_VALUE_TRANSLATIONS[trimmed] ?? value;
}

function sanitizeCsvText(text: string) {
  return Object.entries(RAW_VALUE_TRANSLATIONS).reduce(
    (current, [source, target]) => current.split(source).join(target),
    text,
  );
}

function normalizePtm(value: string) {
  if (value === "acetyl_K") {
    return "acet_K";
  }
  return value;
}

function copyFigureAssets() {
  const sourceFiguresDir = path.dirname(fig1Path);
  if (!fs.existsSync(sourceFiguresDir)) {
    return;
  }

  for (const source of walk(sourceFiguresDir).filter((file) =>
    /\.(png|pdf)$/i.test(file),
  )) {
    const relativePath = path.relative(sourceFiguresDir, source);
    const target = path.join(figuresDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  if (fs.existsSync(fig1Path)) {
    fs.copyFileSync(fig1Path, path.join(figuresDir, "fig1_composition_v2.png"));
  }
}

function extractPdbAssets(allowedIds: Set<string>) {
  cleanDirectory(structuresDir);
  if (!fs.existsSync(pdbTarPath)) {
    return;
  }

  cleanDirectory(tmpPdbDir);
  fs.mkdirSync(tmpPdbDir, { recursive: true });
  execFileSync("tar", ["-xzf", pdbTarPath, "-C", tmpPdbDir], {
    stdio: "ignore",
  });

  for (const pdb of walk(tmpPdbDir).filter((file) => file.endsWith(".pdb"))) {
    const id = path.basename(pdb, ".pdb");
    if (!allowedIds.has(id)) {
      continue;
    }
    const target = path.join(structuresDir, path.basename(pdb));
    if (!fs.existsSync(target)) {
      fs.copyFileSync(pdb, target);
    }
  }
}

function writeApiFiles(payload: StaticPayload) {
  fs.mkdirSync(apiSystemDir, { recursive: true });
  const systemsIndex = {
    generated_at: payload.generated_at,
    source_csv: payload.source_csv,
    count: payload.systems.length,
    systems: payload.systems.map(toSystemSummary),
  };
  fs.writeFileSync(
    path.join(apiDir, "systems.json"),
    JSON.stringify(systemsIndex, null, 2),
    "utf8",
  );

  for (const system of payload.systems) {
    fs.writeFileSync(
      path.join(apiSystemDir, `${encodeURIComponent(system.id)}.json`),
      JSON.stringify(system, null, 2),
      "utf8",
    );
  }
}

function toSystemSummary(system: PublicSystem): PublicSystemSummary {
  return Object.fromEntries(
    Object.entries(system).filter(([key]) => key !== "raw"),
  ) as PublicSystemSummary;
}

function writeSeoFiles(systems: PublicSystem[]) {
  const siteUrl = (
    process.env.SITE_URL ?? "https://example.org/dyna-mo-ptm"
  ).replace(/\/+$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const routes = [
    { loc: "/", priority: "1.0" },
    { loc: "/browse", priority: "0.9" },
    { loc: "/about", priority: "0.6" },
    ...systems.map((system) => ({
      loc: `/system/${encodeURIComponent(system.id)}`,
      priority: "0.7",
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${escapeXml(`${siteUrl}${route.loc}`)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  fs.writeFileSync(
    path.join(publicDir, "robots.txt"),
    `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml
`,
    "utf8",
  );
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap, "utf8");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function cleanDirectory(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function first(...values: Array<string | undefined | null>) {
  return (
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    ) ?? ""
  );
}

function numberOrNull(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function inferSchemaVersion(systems: PublicSystem[]) {
  const versions = new Set(
    systems
      .map((system) => system.schema_version)
      .filter((version) => version && version !== "not available"),
  );
  return versions.size === 1 ? [...versions][0] : [...versions].join(",");
}
