import { expect, test } from "@playwright/test";
import { newDev, openScene } from "./helpers";

// C45
test("buy and wear", async ({ page }) => {
  await newDev(page);
  const hud = page.getByRole("banner", { name: "HUD" });
  const coins = hud.locator(".hud-row", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("9999");

  await hud.getByRole("link", { name: "LOJA" }).click();
  await expect(page.getByText("LOJA DEVSERVER")).toBeVisible();
  await page.getByRole("tab", { name: "EQUIP" }).click();
  await page.locator('[data-card="cafe"]').click();
  await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
  await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");
  await expect(coins).toHaveText("9949");

  await openScene(page, "AVATAR");
  await expect(page.getByLabel("atributos")).toBeVisible();
  await page.reload();
  const bebida = page.locator('[data-slot="bebida"]');
  await expect(bebida).toContainText("CAFÉ EXPRESSO");
  await expect(bebida.locator('img[src="/art/icon/gear-cafe.png"]')).toHaveCount(1);
  await expect(coins).toHaveText("9949");
});
