import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C27
test("tab and HUD link clicks keep document and HUD", async ({ page }) => {
  await newDev(page);
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 42));
  const hud = page.getByRole("banner", { name: "HUD" });

  await hud.getByRole("link", { name: "MUNDO" }).click();
  await expect(page).toHaveURL(/\/mundo$/);
  await hud.getByRole("link", { name: "DEPLOY" }).click();
  await expect(page).toHaveURL(/\/deploy$/);
  await expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible();
  await hud.getByRole("link", { name: "BUG FIGHT" }).click();
  await expect(page).toHaveURL(/\/bug-fight$/);

  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(42);
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");
});

// game-art C22: the HUD coin is served from web/public/art by the real Next static server
test("hud art loads", async ({ page }) => {
  await newDev(page);
  const coin = page.getByRole("banner", { name: "HUD" }).locator('img[src="/art/icon/hud-coin.png"]');
  await expect(coin).toHaveCount(1);
  await expect.poll(() => coin.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBe(16);
});
