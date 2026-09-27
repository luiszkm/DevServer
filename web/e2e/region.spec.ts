import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

test("entering floresta opens its path", async ({ page }) => {
  await newDev(page);
  await page.getByRole("banner", { name: "HUD" }).getByRole("link", { name: "MUNDO" }).click();
  await page.getByRole("button", { name: "FLORESTA DE LOGS" }).click();
  await page.getByRole("dialog", { name: "FLORESTA DE LOGS" }).getByRole("button", { name: "ENTRAR" }).click();
  await expect(page).toHaveURL(/\/mundo\/floresta$/);
  await expect(page.locator("[data-node]")).toHaveCount(5);
  await expect(page.locator('[data-node="floresta-1"]')).toBeEnabled();
  for (const id of ["floresta-2", "floresta-3", "floresta-4", "floresta-5"]) {
    await expect(page.locator(`[data-node="${id}"]`)).toBeDisabled();
  }
  await expect(page.getByText("clique em 1 para enfrentar SLIME DE LOG")).toBeVisible();
  await page.locator('[data-node="floresta-1"]').click();
  await expect(page).toHaveURL(/\/bug-fight$/);
  await expect(page.getByLabel("inimigo").getByText("SLIME DE LOG", { exact: true })).toBeVisible();
});

test.describe("phone", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("region map fits phone", async ({ page }) => {
    await newDev(page);
    await page.goto("/mundo");
    await page.getByRole("button", { name: "FLORESTA DE LOGS" }).click();
    await page.getByRole("dialog", { name: "FLORESTA DE LOGS" }).getByRole("button", { name: "ENTRAR" }).click();
    await expect(page).toHaveURL(/\/mundo\/floresta$/);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(scroll).toBe(true);
  });
});
