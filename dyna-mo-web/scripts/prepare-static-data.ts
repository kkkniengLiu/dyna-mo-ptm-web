import { parse } from "csv-parse/sync";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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
  site_plddt_wt: number | null;
  local_pLDDT_8A: number | null;
  af3_ptm: number | null;
  af3_ranking_score: number | null;
  af3_fraction_disordered: number | null;
  af3_has_clash: number | null;
  af3_pae_mean: number | null;
  af3_pae_at_site: number | null;
  af3_pae_site_local_8A: number | null;
  af3_source: string;
  input_component: string;
  md_residue: string;
  biological_modification: string;
  rmma_source: string;
  production_route: string;
  descriptor_global_source: string;
  descriptor_site_source: string;
  has_structure: boolean;
  structure_path: string;
  zenodo_url: string | null;
  raw: CsvRecord;
};

type PublicSystemSummary = Omit<PublicSystem, "raw">;

type StaticPayload = {
  generated_at: string;
  source_csv: string;
  release: {
    version: "v0.3.0";
    schema_version: "v0.3.0";
    site_url: string;
    master_sha256: string;
    rows: number;
    columns: number;
    kr_systems: number;
    methyl_r_systems: number;
    structure_archive_sha256: string;
    structure_coverage_percent: number;
    local_kr_structures: number;
    local_phosphorylation_structures: number;
    api_record_fields: 48;
    public_deployment_status: "deployed";
    deposition_status: "available" | "pending";
  };
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
const targetPublicDir = path.join(webRoot, "public");
const publicDir = fs.mkdtempSync(path.join(webRoot, ".public-staging-"));
const dataDir = path.join(publicDir, "data");
const apiDir = path.join(publicDir, "api");
const apiSystemDir = path.join(apiDir, "system");
const figuresDir = path.join(publicDir, "figures");
const structuresDir = path.join(publicDir, "structures");
const staticDataPath = path.join(dataDir, "master_table.json");
const csvPath = path.join(root, "submission", "master_table_all_v2.csv");
const descriptorCompatibilityPath = path.join(
  root,
  "submission",
  "p1_reuse_metadata_v0_3",
  "descriptor_compatibility_v0.3.0.csv",
);
const af3AssociationsPath = path.join(
  root,
  "submission",
  "p1_reuse_metadata_v0_3",
  "af3_descriptor_associations_v0.3.0.csv",
);
const fig1Path = path.join(
  root,
  "submission",
  "figures",
  "fig1_dataset_overview_v3.png",
);
const pdbTarPath = path.join(
  root,
  "dist",
  "dyna-mo-ptm-v0.3.0-starting-structures.tar.gz",
);
const structureManifestPath = path.join(
  root,
  "submission",
  "starting_structure_manifest_v0.3.0.csv",
);
const structureMissingPath = path.join(
  root,
  "submission",
  "starting_structure_missing_v0.3.0.csv",
);
const structureQuarantinePath = path.join(
  root,
  "submission",
  "starting_structure_quarantine_v0.3.0.csv",
);
const tmpPdbDir = fs.mkdtempSync(path.join(webRoot, ".pdb-extract-"));
const faviconPath = path.join(webRoot, "static", "favicon.svg");

const RELEASE_VERSION = "v0.3.0" as const;
const EXPECTED_MASTER_SHA256 =
  "7509810e6febefad3b3d387cd5ee4bdd96b410d5ef683140fdbd99b29e68c965";
const EXPECTED_STRUCTURE_ARCHIVE_SHA256 =
  "4b378d529eb7ab7d56461836079b152a26756d31deb12038a93dcafb27b43b0e";
const EXPECTED_STRUCTURE_MANIFEST_SHA256 =
  "0fd6f8333d1e3fb01e41c752f5496fce63b4d67d18f45d32ae56059fb56c01a0";
const EXPECTED_STRUCTURE_MISSING_SHA256 =
  "aceae3b5b6a55ba53fdc36f4312d6944c4ab54b2e19afb59cdfafb8c7f50230e";
const EXPECTED_STRUCTURE_QUARANTINE_SHA256 =
  "cfc5b37e27ab9c941929f72098d4397ea0b4b7228841eaf1b8584b12f76617ee";
const EXPECTED_ROWS = 1079;
const EXPECTED_COLUMNS = 118;
const EXPECTED_KR_SYSTEMS = 738;
const EXPECTED_METHYL_R_SYSTEMS = 192;
const EXPECTED_STRUCTURES = 918;
const EXPECTED_MISSING_STRUCTURES = 161;
const EXPECTED_QUARANTINE = 16;
const EXPECTED_API_RECORD_FIELDS = 48;
const EXPECTED_TOTAL_NS = 32370;
const DEFAULT_SITE_URL = "https://kkkniengliu.github.io/dyna-mo-ptm-web";
const DEFAULT_FULL_ZENODO_DOI = "10.5281/zenodo.22049767";
const PROVENANCE_FIELDS = [
  "input_component",
  "md_residue",
  "biological_modification",
  "rmma_source",
  "production_route",
  "descriptor_global_source",
  "descriptor_site_source",
] as const;

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
const checkOnly = process.argv.includes("--check-only");
let siteUrl = "";
let zenodoUrl: string | null = null;

try {
  siteUrl = normalizeSiteUrl(process.env.SITE_URL);
  zenodoUrl = normalizeZenodoUrl(
    process.env.ZENODO_DOI ?? DEFAULT_FULL_ZENODO_DOI,
  );
  for (const dir of [dataDir, apiSystemDir, figuresDir, structuresDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(faviconPath, path.join(publicDir, "favicon.svg"));

  const csvText = readRequiredText(csvPath);
  const records = parseCsv(csvText, csvPath);
  const descriptorCompatibility = readCsvFile(descriptorCompatibilityPath);
  const af3Associations = readCsvFile(af3AssociationsPath);
  const structureManifest = readCsvFile(structureManifestPath);
  const structureMissing = readCsvFile(structureMissingPath);
  const structureQuarantine = readCsvFile(structureQuarantinePath);

  validateReleaseInputs(
    records,
    structureManifest,
    structureMissing,
    structureQuarantine,
  );
  validateReuseMetadata(records, descriptorCompatibility, af3Associations);
  copyFigureAssets();
  extractPdbAssets(structureManifest);

  const systems = records.map(normalizeSystem);
  const counts = PTM_ORDER.map((ptm) => ({
    ptm_type: ptm,
    label: PTM_LABELS[ptm],
    color: PTM_COLORS[ptm],
    count: systems.filter((system) => system.ptm_type === ptm).length,
  }));
  const lengths = systems
    .map((system) => system.n_residues)
    .filter((value): value is number => value !== null && value > 0);
  const totalSimulationNs = systems.reduce(
    (sum, system) => sum + (system.traj_ns_total ?? 0),
    0,
  );
  const localKrStructures = systems.filter(
    (system) => system.has_structure && system.ptm_family === "K/R-PTM",
  ).length;
  const localPhosphorylationStructures = systems.filter(
    (system) => system.has_structure && system.ptm_family === "phosphorylation",
  ).length;

  const payload: StaticPayload = {
    generated_at: new Date().toISOString(),
    source_csv: "submission/master_table_all_v2.csv",
    release: {
      version: RELEASE_VERSION,
      schema_version: RELEASE_VERSION,
      site_url: siteUrl,
      master_sha256: EXPECTED_MASTER_SHA256,
      rows: systems.length,
      columns: Object.keys(records[0]).length,
      kr_systems: EXPECTED_KR_SYSTEMS,
      methyl_r_systems: EXPECTED_METHYL_R_SYSTEMS,
      structure_archive_sha256: EXPECTED_STRUCTURE_ARCHIVE_SHA256,
      structure_coverage_percent: roundTo(
        (EXPECTED_STRUCTURES / EXPECTED_ROWS) * 100,
        3,
      ),
      local_kr_structures: localKrStructures,
      local_phosphorylation_structures: localPhosphorylationStructures,
      api_record_fields: EXPECTED_API_RECORD_FIELDS,
      public_deployment_status: "deployed",
      deposition_status: zenodoUrl ? "available" : "pending",
    },
    stats: {
      systems: systems.length,
      ptm_types: counts.length,
      total_simulation_us: roundTo(totalSimulationNs / 1000, 2),
      local_structures: systems.filter((system) => system.has_structure).length,
      median_length: median(lengths),
      counts,
    },
    systems,
  };

  fs.writeFileSync(staticDataPath, JSON.stringify(payload), "utf8");
  fs.writeFileSync(
    path.join(dataDir, "release_v0.3.0.json"),
    JSON.stringify(payload.release, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dataDir, "master_table_all_v2.csv"),
    sanitizeCsvText(csvText),
    "utf8",
  );
  fs.copyFileSync(
    descriptorCompatibilityPath,
    path.join(dataDir, "descriptor_compatibility_v0.3.0.csv"),
  );
  fs.copyFileSync(
    af3AssociationsPath,
    path.join(dataDir, "af3_descriptor_associations_v0.3.0.csv"),
  );
  writeApiFiles(payload, descriptorCompatibility);
  writeSeoFiles(systems);
  verifyStagedPublic(payload);

  if (checkOnly) {
    console.log(
      "Release contract PASS: 1079 systems, 118 columns, 918 structures",
    );
  } else {
    publishPublicDirectory();
    console.log(
      "Prepared static data: " +
        systems.length +
        " systems, " +
        payload.stats.local_structures +
        " local PDBs, schema " +
        payload.release.schema_version,
    );
  }
} finally {
  removeIfExists(publicDir);
  removeIfExists(tmpPdbDir);
}

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
  const ccd = first(row.site_resname, row.site_res);
  const structurePath =
    siteUrl + "/structures/" + encodeURIComponent(id) + ".pdb";
  const hasStructure = fs.existsSync(path.join(structuresDir, id + ".pdb"));

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
    status: first(row.status, row.final_flag, "not available"),
    final_flag: first(row.final_flag, "not available"),
    site_status: first(row.site_status, "not available"),
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
    site_plddt_wt: numberOrNull(row.site_plddt_wt),
    local_pLDDT_8A: numberOrNull(first(row.local_pLDDT_8A, row.local_plddt_8A)),
    af3_ptm: numberOrNull(row.af3_ptm),
    af3_ranking_score: numberOrNull(row.af3_ranking_score),
    af3_fraction_disordered: numberOrNull(row.af3_fraction_disordered),
    af3_has_clash: numberOrNull(row.af3_has_clash),
    af3_pae_mean: numberOrNull(row.af3_pae_mean),
    af3_pae_at_site: numberOrNull(row.af3_pae_at_site),
    af3_pae_site_local_8A: numberOrNull(row.af3_pae_site_local_8A),
    af3_source: first(row.af3_source, "not available"),
    input_component: row.input_component,
    md_residue: row.md_residue,
    biological_modification: row.biological_modification,
    rmma_source: row.rmma_source,
    production_route: row.production_route,
    descriptor_global_source: row.descriptor_global_source,
    descriptor_site_source: row.descriptor_site_source,
    has_structure: hasStructure,
    structure_path: structurePath,
    zenodo_url: zenodoUrl,
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
  if (!fs.existsSync(fig1Path)) {
    fail("Missing Figure 1 source: " + fig1Path);
  }
  fs.copyFileSync(
    fig1Path,
    path.join(figuresDir, "fig1_dataset_overview_v3.png"),
  );
}

function extractPdbAssets(structureManifest: CsvRecord[]) {
  const members = execFileSync("tar", ["-tzf", pdbTarPath], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  for (const member of members) {
    if (
      path.isAbsolute(member) ||
      member.split(/[\\/]+/).some((part) => part === "..")
    ) {
      fail("Unsafe archive member: " + member);
    }
  }
  execFileSync("tar", ["-xzf", pdbTarPath, "-C", tmpPdbDir], {
    stdio: "ignore",
  });

  const pdbById = new Map<string, string>();
  for (const pdb of walk(tmpPdbDir).filter((file) => file.endsWith(".pdb"))) {
    const id = path.basename(pdb, ".pdb");
    if (pdbById.has(id)) {
      fail("Duplicate PDB basename in structure archive: " + id);
    }
    pdbById.set(id, pdb);
  }
  assertEqual(pdbById.size, EXPECTED_STRUCTURES, "archive PDB count");

  for (const row of structureManifest) {
    const id = first(row.system, row.protein_name);
    const source = pdbById.get(id);
    if (!source) {
      fail("Structure archive is missing manifest system: " + id);
    }
    assertEqual(
      sha256File(source),
      row.sha256.toLowerCase(),
      "PDB SHA256 for " + id,
    );
    const target = path.join(structuresDir, id + ".pdb");
    fs.copyFileSync(source, target);
  }

  const publishedIds = new Set(
    walk(structuresDir)
      .filter((file) => file.endsWith(".pdb"))
      .map((file) => path.basename(file, ".pdb")),
  );
  const manifestIds = new Set(
    structureManifest.map((row) => first(row.system, row.protein_name)),
  );
  assertSetEqual(publishedIds, manifestIds, "published PDB IDs");
  for (const id of publishedIds) {
    if (!pdbById.has(id)) {
      fail("Published PDB was not present in the locked archive: " + id);
    }
  }
}

function writeApiFiles(
  payload: StaticPayload,
  descriptorCompatibility: CsvRecord[],
) {
  fs.mkdirSync(apiSystemDir, { recursive: true });
  const systemsIndex = {
    generated_at: payload.generated_at,
    source_csv: payload.source_csv,
    count: payload.systems.length,
    release: payload.release,
    stats: payload.stats,
    systems: payload.systems.map(toSystemSummary),
  };
  fs.writeFileSync(
    path.join(apiDir, "systems.json"),
    JSON.stringify(systemsIndex, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(apiDir, "descriptor-compatibility.json"),
    JSON.stringify(
      {
        schema_version: RELEASE_VERSION,
        source_csv: "data/descriptor_compatibility_v0.3.0.csv",
        count: descriptorCompatibility.length,
        fields: descriptorCompatibility,
      },
      null,
      2,
    ),
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

function validateReuseMetadata(
  records: CsvRecord[],
  descriptorCompatibility: CsvRecord[],
  af3Associations: CsvRecord[],
) {
  assertEqual(
    descriptorCompatibility.length,
    EXPECTED_COLUMNS,
    "descriptor compatibility rows",
  );
  const masterFields = Object.keys(records[0] ?? {});
  const companionFields = descriptorCompatibility.map((row) => row.field_name);
  if (JSON.stringify(masterFields) !== JSON.stringify(companionFields)) {
    fail(
      "Descriptor compatibility fields must match the master header in order",
    );
  }
  const preferred = descriptorCompatibility
    .filter((row) => row.comparability_status === "preferred_common")
    .map((row) => row.field_name)
    .sort();
  const expectedPreferred = [
    "rg_mean_3rep_A",
    "rmsd_equil_mean_3rep_A",
    "rmsd_mean_3rep_A",
  ].sort();
  if (JSON.stringify(preferred) !== JSON.stringify(expectedPreferred)) {
    fail("Preferred-common descriptor contract drifted");
  }
  assertEqual(af3Associations.length, 8, "AF3 association rows");
  if (af3Associations.some((row) => row.n !== "738")) {
    fail("Every AF3 association must use the complete 738-row K/R subset");
  }
}

function toSystemSummary(system: PublicSystem): PublicSystemSummary {
  return Object.fromEntries(
    Object.entries(system).filter(([key]) => key !== "raw"),
  ) as PublicSystemSummary;
}

function writeSeoFiles(systems: PublicSystem[]) {
  const today = new Date().toISOString().slice(0, 10);
  const routes = [
    { loc: "/", priority: "1.0" },
    { loc: "/browse", priority: "0.9" },
    { loc: "/statistics", priority: "0.8" },
    { loc: "/descriptors", priority: "0.8" },
    { loc: "/docs", priority: "0.7" },
    { loc: "/downloads", priority: "0.8" },
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

function validateReleaseInputs(
  records: CsvRecord[],
  structureManifest: CsvRecord[],
  structureMissing: CsvRecord[],
  structureQuarantine: CsvRecord[],
) {
  assertEqual(sha256File(csvPath), EXPECTED_MASTER_SHA256, "master SHA256");
  assertEqual(
    sha256File(pdbTarPath),
    EXPECTED_STRUCTURE_ARCHIVE_SHA256,
    "structure archive SHA256",
  );
  assertEqual(
    sha256File(structureManifestPath),
    EXPECTED_STRUCTURE_MANIFEST_SHA256,
    "structure manifest SHA256",
  );
  assertEqual(
    sha256File(structureMissingPath),
    EXPECTED_STRUCTURE_MISSING_SHA256,
    "structure missing ledger SHA256",
  );
  assertEqual(
    sha256File(structureQuarantinePath),
    EXPECTED_STRUCTURE_QUARANTINE_SHA256,
    "structure quarantine ledger SHA256",
  );
  assertEqual(records.length, EXPECTED_ROWS, "master row count");
  assertEqual(
    Object.keys(records[0] ?? {}).length,
    EXPECTED_COLUMNS,
    "columns",
  );
  assertEqual(structureManifest.length, EXPECTED_STRUCTURES, "manifest rows");
  assertEqual(
    structureMissing.length,
    EXPECTED_MISSING_STRUCTURES,
    "missing-structure rows",
  );
  assertEqual(
    structureQuarantine.length,
    EXPECTED_QUARANTINE,
    "quarantine rows",
  );

  for (const field of [
    "system",
    "ptm_type",
    "schema_version",
    ...PROVENANCE_FIELDS,
  ]) {
    if (!(field in (records[0] ?? {}))) {
      fail("Master is missing required column: " + field);
    }
  }
  const ids = records.map((row) => first(row.system, row.protein_name));
  assertEqual(new Set(ids).size, EXPECTED_ROWS, "unique system IDs");
  if (records.some((row) => row.schema_version !== RELEASE_VERSION)) {
    fail("Every release row must use schema_version v0.3.0");
  }
  if (
    records.some(
      (row) =>
        normalizePtm(row.ptm_type) === "methyl_R" && row.status !== "PASS",
    )
  ) {
    fail("Every released methyl_R row must satisfy status == PASS");
  }

  const expectedCounts: Record<string, number> = {
    acet_K: 284,
    methyl_K: 262,
    methyl_R: EXPECTED_METHYL_R_SYSTEMS,
    phos_S: 135,
    phos_T: 92,
    phos_Y: 114,
  };
  for (const [ptm, expected] of Object.entries(expectedCounts)) {
    assertEqual(
      records.filter((row) => normalizePtm(row.ptm_type) === ptm).length,
      expected,
      ptm + " row count",
    );
  }
  assertEqual(
    records.filter((row) =>
      ["acet_K", "methyl_K", "methyl_R"].includes(normalizePtm(row.ptm_type)),
    ).length,
    EXPECTED_KR_SYSTEMS,
    "K/R row count",
  );
  assertEqual(
    roundTo(
      records.reduce(
        (sum, row) => sum + (numberOrNull(row.traj_ns_total) ?? 0),
        0,
      ),
      6,
    ),
    EXPECTED_TOTAL_NS,
    "total trajectory ns",
  );

  for (const row of records) {
    const isMethylR = normalizePtm(row.ptm_type) === "methyl_R";
    for (const field of PROVENANCE_FIELDS) {
      const hasValue = Boolean(row[field]?.trim());
      if (isMethylR !== hasValue) {
        fail(field + " must be populated only for methyl_R rows");
      }
    }
    if (
      isMethylR &&
      (row.input_component !== "AGM" || row.md_residue !== "RM1")
    ) {
      fail("methyl_R provenance must preserve AGM input and RM1 MD residue");
    }
  }

  const releaseIds = new Set(ids);
  const manifestIds = new Set(structureManifest.map((row) => row.system));
  const missingIds = new Set(structureMissing.map((row) => row.system));
  const quarantineIds = new Set(structureQuarantine.map((row) => row.system));
  assertEqual(manifestIds.size, EXPECTED_STRUCTURES, "unique manifest IDs");
  assertEqual(
    missingIds.size,
    EXPECTED_MISSING_STRUCTURES,
    "unique missing IDs",
  );
  assertEqual(quarantineIds.size, EXPECTED_QUARANTINE, "unique quarantine IDs");
  assertSetEqual(
    new Set([...manifestIds, ...missingIds]),
    releaseIds,
    "manifest plus missing IDs",
  );
  if (
    [...manifestIds].some((id) => quarantineIds.has(id)) ||
    [...missingIds].some((id) => quarantineIds.has(id)) ||
    [...releaseIds].some((id) => quarantineIds.has(id))
  ) {
    fail("Quarantined systems must be disjoint from the public release");
  }
}

function verifyStagedPublic(payload: StaticPayload) {
  assertEqual(payload.stats.systems, EXPECTED_ROWS, "payload systems");
  assertEqual(
    payload.stats.total_simulation_us,
    EXPECTED_TOTAL_NS / 1000,
    "payload total simulation us",
  );
  assertEqual(
    payload.stats.local_structures,
    EXPECTED_STRUCTURES,
    "payload local structures",
  );
  const apiSummaries = payload.systems.map(toSystemSummary);
  for (const summary of apiSummaries) {
    assertEqual(
      Object.keys(summary).length,
      EXPECTED_API_RECORD_FIELDS,
      "API summary field count for " + summary.id,
    );
  }
  assertEqual(
    fs.readdirSync(apiSystemDir).filter((name) => name.endsWith(".json"))
      .length,
    EXPECTED_ROWS,
    "API detail files",
  );
  const compatibilityApi = JSON.parse(
    fs.readFileSync(path.join(apiDir, "descriptor-compatibility.json"), "utf8"),
  );
  assertEqual(
    compatibilityApi.count,
    EXPECTED_COLUMNS,
    "compatibility API rows",
  );
  assertEqual(
    readCsvFile(path.join(dataDir, "af3_descriptor_associations_v0.3.0.csv"))
      .length,
    8,
    "public AF3 association rows",
  );
  assertEqual(
    fs.readdirSync(structuresDir).filter((name) => name.endsWith(".pdb"))
      .length,
    EXPECTED_STRUCTURES,
    "public PDB files",
  );
  const publicText = walk(publicDir)
    .filter((file) => !file.endsWith(".pdb") && !file.endsWith(".png"))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const forbidden of [
    "__ZENODO_DOI__",
    "__GITHUB_URL__",
    "__PAPER_DOI__",
    "example.org",
  ]) {
    if (publicText.includes(forbidden)) {
      fail("Forbidden release placeholder found: " + forbidden);
    }
  }
  const sitemap = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
  assertEqual(
    (sitemap.match(/<url>/g) ?? []).length,
    EXPECTED_ROWS + 7,
    "sitemap URL count",
  );
}

function publishPublicDirectory() {
  const backup = path.join(
    webRoot,
    ".public-backup-" + process.pid + "-" + Date.now(),
  );
  let movedOld = false;
  try {
    if (fs.existsSync(targetPublicDir)) {
      fs.renameSync(targetPublicDir, backup);
      movedOld = true;
    }
    fs.renameSync(publicDir, targetPublicDir);
    if (movedOld) {
      fs.rmSync(backup, { recursive: true, force: true });
    }
  } catch (error) {
    if (!fs.existsSync(targetPublicDir) && movedOld && fs.existsSync(backup)) {
      fs.renameSync(backup, targetPublicDir);
    }
    throw error;
  } finally {
    removeIfExists(backup);
  }
}

function readRequiredText(file: string) {
  if (!fs.existsSync(file)) {
    fail("Missing required release artifact: " + file);
  }
  return fs.readFileSync(file, "utf8");
}

function readCsvFile(file: string) {
  return parseCsv(readRequiredText(file), file);
}

function parseCsv(text: string, file: string) {
  const rows = parse(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRecord[];
  if (rows.length === 0) {
    fail("CSV has no records: " + file);
  }
  return rows;
}

function sha256File(file: string) {
  if (!fs.existsSync(file)) {
    fail("Missing required release artifact: " + file);
  }
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function normalizeSiteUrl(value: string | undefined) {
  const candidate = (value ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return fail("SITE_URL must be an absolute HTTPS URL");
  }
  if (parsed.protocol !== "https:" || parsed.hostname === "example.org") {
    return fail("SITE_URL must be a real HTTPS deployment URL");
  }
  return candidate;
}

function normalizeZenodoUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }
  const doi = candidate.replace(/^https?:\/\/doi\.org\//, "");
  if (!/^10\.5281\/zenodo\.\d+$/.test(doi)) {
    return fail("ZENODO_DOI must be a deposited Zenodo DOI");
  }
  return "https://doi.org/" + doi;
}

function assertSetEqual(
  actual: Set<string>,
  expected: Set<string>,
  label: string,
) {
  if (
    actual.size !== expected.size ||
    [...actual].some((value) => !expected.has(value))
  ) {
    fail(label + " set mismatch");
  }
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    fail(label + ": expected " + expected + ", received " + actual);
  }
}

function roundTo(value: number, digits: number) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function fail(message: string): never {
  throw new Error("Release contract failed: " + message);
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

function removeIfExists(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
