import { expect, test } from "@playwright/test";

const FAKE = "http://localhost:9180";

test.use({ viewport: { width: 360, height: 740 } });

test("onboarding look fits phone", async ({ page }) => {
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const res = await page.request.post(`${FAKE}/fake/next-user`, { data: { id, login: `e2e_${String(id).slice(-10)}` } });
  expect(res.status()).toBe(204);
  await page.goto("/");
  await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
  await page.locator('[data-body="masculino"]').click();
  await expect(page.getByRole("group", { name: "partes" })).toBeVisible();
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  const box = (await page.getByRole("button", { name: "CRIAR DEV" }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);

  await page.getByRole("button", { name: "BACKEND" }).click();
  await page.getByRole("button", { name: "CLARA" }).click();
  await page.locator('[data-part="top"]').click();
  await page.getByRole("button", { name: "CAMISETA" }).click();
  await expect(page.locator(".onboarding-hero")).toHaveAttribute("data-look", /#b07858/);
  await expect(page.locator(".onboarding-hero")).toHaveAttribute("data-look", /top-camiseta/);
  await page.getByRole("button", { name: "CRIAR DEV" }).click();
  await expect(page.getByRole("banner", { name: "HUD" })).toContainText("LEVEL 1");
  await page.getByRole("button", { name: /^MENU/ }).click();
  await page.getByRole("link", { name: "BASE" }).click();
  await page.getByRole("navigation", { name: "Base" }).getByRole("link", { name: "AVATAR" }).click();
  await expect(page.locator(".avatar-hero")).toHaveAttribute("data-look", /#b07858/);
  await expect(page.locator(".avatar-hero")).toHaveAttribute("data-look", /top-camiseta/);
});
