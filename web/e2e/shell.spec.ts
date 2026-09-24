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
  await expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible();

  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(42);
  await expect(page.getByRole("contentinfo", { name: "HUD" })).toContainText("LEVEL 1");
});

// game-art C22: the HUD coin is served from web/public/art by the real Next static server
test("hud art loads", async ({ page }) => {
  await newDev(page);
  const coin = page.getByRole("contentinfo", { name: "HUD" }).locator('img[src="/art/icon/hud-coin.png"]');
  await expect(coin).toHaveCount(1);
  await expect.poll(() => coin.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBe(16);
});
