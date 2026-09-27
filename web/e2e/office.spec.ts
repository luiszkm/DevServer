import { expect, test } from "@playwright/test";
import { newDev, openScene } from "./helpers";

// C40
test("install and remove", async ({ page }) => {
  await newDev(page);
  const hud = page.getByRole("banner", { name: "HUD" });
  const coins = hud.locator(".hud-card", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("9999");

  await openScene(page, "OFFICE");
  await expect(page.getByText("CATÁLOGO")).toBeVisible();
  await page.locator('[data-card="planta"]').click();
  const spot = page.locator('[data-cell="piso-5"]');
  await spot.click();
  await expect(page.getByRole("status")).toHaveText("PLANTA DE CANTO INSTALADO");
  await expect(coins).toHaveText("9974");

  await page.reload();
  await expect(spot).toContainText("PLANTA DE CANTO");
  await expect(page.getByText("1 móveis instalados")).toBeVisible();
  await expect(coins).toHaveText("9974");

  await spot.click();
  await expect(page.getByRole("status")).toHaveText("GUARDADO · +12 COINS");
  await expect(coins).toHaveText("9986");
  await expect(spot).toHaveText("+");
});

// office-keyart C35
test("apply layout template", async ({ page }) => {
  await newDev(page);
  const coins = page.getByRole("banner", { name: "HUD" }).locator(".hud-card", { hasText: "COINS" }).locator(".hud-value");
  await openScene(page, "OFFICE");
  await page.locator('[data-template="basico"]').getByRole("button", { name: "APLICAR" }).click();
  await expect(page.getByRole("status")).toHaveText("LAYOUT BÁSICO APLICADO");
  await expect(coins).toHaveText("9729");
  const desk = page.locator('[data-cell="piso-2"]');
  await expect(desk).toContainText("MESA EM L");

  await page.reload();
  await expect(desk).toContainText("MESA EM L");
  await expect(page.getByText("7 móveis instalados")).toBeVisible();
  await expect(coins).toHaveText("9729");
});

// office-keyart C18
test("light tints the room", async ({ page }) => {
  await newDev(page);
  await openScene(page, "OFFICE");
  const room = page.getByRole("region", { name: "sala" });
  const tint = () => room.evaluate((el) => getComputedStyle(el, "::after").backgroundColor);
  const choose = async (id: string, name: string) => {
    await page.locator(`[data-light-option="${id}"]`).click();
    await expect(page.getByRole("status")).toHaveText(`LUZ ${name}`);
    await expect(room).toHaveAttribute("data-light", id);
  };

  expect(await tint()).toBe("rgba(0, 0, 0, 0)");
  // GAMER is 84 of comfort; three windows (15 each) take it to 129, past NEON's 120.
  await page.locator('[data-template="gamer"]').getByRole("button", { name: "APLICAR" }).click();
  await expect(page.getByRole("status")).toHaveText("LAYOUT GAMER APLICADO");
  await page.locator('[data-card="janela"]').click();
  for (const i of [0, 1, 3]) {
    await page.locator(`[data-cell="parede-${i}"]`).click();
    await expect(page.getByRole("status")).toHaveText("JANELA COM VISTA INSTALADO");
  }

  const tints: string[] = [];
  for (const [id, name] of [["quente", "LUZ QUENTE"], ["noite", "NOITE"], ["neon", "NEON"]]) {
    await choose(id, name);
    tints.push(await tint());
  }
  for (const t of tints) expect(t).not.toBe("rgba(0, 0, 0, 0)");
  expect(new Set(tints).size).toBe(3);
  await choose("natural", "NATURAL");
  expect(await tint()).toBe("rgba(0, 0, 0, 0)");
});
