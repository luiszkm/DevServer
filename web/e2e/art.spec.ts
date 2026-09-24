import { expect, test, type Page } from "@playwright/test";
import { newDev } from "./helpers";

// game-art C33: the scene backgrounds are drawn at ×4 (1280x720) with pixelated rendering, which only
// globals.css sets - jsdom never loads it, so the real browser's computed style is the proof.
const scenes: { link: string; selector: string; ready: (page: Page) => Promise<void> }[] = [
  { link: "MUNDO", selector: ".world-map", ready: (page) => expect(page.getByText("região atual: VILA LOCALHOST")).toBeVisible() },
  { link: "SERVER", selector: ".server", ready: (page) => expect(page.getByText("LOJA DE COMPONENTES")).toBeVisible() },
  { link: "OFFICE", selector: ".office-room", ready: (page) => expect(page.getByText("CATÁLOGO")).toBeVisible() },
  { link: "BUG FIGHT", selector: ".battle", ready: (page) => expect(page.getByText("ENCONTRO · VILA LOCALHOST")).toBeVisible() },
];

for (const { link, selector, ready } of scenes) {
  test(`scene art scale ${selector}`, async ({ page }) => {
    await newDev(page);
    await page.getByRole("navigation", { name: "Cenas" }).getByRole("link", { name: link }).click();
    await ready(page);
    const style = await page.locator(selector).evaluate((el) => {
      const s = getComputedStyle(el);
      return { backgroundSize: s.backgroundSize, imageRendering: s.imageRendering };
    });
    expect(style).toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" });
  });
}
