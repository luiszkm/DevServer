import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C8
test("logout returns to login", async ({ page }) => {
  await newDev(page);
  await page.getByRole("button", { name: "SAIR" }).click();
  await expect(page.getByRole("link", { name: "ENTRAR COM GITHUB" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "ENTRAR COM GITHUB" })).toBeVisible();
});
