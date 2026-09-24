import { expect, test, type Page } from "@playwright/test";
import { newDev } from "./helpers";

// game-menu C6-C8, C14, C16: hotbar layout, active and focus frames, shortcuts and the 3x3 window in the browser
const YELLOW = "rgb(255, 201, 60)";
const nav = (page: Page) => page.getByRole("navigation", { name: "Cenas" });

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("C6 hotbar row", async ({ page }) => {
    await newDev(page);
    const links = nav(page).getByRole("link");
    await expect(links).toHaveCount(9);
    const boxes = [];
    for (const link of await links.all()) {
      boxes.push((await link.boundingBox())!);
      const icon = link.locator(".tab-icon");
      const ib = (await icon.boundingBox())!;
      expect([ib.width, ib.height]).toEqual([44, 44]);
      await expect.poll(() => icon.locator("img").evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0))).toBe(16);
    }
    expect(new Set(boxes.map((b) => b.y)).size).toBe(1);
    const widths = boxes.map((b) => b.width);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    expect((await page.locator(".page").boundingBox())!.width).toBe(1200);
    expect((await page.locator('section.scene[aria-label="TÍTULO"]').boundingBox())!.height).toBe(760);
  });

  test("C7 active slot", async ({ page }) => {
    await newDev(page);
    await page.goto("/server");
    await expect(page.getByText("LOJA DE COMPONENTES")).toBeVisible();
    const colors = await nav(page)
      .getByRole("link")
      .evaluateAll((ls) => ls.map((l) => [l.textContent, getComputedStyle(l.querySelector(".tab-icon")!).borderTopColor]));
    for (const [text, color] of colors) {
      if (text?.includes("SERVER")) expect(color, text!).toBe(YELLOW);
      else expect(color, text!).not.toBe(YELLOW);
    }
    expect(colors).toHaveLength(9);
  });

  test("C8 focus outline", async ({ page }) => {
    await newDev(page);
    await page.locator("body").focus();
    await page.keyboard.press("Tab");
    const focused = nav(page).getByRole("link", { name: /TÍTULO/ });
    await expect(focused).toBeFocused();
    const outline = await focused.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
    });
    expect(outline).toEqual({ style: "solid", width: "3px", color: YELLOW });
  });

  test("C14 shortcuts", async ({ page }) => {
    await newDev(page);
    await page.keyboard.press("4");
    await expect(page).toHaveURL(/\/deploy$/);
    await expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("CLIQUE NAS PLACAS PARA NAVEGAR")).toBeVisible();
  });
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
]) {
  test.describe(`phone ${viewport.width}`, () => {
    test.use({ viewport });

    test(`C16 command window ${viewport.width}`, async ({ page }) => {
      await newDev(page);
      await page.getByRole("button", { name: /^MENU/ }).click();
      const links = nav(page).getByRole("link");
      await expect(links).toHaveCount(9);
      const xs = new Set<number>();
      const ys = new Set<number>();
      for (const link of await links.all()) {
        await expect(link).toBeVisible();
        await expect(link.locator("img")).toBeVisible();
        const b = (await link.boundingBox())!;
        xs.add(Math.round(b.x));
        ys.add(Math.round(b.y));
      }
      expect(xs.size).toBe(3);
      expect(ys.size).toBe(3);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  });
}
