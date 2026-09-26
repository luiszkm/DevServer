import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// C25
test("unlock persists", async ({ page }) => {
  await newDev(page, "masculino", "FRONTEND");
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "SKILLS" }).click();
  await expect(page.getByText("PONTOS: 1")).toBeVisible();

  const hotfix = page.locator('[data-skill="fe1"]');
  await hotfix.click();
  const check = async () => {
    await expect(hotfix).toHaveAttribute("data-state", "ATIVA");
    await expect(page.getByText("PONTOS: 0")).toBeVisible();
    const hud = page.getByRole("contentinfo", { name: "HUD" });
    await expect(hud.getByLabel("habilidades ativas").getByRole("img", { name: "HOTFIX DE CSS" })).toHaveAttribute("src", "/art/icon/skill-fe1.png");
  };
  await check();
  await page.reload();
  await check();
});
