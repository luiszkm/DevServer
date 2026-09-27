import { expect, test } from "@playwright/test";
import { newDev, openScene } from "./helpers";

// C40
test("install and remove", async ({ page }) => {
  await newDev(page);
  const hud = page.getByRole("banner", { name: "HUD" });
  const coins = hud.locator(".hud-row", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("9999");

  await openScene(page, "OFFICE");
  await expect(page.getByText("CATÁLOGO")).toBeVisible();
  await page.locator('[data-card="planta"]').click();
  const spot = page.locator('[data-cell="piso-5"]');
  await spot.click();
  await expect(page.getByRole("status")).toHaveText("PLANTA DE CANTO INSTALADO");
  await expect(coins).toHaveText("9974");

  await page.reload();
  await expect(spot).toContainText("PLANTA DE CANTO");
  await expect(page.getByText("1 móveis instalados")).toBeVisible();
  await expect(coins).toHaveText("9974");

  await spot.click();
  await expect(page.getByRole("status")).toHaveText("GUARDADO · +12 COINS");
  await expect(coins).toHaveText("9986");
  await expect(spot).toHaveText("+");
});
