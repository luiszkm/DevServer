import { expect, test } from "@playwright/test";
import { newDev, openScene } from "./helpers";

// C25, skill-loadout AC 6: unlocking equips the skill in the first slot, and it survives a reload.
test("unlock persists", async ({ page }) => {
  await newDev(page, "masculino", "FRONTEND");
  await openScene(page, "SKILLS");
  await expect(page.getByText("PONTOS: 1")).toBeVisible();

  const hotfix = page.locator('[data-skill="fe1"]');
  await hotfix.locator('[data-action="unlock"]').click();
  const check = async () => {
    await expect(hotfix).toHaveAttribute("data-state", "Nv 1");
    await expect(hotfix).toHaveAttribute("data-equipped", "true");
    await expect(page.locator('[data-slot="0"]')).toContainText("HOTFIX DE CSS");
    await expect(page.getByText("PONTOS: 0")).toBeVisible();
  };
  await check();
  await page.reload();
  await check();
});

// skill-loadout AC 7, 9, 13, 24: the loadout is stored, and only an equipped skill reaches the Bug Fight.
test("loadout persists and decides the fight's commands", async ({ page }) => {
  await newDev(page);
  const nav = page.getByRole("navigation", { name: "Cenas" });
  await openScene(page, "SKILLS");
  const endpoint = page.locator('[data-skill="be1"]');
  await endpoint.locator('[data-action="unlock"]').click();
  await expect(endpoint).toHaveAttribute("data-equipped", "true");

  await page.getByRole("button", { name: "remover ENDPOINT" }).click();
  await expect(page.getByRole("status")).toHaveText("> ENDPOINT removida do loadout");
  await page.reload();
  await expect(endpoint).toHaveAttribute("data-equipped", "false");
  await expect(page.locator('[data-slot="0"]')).toHaveAttribute("data-filled", "false");
  await expect(page.getByText("bônus ativo: +0 HP · +0 SP · +0% dano")).toBeVisible();

  await nav.getByRole("link", { name: "BUG FIGHT" }).click();
  await expect(page.getByText("ENCONTRO · VILA LOCALHOST")).toBeVisible();
  await expect(page.locator('[data-command="be1"]')).toHaveCount(0);
  await expect(page.locator('[data-command="ship"]')).toBeDisabled();
  await expect(page.getByLabel("dev em combate")).toContainText("PODER 0/100");

  await openScene(page, "SKILLS");
  await endpoint.locator('[data-action="equip"]').click();
  await expect(page.locator('[data-slot="0"]')).toContainText("ENDPOINT");
  await expect(page.getByText("bônus ativo: +0 HP · +0 SP · +8% dano")).toBeVisible();
  await nav.getByRole("link", { name: "BUG FIGHT" }).click();
  await expect(page.locator('[data-command="be1"]')).toBeVisible();

  // a landed FIX charges the stored power bar
  await page.locator('[data-command="fix"]').click();
  await expect(page.getByLabel("dev em combate")).toContainText("PODER 10/100");
  await page.reload();
  await expect(page.getByLabel("dev em combate")).toContainText("PODER 10/100");
});
