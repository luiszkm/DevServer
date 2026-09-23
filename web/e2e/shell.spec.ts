import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C27
test("tab click keeps document and HUD", async ({ page }) => {
  await newDev(page);
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 42));
  const nav = page.getByRole("navigation", { name: "Cenas" });

  await nav.getByRole("link", { name: "MUNDO" }).click();
  await expect(page).toHaveURL(/\/mundo$/);
  await nav.getByRole("link", { name: "DEPLOY" }).click();
  await expect(page).toHaveURL(/\/deploy$/);
  await expect(page.getByText("EM BREVE")).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(42);
  await expect(page.getByRole("contentinfo", { name: "HUD" })).toContainText("LEVEL 1");
});
