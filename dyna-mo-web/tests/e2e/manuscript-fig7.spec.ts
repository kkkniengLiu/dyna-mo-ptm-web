import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1000 } });

test("capture Fig. 7a from the v0.3.0 browse surface", async ({ page }) => {
  await page.goto("/browse?ptm_type=acet_K&dssp=H", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: "Browse systems" }),
  ).toBeVisible();
  await expect(page.getByText("methyl-R - 192")).toBeVisible();
  await expect(page.getByText("2 active filters")).toBeVisible();
  await expect(page.getByText("120", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("1,079", { exact: true })).toBeVisible();
  await expect(page.getByTestId("system-row-0")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "../submission/figures/fig7_A_browse.png",
  });
});

test("capture Fig. 7b with AGM input and RM1 MD provenance", async ({
  page,
}) => {
  await page.goto("/system/a6ngu7_r59_methyl", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Input AF3 structure")).toBeVisible();
  await expect(page.getByLabel("NGL structure viewer")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("raw.pdb loaded")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Input component")).toBeVisible();
  await expect(page.getByText("AGM", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("MD residue")).toBeVisible();
  await expect(page.getByText("RM1", { exact: true })).toBeVisible();
  await expect(page.getByText("Schema version")).toBeVisible();
  await expect(page.getByText("v0.3.0", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Replicate 1 RMSD mean, final 20 frames"),
  ).toBeVisible();

  const viewer = page.getByLabel("NGL structure viewer");
  const viewerBox = await viewer.boundingBox();
  expect(viewerBox).not.toBeNull();
  if (!viewerBox) {
    throw new Error("NGL structure viewer has no bounding box");
  }
  await page.evaluate((viewerTop) => {
    window.scrollTo({
      top: window.scrollY + viewerTop - 78,
      behavior: "instant",
    });
  }, viewerBox.y);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "../submission/figures/fig7_B_system_detail.png",
  });
});

test("capture Fig. 7c from the v0.3.0 download and API surface", async ({
  page,
}) => {
  await page.goto("/about#api", { waitUntil: "domcontentloaded" });
  const apiHeading = page.getByRole("heading", {
    name: "Download and static API",
  });
  await expect(apiHeading).toBeVisible();
  await expect(page.getByText("1,079 x 118", { exact: true })).toBeVisible();
  await expect(page.getByText("32.37 μs", { exact: true })).toBeVisible();
  await expect(page.getByText("918", { exact: true })).toBeVisible();
  await expect(page.getByText("48 fields", { exact: true })).toBeVisible();
  await expect(page.getByText(/Public deployment verified/)).toBeVisible();
  await expect(page.getByText(/Lite v0\.3\.1 and Full v0\.3\.0/)).toBeVisible();
  await expect(
    page.getByText(/completion gate now covers all 1,079 released systems/),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    "completion-summary gate currently blocks",
  );
  await expect(
    page.getByText("Data CC BY 4.0; repository code MIT."),
  ).toBeVisible();
  await expect(
    page.getByText("/api/systems.json", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("__ZENODO_DOI__");
  await expect(page.locator("body")).not.toContainText("example.org");

  await apiHeading.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy({ top: -78, behavior: "instant" }));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "../submission/figures/fig7_C_download_api.png",
  });
});
