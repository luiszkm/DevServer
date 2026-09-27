import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// game-menu C14: number-key shortcuts in the browser
test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("C14 shortcuts", async ({ page }) => {
    await newDev(page);
    await page.keyboard.press("4");
    await expect(page).toHaveURL(/\/deploy$/);
    await expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("CLIQUE NAS PLACAS PARA NAVEGAR")).toBeVisible();
  });
});
