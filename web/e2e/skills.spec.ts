import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C25
test("unlock persists", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "SKILLS" }).click();
  await expect(page.getByText("PONTOS: 1")).toBeVisible();

  const markup = page.locator('[data-skill="f1"]');
  await markup.click();
  const check = async () => {
    await expect(markup).toHaveAttribute("data-state", "ATIVA");
    await expect(page.getByText("PONTOS: 0")).toBeVisible();
    const hud = page.getByRole("contentinfo", { name: "HUD" });
    await expect(hud).toContainText("HP 110/110");
    await expect(hud.getByLabel("habilidades ativas")).toHaveText("</>");
  };
  await check();
  await page.reload();
  await check();
});
