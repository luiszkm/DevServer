import { expect, test, type Page } from "@playwright/test";

// assets C13/C14/C31: the chrome and the loading strip are globals.css rules, which jsdom never loads, so
// the real browser's computed style on elements carrying those classes is the proof.

async function probe(page: Page, className: string, tag = "div") {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  return page.evaluate(
    ([cls, t]) => {
      const el = document.createElement(t);
      el.className = cls;
      el.textContent = "PROBE";
      el.setAttribute("data-probe", cls);
      document.body.appendChild(el);
      return cls;
    },
    [className, tag],
  );
}

const style = (page: Page, cls: string) =>
  page.locator(`[data-probe="${cls}"]`).evaluate((el) => {
    const s = getComputedStyle(el);
    return { source: s.borderImageSource, slice: s.borderImageSlice, rendering: s.imageRendering };
  });

const chrome: [string, string, string][] = [
  ["panel", "div", "/art/ui/ui-panel.png"],
  ["hud-card", "div", "/art/ui/ui-panel.png"],
  ["btn btn-yellow", "button", "/art/ui/ui-btn-wood.png"],
  ["btn btn-dark", "button", "/art/ui/ui-btn-dark.png"],
  ["btn btn-green", "button", "/art/ui/ui-btn-green.png"],
];

for (const [cls, tag, piece] of chrome) {
  test(`chrome 9-slice .${cls.split(" ").pop()}`, async ({ page }) => {
    await probe(page, cls, tag);
    const s = await style(page, cls);
    expect(s.source).toContain(piece);
    expect(s.slice).toBe("8 fill");
    expect(s.rendering).toBe("pixelated");
  });
}

for (const [cls, tag, piece] of chrome.filter(([c]) => c.startsWith("btn"))) {
  test(`pressed .${cls.split(" ").pop()}`, async ({ page }) => {
    await probe(page, cls, tag);
    const el = page.locator(`[data-probe="${cls}"]`);
    await el.hover();
    await page.mouse.down();
    const s = await style(page, cls);
    await page.mouse.up();
    expect(s.source).toContain(piece.replace(".png", "-press.png"));
  });
}
