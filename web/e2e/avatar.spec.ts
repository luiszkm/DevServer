import { expect, test, type Page } from "@playwright/test";
import { newDev } from "./helpers";

// avatar customization: the part colours are swapped on a canvas, which only a real browser draws.
// Probe pixels on the 48x64 grid (web/art/sprite/hero): a cheek (body, tone index 2) and the chest
// of the hoodie (top-moletom, topColor index 1).
const CHEEK = [22, 19] as const;
const CHEST = [17, 39] as const;

async function pixel(page: Page, [x, y]: readonly [number, number]) {
  const hero = page.locator(".avatar-hero");
  await expect(hero).toBeVisible();
  // the layers load asynchronously; wait until something is painted at the probe
  await expect
    .poll(() => hero.evaluate((c: HTMLCanvasElement, [x, y]) => c.getContext("2d")!.getImageData(x, y, 1, 1).data[3], [x, y]))
    .toBe(255);
  return hero.evaluate((c: HTMLCanvasElement, [x, y]) => {
    const [r, g, b] = c.getContext("2d")!.getImageData(x, y, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }, [x, y]);
}

async function openAvatar(page: Page) {
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "AVATAR" }).click();
  await expect(page.getByLabel("atributos")).toBeVisible();
}

test("picked colours are drawn and survive a reload", async ({ page }) => {
  await newDev(page);
  await openAvatar(page);
  expect(await pixel(page, CHEEK)).toBe("#f6ba72");
  expect(await pixel(page, CHEST)).toBe("#2c3838");

  await page.getByRole("tab", { name: "VISUAL" }).click();
  await page.locator('[data-option="tone_negra"]').click();
  await page.locator('[data-part="topColor"]').click();
  await page.locator('[data-option="top_vinho"]').click();
  // the preview repaints before saving
  await expect.poll(() => pixel(page, CHEEK)).toBe("#7c4a30");
  await page.getByRole("button", { name: "SALVAR" }).click();
  await expect(page.getByRole("status")).toHaveText("VISUAL SALVO");

  await page.reload();
  await openAvatar(page);
  expect(await pixel(page, CHEEK)).toBe("#7c4a30");
  expect(await pixel(page, CHEST)).toBe("#5a1426");
});

test("equipped hoodie dresses the hero", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "LOJA" }).click();
  await page.locator('[data-card="moletom"]').click();
  await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
  await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");

  await openAvatar(page);
  // the gear's own hoodie replaces the player's top, so the chest is no longer the grafite ramp
  expect(await pixel(page, CHEST)).not.toBe("#2c3838");
  await page.getByRole("tab", { name: "VISUAL" }).click();
  await page.locator('[data-part="top"]').click();
  await expect(page.getByText("em uso: MOLETOM CONFORTÁVEL — remova o item para usar a sua escolha.")).toBeVisible();
});
