import { expect, test } from "@playwright/test";
import { newDev, openScene } from "./helpers";

test("enhance to raro persists", async ({ page }) => {
  await newDev(page);
  await openScene(page, "AVATAR");
  await page.getByRole("link", { name: /NOTEBOOK/ }).click();
  await expect(page).toHaveURL(/\/notebook$/);
  await expect(page.getByText("NOTEBOOK BÁSICO")).toBeVisible();
  await expect(page.getByText("NÍVEL 1/10")).toBeVisible();
  for (const level of ["NÍVEL 2/10", "NÍVEL 3/10", "NÍVEL 4/10"]) {
    await page.getByRole("button", { name: /APRIMORAR/ }).click();
    await expect(page.getByText(level)).toBeVisible();
  }
  await expect(page.getByText("NOTEBOOK RARO")).toBeVisible();
  await page.reload();
  await expect(page.getByText("NÍVEL 4/10")).toBeVisible();
});

test("upgrade then locked", async ({ page }) => {
  await newDev(page);
  await page.goto("/notebook");
  const hud = page.getByRole("banner", { name: "HUD" });
  const coins = hud.locator(".hud-row", { hasText: "COINS" }).locator(".hud-value");
  await expect(coins).toHaveText("9999");
  const cpu = page.locator(".notebook-card", { hasText: "CPU TURBO" });
  await cpu.getByRole("button", { name: "UPGRADE · 300c" }).click();
  await expect(cpu).toContainText("NV 1/3");
  await expect(cpu.getByRole("button", { name: "REQUER NOTEBOOK NV 4" })).toBeDisabled();
  await expect(coins).toHaveText("9699");
});

test("notebook fits phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await newDev(page);
  await page.goto("/notebook");
  const fit = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await expect.poll(fit).toBe(true);
  const panel = page.locator(".notebook-panel");
  const cards = page.locator(".notebook-card");
  const panelBox = await panel.boundingBox();
  const boxes = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  expect(boxes[0].top).toBeGreaterThan((panelBox?.y ?? 0) + (panelBox?.height ?? 0) - 1);
  expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(1);

  await page.route("**/api/me/notebook/enhance", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "notebook_max_level", message: "o notebook já está no nível máximo" } }),
    }),
  );
  await page.getByRole("button", { name: /APRIMORAR/ }).click();
  await expect(page.getByRole("status")).toHaveText("o notebook já está no nível máximo");
  await expect.poll(fit).toBe(true);
  const errored = await page.locator(".notebook-card").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
  expect(new Set(errored).size).toBe(1);
});

test("notebook desktop arrangement", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await newDev(page);
  await page.goto("/notebook");
  const panel = await page.locator(".notebook-panel").boundingBox();
  const list = await page.locator(".notebook-upgrades").boundingBox();
  expect(panel && list && Math.abs(panel.y - list.y) < 4).toBe(true);
  expect(panel && list && panel.x < list.x).toBe(true);
});
