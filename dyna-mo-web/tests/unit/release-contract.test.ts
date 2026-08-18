import { parse } from "csv-parse/sync";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Row = Record<string, string>;

const root = path.resolve(process.cwd(), "..");
const publicRoot = path.resolve(process.cwd(), "public");
const masterPath = path.join(root, "submission", "master_table_all_v2.csv");
const manifestPath = path.join(
  root,
  "submission",
  "starting_structure_manifest_v0.3.0.csv",
);
const quarantinePath = path.join(
  root,
  "submission",
  "starting_structure_quarantine_v0.3.0.csv",
);
const expectedMasterSha =
  "7509810e6febefad3b3d387cd5ee4bdd96b410d5ef683140fdbd99b29e68c965";
const provenanceFields = [
  "input_component",
  "md_residue",
  "biological_modification",
  "rmma_source",
  "production_route",
  "descriptor_global_source",
  "descriptor_site_source",
];

function readCsv(file: string) {
  return parse(fs.readFileSync(file, "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Row[];
}

function sha256(file: string) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

describe("v0.3.0 static release contract", () => {
  it("locks the canonical descriptor release", () => {
    const canonical = readCsv(masterPath);
    const publicCsv = readCsv(
      path.join(publicRoot, "data", "master_table_all_v2.csv"),
    );
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(publicRoot, "data", "master_table.json"),
        "utf8",
      ),
    );

    expect(sha256(masterPath)).toBe(expectedMasterSha);
    expect(canonical).toHaveLength(1079);
    expect(Object.keys(canonical[0])).toHaveLength(118);
    expect(publicCsv).toHaveLength(1079);
    expect(Object.keys(publicCsv[0])).toHaveLength(118);
    expect(new Set(canonical.map((row) => row.schema_version))).toEqual(
      new Set(["v0.3.0"]),
    );
    expect(payload.release).toMatchObject({
      version: "v0.3.0",
      schema_version: "v0.3.0",
      site_url: "https://kkkniengliu.github.io/dyna-mo-ptm-web",
      master_sha256: expectedMasterSha,
      rows: 1079,
      columns: 118,
      kr_systems: 738,
      methyl_r_systems: 192,
      api_record_fields: 48,
      public_deployment_status: "pending",
      deposition_status: "pending",
    });
    expect(payload.stats).toMatchObject({
      systems: 1079,
      total_simulation_us: 32.37,
      local_structures: 918,
    });
  });

  it("preserves AGM input and RM1 MD provenance only for methyl-R", () => {
    const payload = JSON.parse(
      fs.readFileSync(
        path.join(publicRoot, "data", "master_table.json"),
        "utf8",
      ),
    );
    const methylR = payload.systems.filter(
      (system: Record<string, unknown>) => system.ptm_type === "methyl_R",
    );
    const nonMethylR = payload.systems.filter(
      (system: Record<string, unknown>) => system.ptm_type !== "methyl_R",
    );

    expect(methylR).toHaveLength(192);
    for (const system of methylR) {
      expect(system.input_component).toBe("AGM");
      expect(system.md_residue).toBe("RM1");
      for (const field of provenanceFields) {
        expect(system[field]).toBeTruthy();
      }
    }
    for (const system of nonMethylR) {
      for (const field of provenanceFields) {
        expect(system[field]).toBe("");
      }
    }
  });

  it("publishes exactly the primary structure set and excludes quarantine", () => {
    const manifestIds = new Set(readCsv(manifestPath).map((row) => row.system));
    const quarantineIds = new Set(
      readCsv(quarantinePath).map((row) => row.system),
    );
    const publicIds = new Set(
      fs
        .readdirSync(path.join(publicRoot, "structures"))
        .filter((name) => name.endsWith(".pdb"))
        .map((name) => path.basename(name, ".pdb")),
    );

    expect(publicIds.size).toBe(918);
    expect(publicIds).toEqual(manifestIds);
    for (const id of quarantineIds) {
      expect(publicIds.has(id)).toBe(false);
    }
  });

  it("keeps API, sitemap and external-link state release-safe", () => {
    const apiIndex = JSON.parse(
      fs.readFileSync(path.join(publicRoot, "api", "systems.json"), "utf8"),
    );
    const detailFiles = fs
      .readdirSync(path.join(publicRoot, "api", "system"))
      .filter((name) => name.endsWith(".json"));
    const sitemap = fs.readFileSync(
      path.join(publicRoot, "sitemap.xml"),
      "utf8",
    );
    const publicText = [
      fs.readFileSync(
        path.join(publicRoot, "data", "master_table.json"),
        "utf8",
      ),
      fs.readFileSync(path.join(publicRoot, "api", "systems.json"), "utf8"),
      sitemap,
      fs.readFileSync(path.join(publicRoot, "robots.txt"), "utf8"),
    ].join("\n");

    expect(apiIndex.count).toBe(1079);
    expect(apiIndex.release.api_record_fields).toBe(48);
    expect(apiIndex.release.public_deployment_status).toBe("pending");
    expect(
      apiIndex.systems.every(
        (system: Row) => Object.keys(system).length === 48,
      ),
    ).toBe(true);
    expect(detailFiles).toHaveLength(1079);
    expect(sitemap.match(/<url>/g) ?? []).toHaveLength(1082);
    expect(sitemap).toContain("https://kkkniengliu.github.io/dyna-mo-ptm-web/");
    expect(publicText).not.toMatch(
      /__ZENODO_DOI__|__GITHUB_URL__|__PAPER_DOI__|example\.org/,
    );
    expect(apiIndex.release.deposition_status).toBe("pending");
    expect(
      apiIndex.systems.every((system: Row) => system.zenodo_url === null),
    ).toBe(true);
  });

  it("does not publish an unconfirmed data licence", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "App.tsx"),
      "utf8",
    );
    expect(appSource).toContain(
      "Data licence pending author confirmation; code MIT.",
    );
    expect(appSource).not.toContain("creativecommons.org/licenses/by/4.0");
    expect(appSource).not.toContain("Data CC-BY 4.0");
    expect(appSource).toContain(
      "The observed-file completion gate now covers all 1,079",
    );
  });

  it("keeps all seven manuscript authors in downloadable citations", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "App.tsx"),
      "utf8",
    );
    for (const creator of [
      "Liu, Kaining",
      "Qian, Qiuting",
      "Peng, Jiahua",
      "Ma, Dongge",
      "Yao, Yifei",
      "Zhao, Jingjing",
      "Chi, Ying",
    ]) {
      expect(appSource).toContain(creator);
    }
  });
});
