import { expect, test, type Page } from "@playwright/test";
import { newDev, openScene } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function openAvatar(page: Page) {
  await openScene(page, "AVATAR");
  await expect(page.getByLabel("atributos")).toBeVisible();
}

async function player(page: Page) {
  const res = await page.request.get("/api/me");
  expect(res.ok()).toBeTruthy();
  return (await res.json()).player as { body: string; appearance: Record<string, string>; equipment: Record<string, string | null> };
}

async function previewSrc(page: Page) {
  const hero = page.locator(".avatar-hero");
  await expect(hero).toBeVisible();
  return hero.getAttribute("src");
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

test("picked colours are saved and the painted hero stays", async ({ page }) => {
  await openCreate(page);
  await page.locator('[data-body="masculino"]').click();
  await expect(page.locator('[data-body="masculino"] img')).toHaveAttribute("src", "/cast/hero-m-idle.png");
  await page.locator('[data-option="tone_negra"]').click();
  await page.locator('[data-part="topColor"]').click();
  await page.locator('[data-option="top_vinho"]').click();
  await expect(page.locator(".onboarding-hero")).toHaveAttribute("src", "/cast/hero-m-idle.png");
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");

  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-m-idle.png");
  expect(await player(page)).toMatchObject({ appearance: { tone: "tone_negra", topColor: "top_vinho" } });

  await page.reload();
  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-m-idle.png");
  expect(await player(page)).toMatchObject({ appearance: { tone: "tone_negra", topColor: "top_vinho" } });
});

test("equipped hoodie is saved and the painted hero stays", async ({ page }) => {
  await newDev(page);
  await page.getByRole("banner", { name: "HUD" }).getByRole("link", { name: "LOJA" }).click();
  await page.getByRole("tab", { name: "EQUIP" }).click();
  await page.locator('[data-card="moletom"]').click();
  await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
  await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");

  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-m-idle.png");
  expect((await player(page)).equipment.torso).toBe("moletom");
});

test("beard and glasses are saved and the painted hero stays", async ({ page }) => {
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
  expect(await previewSrc(page)).toBe("/cast/hero-m-idle.png");
  expect(await player(page)).toMatchObject({
    appearance: { beard: "beard_cheia", glasses: "glasses_escuro", hairColor: "hair_ruivo" },
  });

  await page.reload();
  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-m-idle.png");
  expect(await player(page)).toMatchObject({
    appearance: { beard: "beard_cheia", glasses: "glasses_escuro", hairColor: "hair_ruivo" },
  });
});

test("a feminine dev uses the painted heroine and keeps the body", async ({ page }) => {
  await newDev(page, "feminino");
  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-f-idle.png");
  expect((await player(page)).body).toBe("feminino");

  await page.reload();
  await openAvatar(page);
  expect(await previewSrc(page)).toBe("/cast/hero-f-idle.png");
  expect((await player(page)).body).toBe("feminino");
  expect(page.getByRole("tab", { name: "VISUAL" })).toHaveCount(0);
});
