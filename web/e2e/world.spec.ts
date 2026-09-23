import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C40
test("travel persists", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "MUNDO" }).click();
  await expect(page.getByText("região atual: VILA LOCALHOST")).toBeVisible();

  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 7));
  await page.getByRole("article", { name: "FLORESTA DE LOGS" }).getByRole("button", { name: "VIAJAR ATÉ AQUI" }).click();
  await expect(page.getByText("região atual: FLORESTA DE LOGS")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(7);

  await page.reload();
  await expect(page.getByText("região atual: FLORESTA DE LOGS")).toBeVisible();
});
