import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C24
test("start persists", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "DEPLOY" }).click();
  await page.getByRole("button", { name: "BANCO DE DADOS" }).click();
  const panel = page.getByRole("region", { name: "painel de deploy" });
  await panel.getByRole("button", { name: "INICIAR DEPLOY" }).click();

  const status = page.getByRole("button", { name: "BANCO DE DADOS" });
  await expect(status).toContainText(/1[45]:\d\d restante/);
  await expect(panel.getByRole("button", { name: "COLETAR RECOMPENSA" })).toBeDisabled();

  await page.reload();
  await expect(page.getByRole("button", { name: "BANCO DE DADOS" })).toContainText(/1[45]:\d\d restante/);
  await expect(page.getByRole("button", { name: "BACKEND" })).toContainText("ocioso");
});
