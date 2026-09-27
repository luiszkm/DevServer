import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C40
test("travel persists", async ({ page }) => {
  await newDev(page);
  await page.getByRole("banner", { name: "HUD" }).getByRole("link", { name: "MUNDO" }).click();
  await expect(page.getByText("região atual: VILA LOCALHOST")).toBeVisible();

  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 7));
  await page.getByRole("button", { name: "FLORESTA DE LOGS" }).click();
  const dialog = page.getByRole("dialog", { name: "FLORESTA DE LOGS" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "ENTRAR" }).click();
  await expect(page).toHaveURL(/\/mundo\/floresta$/);
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(7);

  await page.getByRole("link", { name: "VOLTAR AO MUNDO" }).click();
  await expect(page.getByText("região atual: FLORESTA DE LOGS")).toBeVisible();
  await page.reload();
  await expect(page.getByText("região atual: FLORESTA DE LOGS")).toBeVisible();
});
