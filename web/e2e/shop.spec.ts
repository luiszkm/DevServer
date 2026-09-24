import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C45
test("buy and wear", async ({ page }) => {
  await newDev(page);
  const hud = page.getByRole("contentinfo", { name: "HUD" });
  const coins = hud.locator(".hud-card", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("100");

  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "LOJA" }).click();
  await expect(page.getByText("LOJA DEVSERVER")).toBeVisible();
  await page.locator('[data-card="cafe"]').click();
  await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
  await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");
  await expect(coins).toHaveText("50");

  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "AVATAR" }).click();
  await expect(page.getByLabel("atributos")).toBeVisible();
  await page.reload();
  const bebida = page.locator('[data-slot="bebida"]');
  await expect(bebida).toContainText("CAFÉ EXPRESSO");
  await expect(bebida.locator('img[src="/art/icon/gear-cafe.png"]')).toHaveCount(1);
  await expect(coins).toHaveText("50");
});
