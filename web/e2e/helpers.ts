import { expect, type Page } from "@playwright/test";

const HUB = new Set(["OFFICE", "AVATAR", "SKILLS", "SERVER"]);
const IN_HUD = new Set(["TÍTULO", "MUNDO", "DEPLOY", "BUG FIGHT", "LOJA"]);

const hud = (page: Page) => page.getByRole("banner", { name: "HUD" });

/** The HUD hero opens BASE; there is no BASE tab. */
export const openBase = (page: Page) => hud(page).getByRole("link", { name: /ir para a base$/ }).click();

/** Opens a scene. Office, avatar, skills and server are tabs inside BASE; TÍTULO, MUNDO, DEPLOY, BUG FIGHT and LOJA are HUD links. */
export async function openScene(page: Page, name: string) {
  if (HUB.has(name)) {
    const base = page.getByRole("navigation", { name: "Base" });
    if (!(await base.isVisible())) await openBase(page);
    await base.getByRole("link", { name, exact: true }).click();
    return;
  }
  if (IN_HUD.has(name)) {
    await hud(page).getByRole("link", { name, exact: true }).click();
    return;
  }
  throw new Error(`openScene: no way to reach ${name}`);
}

const FAKE = "http://localhost:9180";

/** Logs a brand-new GitHub user in through the fake OAuth flow and creates their dev. */
export async function newDev(page: Page, body = "masculino", className = "BACKEND") {
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const devName = `E2E_${String(id).slice(-10)}`;
  const res = await page.request.post(`${FAKE}/fake/next-user`, { data: { id, login: devName.toLowerCase() } });
  expect(res.status()).toBe(204);

  await page.goto("/");
  await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
  await expect(page.getByRole("textbox")).toHaveValue(devName);
  await page.getByRole("button", { name: className }).click();
  await page.locator(`[data-body="${body}"]`).click();
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");
  return devName;
}
