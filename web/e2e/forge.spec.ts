import { expect, test } from "@playwright/test";
import { newDev } from "./helpers";

// forge C27: the FORJA section stacks in the same column as the other shop sections.
for (const width of [390, 360]) {
  test(`forge on phone ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await newDev(page);
    await page.goto("/loja");
    await expect(page.getByText("LOJA DEVSERVER")).toBeVisible();
    const forge = await page.getByRole("region", { name: "FORJA" }).boundingBox();
    const skins = await page.getByRole("region", { name: "SKINS DO AVATAR" }).boundingBox();
    expect(forge && skins).toBeTruthy();
    expect(forge!.x).toBeCloseTo(skins!.x, 0);
    expect(forge!.width).toBeCloseTo(skins!.width, 0);
    expect(forge!.y).toBeGreaterThanOrEqual(skins!.y + skins!.height);
    expect(forge!.x).toBeGreaterThanOrEqual(0);
    expect(forge!.x + forge!.width).toBeLessThanOrEqual(width + 0.5);
    const scroll = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  });
}

// forge C28: the forge route answers through the /api rewrite with the page's session.
test("forge round trip", async ({ page }) => {
  await newDev(page);
  await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: "LOJA" }).click();
  const forge = page.getByRole("region", { name: "FORJA" });
  await expect(forge).toBeVisible();
  await expect(forge.locator('[data-recipe="forja_cache"] .shop-status')).toHaveText("FALTAM MATERIAIS");
  const res = await page.request.post("/api/me/forge/forja_cache");
  expect(res.status()).toBe(409);
  expect((await res.json()).error.code).toBe("not_enough_materials");
});
