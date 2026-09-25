import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C53
test("fight to victory", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "BUG FIGHT" }).click();
  const enemy = page.getByLabel("inimigo");
  await expect(enemy).toContainText("NULL SLIME");
  await expect(enemy).toContainText("HP 60/60");

  const fix = page.locator('[data-command="fix"]');
  await expect(page.getByLabel("herói na arena").getByRole("img", { name: "herói" })).toBeVisible();
  // The first hit plays on the stage: the FIX slash strip and the damage number over the enemy.
  await fix.click();
  await expect(page.locator('.battle-fx[data-fx="slash"]')).toBeAttached();
  const art = await page.locator(".battle-fx").evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(art).toContain("/art/fx/slash.png");
  await expect(page.locator(".battle-float").first()).toContainText(/^-\d+/);
  await expect(fix).toBeEnabled();

  for (let i = 0; i < 8 && !(await page.getByText("RESOLVIDO", { exact: true }).isVisible()); i++) {
    await expect(fix).toBeEnabled();
    await fix.click();
    await expect(page.getByRole("log")).toContainText("FIX:");
    // The turn is over when FIX is usable again or the enemy is resolved.
    await page.waitForFunction(
      () => !document.querySelector('[data-command="fix"]')?.hasAttribute("disabled") || document.body.textContent?.includes("RESOLVIDO"),
    );
  }
  await expect(page.getByText("RESOLVIDO", { exact: true })).toBeVisible();
  await expect(page.getByRole("log")).toContainText("NULL SLIME resolvido");
  await expect(page.getByRole("contentinfo", { name: "HUD" })).toContainText("90/500");
});
