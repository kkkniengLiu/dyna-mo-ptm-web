import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type StaticDataset = {
  systems: Array<{
    id: string;
    uniprot: string;
    ptm_type: string;
    n_residues: number | null;
    site_ss_dominant: string;
    has_structure: boolean;
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

test("home to browse to system detail flow", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Dyna-MO PTM",
      exact: true,
    }),
  ).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "screenshots/home.png", fullPage: true });

  await page.goto("/browse", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Browse systems" }),
  ).toBeVisible();
  await expect(page.getByTestId("system-row-0")).toBeVisible();
  await expect(page.getByTestId("system-row-0")).toContainText("PASS");
  await expect(page.getByTestId("system-row-0")).toContainText("/100");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshots/browse.png", fullPage: true });

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
    path: "screenshots/system-detail.png",
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
    path: "screenshots/system-local-pdb.png",
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
});
