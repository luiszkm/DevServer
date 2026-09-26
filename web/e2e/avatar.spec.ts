import { expect, test, type Page } from "@playwright/test";
import { newDev, openScene } from "./helpers";

// avatar customization: the part colours are swapped on a canvas, which only a real browser draws.
// Probe pixels on the 48x64 grid (web/art/sprite/hero): a cheek (body, tone index 2) and the chest
// of the hoodie (top-moletom, topColor index 1).
const CHEEK = [22, 19] as const;
const CHEST = [17, 39] as const;

// The AVATAR preview plays the idle strip (assets C48), which moves the head and torso a pixel or two per
// frame. These probes are about the static grid's colours and draw order, so they run with reduced
// motion, where the preview draws the static layers (assets C45).
test.use({ reducedMotion: "reduce" });

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
  await openScene(page, "AVATAR");
  await expect(page.getByLabel("atributos")).toBeVisible();
}

/** Logs in a new user and stops on the create-dev form (body + look still to pick). */
async function openCreate(page: Page, className = "BACKEND") {
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const devName = `E2E_${String(id).slice(-10)}`;
  const res = await page.request.post(`http://localhost:9180/fake/next-user`, { data: { id, login: devName.toLowerCase() } });
  expect(res.status()).toBe(204);
  await page.goto("/");
  await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
  await expect(page.getByRole("textbox")).toHaveValue(devName);
  await page.getByRole("button", { name: className }).click();
  return devName;
}

test("picked colours are drawn and survive a reload", async ({ page }) => {
  await openCreate(page);
  await page.locator('[data-body="masculino"]').click();
  await page.locator('[data-option="tone_negra"]').click();
  await page.locator('[data-part="topColor"]').click();
  await page.locator('[data-option="top_vinho"]').click();
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");

  await openAvatar(page);
  expect(await pixel(page, CHEEK)).toBe("#7c4a30");
  expect(await pixel(page, CHEST)).toBe("#5a1426");

  await page.reload();
  await openAvatar(page);
  expect(await pixel(page, CHEEK)).toBe("#7c4a30");
  expect(await pixel(page, CHEST)).toBe("#5a1426");
});

test("equipped hoodie dresses the hero", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "LOJA" }).click();
  await page.getByRole("tab", { name: "EQUIP" }).click();
  await page.locator('[data-card="moletom"]').click();
  await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
  await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");

  await openAvatar(page);
  // the gear's own hoodie replaces the player's top, so the chest is no longer the grafite ramp
  expect(await pixel(page, CHEST)).not.toBe("#2c3838");
});

test("beard follows the hair colour and glasses are drawn over the face", async ({ page }) => {
  await openCreate(page);
  await page.locator('[data-body="masculino"]').click();
  await page.locator('[data-part="beard"]').click();
  await page.locator('[data-option="beard_cheia"]').click();
  await page.locator('[data-part="glasses"]').click();
  await page.locator('[data-option="glasses_escuro"]').click();
  await page.locator('[data-part="hairColor"]').click();
  await page.locator('[data-option="hair_ruivo"]').click();
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");

  await openAvatar(page);
  // beard-cheia (24,26) is hair ramp index 1; glasses-escuro (20,17) is a stone.1 lens
  expect(await pixel(page, [24, 26])).toBe("#8a2c14");
  expect(await pixel(page, [20, 17])).toBe("#121e2a");

  await page.reload();
  await openAvatar(page);
  expect(await pixel(page, [24, 26])).toBe("#8a2c14");
  expect(await pixel(page, [20, 17])).toBe("#121e2a");
});

test("a feminine dev is drawn with the feminine body and keeps it", async ({ page }) => {
  await newDev(page, "feminino");
  await openAvatar(page);
  // body-f: face (24,22) skin.2 and brow (31,15) in the hair ramp shown as castanho (feminino's default hair
  // colour); top-moletom-f chest (23,33) grafite index 1; bottom-f (20,47) denim.3 shown as preto.3
  expect(await pixel(page, [24, 22])).toBe("#f6ba72");
  expect(await pixel(page, [31, 15])).toBe("#2a160c");
  expect(await pixel(page, [23, 33])).toBe("#2c3838");
  expect(await pixel(page, [20, 47])).toBe("#32323c");

  await page.reload();
  await openAvatar(page);
  expect(await pixel(page, [31, 15])).toBe("#2a160c");
  expect(page.getByRole("tab", { name: "VISUAL" })).toHaveCount(0);
});
