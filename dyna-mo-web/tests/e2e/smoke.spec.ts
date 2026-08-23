import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type StaticDataset = {
  release: {
    version: string;
    schema_version: string;
    site_url: string;
    master_sha256: string;
    rows: number;
    columns: number;
    kr_systems: number;
    methyl_r_systems: number;
    deposition_status: string;
  };
  stats: {
    systems: number;
    total_simulation_us: number;
    local_structures: number;
  };
  systems: Array<{
    id: string;
    uniprot: string;
    ptm_type: string;
    n_residues: number | null;
    site_ss_dominant: string;
    has_structure: boolean;
    schema_version: string;
    input_component: string;
    md_residue: string;
    zenodo_url: string | null;
  }>;
};

const dataset = JSON.parse(
  fs.readFileSync(path.resolve("public/data/master_table.json"), "utf8"),
) as StaticDataset;
const localSystem = dataset.systems.find((system) => system.has_structure);
const knownLargeLocalSystem = dataset.systems.find(
  (system) => system.id === "o14983_k35_acetyl",
);
const filterProbe =
  dataset.systems.find(
    (system) => system.n_residues !== null && system.site_ss_dominant,
  ) ?? dataset.systems[0];

test("home to browse to system detail flow", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Dyna-MO PTM",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("10.5281/zenodo.22059934", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "Nucleic Acids Research",
  );
  await expect(page.locator("body")).not.toContainText("NAR");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });

  await page.goto("/browse", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Browse systems" }),
  ).toBeVisible();
  await expect(page.getByTestId("system-row-0")).toBeVisible();
  await expect(page.getByTestId("system-row-0")).toContainText("PASS");
  await expect(page.getByTestId("system-row-0")).toContainText("/100");
  await page.waitForTimeout(200);
  await page.screenshot({
    path: testInfo.outputPath("browse.png"),
    fullPage: true,
  });

  const minLength = Math.max(1, (filterProbe.n_residues ?? 1) - 1);
  const maxLength = (filterProbe.n_residues ?? 9999) + 1;
  await page.goto(
    `/browse?q=${encodeURIComponent(filterProbe.uniprot)}&ptm_type=${encodeURIComponent(
      filterProbe.ptm_type,
    )}&min_length=${minLength}&max_length=${maxLength}&dssp=${encodeURIComponent(
      filterProbe.site_ss_dominant,
    )}`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByPlaceholder("Search system or UniProt")).toHaveValue(
    filterProbe.uniprot,
  );
  await expect(page.getByLabel("Minimum residues")).toHaveValue(
    String(minLength),
  );
  await expect(page.getByLabel("Maximum residues")).toHaveValue(
    String(maxLength),
  );
  await expect(page.getByLabel("Dominant DSSP")).toHaveValue(
    filterProbe.site_ss_dominant,
  );
  await expect(page.getByTestId("system-row-0")).toContainText(
    filterProbe.uniprot,
  );

  await page.getByTestId("system-row-0").press("Enter");
  await page.waitForURL(/\/system\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Input AF3 structure")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download system JSON" }),
  ).toHaveAttribute("href", /\/api\/system\/.+\.json/);
  await page
    .getByRole("button", { name: "Show all descriptor fields" })
    .click();
  await expect(page.getByTestId("raw-descriptor")).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: testInfo.outputPath("system-detail.png"),
    fullPage: true,
  });

  if (!localSystem) {
    throw new Error("No local PDB system found in static dataset");
  }

  await page.goto(`/system/${encodeURIComponent(localSystem.id)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Input AF3 structure")).toBeVisible();
  await expect(page.getByText("pLDDT cartoon")).toBeVisible();
  await expect(page.getByText("raw.pdb loaded")).toBeVisible({
    timeout: 15000,
  });
  await page.waitForTimeout(300);
  const viewer = page.getByLabel("NGL structure viewer");
  await expect(viewer).toBeVisible();
  await viewer.scrollIntoViewIfNeeded();
  const viewerBox = await viewer.boundingBox();
  expect(viewerBox).not.toBeNull();
  if (!viewerBox) {
    throw new Error("NGL structure viewer has no bounding box");
  }
  const beforeDrag = await viewer.screenshot();
  await page.mouse.move(
    viewerBox.x + viewerBox.width * 0.45,
    viewerBox.y + viewerBox.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    viewerBox.x + viewerBox.width * 0.68,
    viewerBox.y + viewerBox.height * 0.42,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterDrag = await viewer.screenshot();
  expect(Buffer.compare(beforeDrag, afterDrag)).not.toBe(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: testInfo.outputPath("system-local-pdb.png"),
    fullPage: true,
  });

  if (!knownLargeLocalSystem) {
    throw new Error("Expected o14983_k35_acetyl in static dataset");
  }
  await page.goto(`/system/${encodeURIComponent(knownLargeLocalSystem.id)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("raw.pdb loaded")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByText("PDB file unavailable; showing residue placeholder"),
  ).toHaveCount(0);
  const largeViewer = page.getByLabel("NGL structure viewer");
  await largeViewer.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Secondary-structure cartoon" })
    .click();
  await expect(page.getByText("raw.pdb loaded")).toBeVisible();
  await expect(page.getByText("Loading structure viewer")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset view" }).click();
  const largeViewerBox = await largeViewer.boundingBox();
  expect(largeViewerBox).not.toBeNull();
  if (!largeViewerBox) {
    throw new Error(
      "NGL structure viewer has no bounding box after color mode switch",
    );
  }
  const beforeSecondaryDrag = await largeViewer.screenshot();
  await page.mouse.move(
    largeViewerBox.x + largeViewerBox.width * 0.42,
    largeViewerBox.y + largeViewerBox.height * 0.54,
  );
  await page.mouse.down();
  await page.mouse.move(
    largeViewerBox.x + largeViewerBox.width * 0.7,
    largeViewerBox.y + largeViewerBox.height * 0.38,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterSecondaryDrag = await largeViewer.screenshot();
  expect(Buffer.compare(beforeSecondaryDrag, afterSecondaryDrag)).not.toBe(0);
});

test("static api files are generated", async () => {
  await expect(
    fs.existsSync(path.resolve("public/api/systems.json")),
  ).toBeTruthy();
  await expect(
    fs.existsSync(
      path.resolve(
        "public/api/system",
        `${encodeURIComponent(filterProbe.id)}.json`,
      ),
    ),
  ).toBeTruthy();
  await expect(fs.existsSync(path.resolve("public/sitemap.xml"))).toBeTruthy();
  await expect(fs.existsSync(path.resolve("public/robots.txt"))).toBeTruthy();
  await expect(
    /[\u4e00-\u9fff]/.test(
      fs.readFileSync(path.resolve("public/data/master_table.json"), "utf8"),
    ),
  ).toBeFalsy();
  await expect(
    /[\u4e00-\u9fff]/.test(
      fs.readFileSync(
        path.resolve("public/data/master_table_all_v2.csv"),
        "utf8",
      ),
    ),
  ).toBeFalsy();
  await expect(dataset.release).toMatchObject({
    version: "v0.3.0",
    schema_version: "v0.3.0",
    site_url: "https://kkkniengliu.github.io/dyna-mo-ptm-web",
    master_sha256:
      "7509810e6febefad3b3d387cd5ee4bdd96b410d5ef683140fdbd99b29e68c965",
    rows: 1079,
    columns: 118,
    kr_systems: 738,
    methyl_r_systems: 192,
    api_record_fields: 48,
    public_deployment_status: "deployed",
    deposition_status: "available",
  });
  await expect(dataset.stats).toMatchObject({
    systems: 1079,
    total_simulation_us: 32.37,
    local_structures: 918,
  });
  await expect(
    fs
      .readdirSync(path.resolve("public/api/system"))
      .filter((name) => name.endsWith(".json")),
  ).toHaveLength(1079);
  const apiIndex = JSON.parse(
    fs.readFileSync(path.resolve("public/api/systems.json"), "utf8"),
  );
  await expect(apiIndex.count).toBe(1079);
  await expect(
    apiIndex.systems.every(
      (system: Record<string, unknown>) => Object.keys(system).length === 48,
    ),
  ).toBe(true);
  await expect(
    fs
      .readdirSync(path.resolve("public/structures"))
      .filter((name) => name.endsWith(".pdb")),
  ).toHaveLength(918);
  const canonicalMaster = fs.readFileSync(
    path.resolve("../submission/master_table_all_v2.csv"),
  );
  await expect(
    crypto.createHash("sha256").update(canonicalMaster).digest("hex"),
  ).toBe(dataset.release.master_sha256);
  const publicContractText = [
    fs.readFileSync(path.resolve("public/data/master_table.json"), "utf8"),
    fs.readFileSync(path.resolve("public/api/systems.json"), "utf8"),
    fs.readFileSync(path.resolve("public/sitemap.xml"), "utf8"),
    fs.readFileSync(path.resolve("public/robots.txt"), "utf8"),
  ].join("\n");
  await expect(publicContractText).not.toMatch(
    /__ZENODO_DOI__|__GITHUB_URL__|__PAPER_DOI__|example\.org/,
  );
  await expect(
    dataset.systems.filter((system) => system.input_component === "AGM"),
  ).toHaveLength(192);
  await expect(
    dataset.systems.filter((system) => system.md_residue === "RM1"),
  ).toHaveLength(192);
  await expect(
    dataset.systems.every(
      (system) =>
        system.zenodo_url === "https://doi.org/10.5281/zenodo.22049767",
    ),
  ).toBe(true);
});

test("academic navigation and mobile menu expose the release pages", async ({
  page,
}) => {
  for (const [route, heading] of [
    ["/statistics", "Dataset overview"],
    ["/descriptors", "Descriptor dictionary"],
    ["/docs", "Use Dyna-MO PTM"],
    ["/downloads", "Download and cite"],
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "Descriptors" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Downloads" })).toBeVisible();
});
