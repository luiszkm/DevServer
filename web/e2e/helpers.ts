import { expect, type Page } from "@playwright/test";

const FAKE = "http://localhost:9180";

/** Logs a brand-new GitHub user in through the fake OAuth flow and creates their dev. */
export async function newDev(page: Page) {
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const devName = `E2E_${String(id).slice(-10)}`;
  const res = await page.request.post(`${FAKE}/fake/next-user`, { data: { id, login: devName.toLowerCase() } });
  expect(res.status()).toBe(204);

  await page.goto("/");
  await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
  await expect(page.getByRole("textbox")).toHaveValue(devName);
  await page.getByRole("button", { name: "BACKEND" }).click();
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("contentinfo", { name: "HUD" })).toContainText("LEVEL 1");
  return devName;
}
