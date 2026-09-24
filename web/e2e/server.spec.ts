import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C42
test("buy and remove", async ({ page }) => {
  await newDev(page);
  const hud = page.getByRole("contentinfo", { name: "HUD" });
  const coins = hud.locator(".hud-card", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("100");

  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "SERVER" }).click();
  await expect(page.getByText("LOJA DE COMPONENTES")).toBeVisible();
  await page.locator('[data-card="ram"]').click();
  await expect(page.getByRole("status")).toHaveText("> RAM 32GB instalado no slot 01 · ram +30");
  await expect(coins).toHaveText("40");
  const ram = page.locator('[data-stat="ram"]');
  await expect(ram.locator(".server-stat-value")).toHaveText("45");
  await expect(ram.locator(".server-stat-bonus")).toHaveText("SP MÁX +6");

  await page.reload();
  const first = page.locator('[data-slot="0"]');
  await expect(first).toContainText("RAM 32GB");
  await expect(coins).toHaveText("40");

  await first.click();
  await expect(page.getByRole("status")).toHaveText("> RAM 32GB removido. 60 coins devolvidos.");
  await expect(coins).toHaveText("100");
  await expect(first).toContainText("SLOT 01 VAZIO");
});

// C44
test("entries", async ({ page }) => {
  await newDev(page);
  await page.getByRole("link", { name: "SALA DE SERVIDORES" }).click();
  await expect(page).toHaveURL(/\/server$/);
  await expect(page.getByText("RACK LOCALHOST-01")).toBeVisible();

  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "TÍTULO" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "SERVER" }).click();
  await expect(page).toHaveURL(/\/server$/);
  await expect(page.getByText("LOJA DE COMPONENTES")).toBeVisible();
});
