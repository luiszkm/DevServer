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
      // top-left, above the Next dev overlay, so a pointer can press it
      el.style.cssText = "position: fixed; left: 40px; top: 40px; z-index: 2147483647;";
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

// assets C31
test("loading loops", async ({ page }) => {
  await probe(page, "fx-loading", "span");
  const read = () =>
    page.locator('[data-probe="fx-loading"]').evaluate((el) => {
      const s = getComputedStyle(el);
      return { count: s.animationIterationCount, name: s.animationName, rendering: s.imageRendering };
    });
  const moving = await read();
  expect(moving.count).toBe("infinite");
  expect(moving.rendering).toBe("pixelated");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await read()).name).toBe("none");
});

// assets-apply C10
test("wood and bar chrome", async ({ page }) => {
  await probe(page, "panel panel-wood");
  const wood = await page.locator('[data-probe="panel panel-wood"]').evaluate((el) => {
    const s = getComputedStyle(el);
    return { source: s.borderImageSource, slice: s.borderImageSlice };
  });
  expect(wood.source).toContain("/art/ui/ui-panel-wood.png");
  expect(wood.slice).toBe("8 fill");
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "bar";
    el.setAttribute("data-probe", "bar");
    document.body.appendChild(el);
  });
  expect(await page.locator('[data-probe="bar"]').evaluate((el) => getComputedStyle(el).borderImageSource)).toContain("/art/ui/ui-bar.png");
});

// assets-apply C17
test("tiled office zones", async ({ page }) => {
  await probe(page, "office-zone");
  const s = await page.locator('[data-probe="office-zone"]').evaluate((el) => {
    const c = getComputedStyle(el);
    return { size: c.backgroundSize, repeat: c.backgroundRepeat };
  });
  expect(s).toEqual({ size: "64px 64px", repeat: "repeat" });
});

// assets-apply C22
test("fire loops", async ({ page }) => {
  await probe(page, "fx-fire", "span");
  const read = () => page.locator('[data-probe="fx-fire"]').evaluate((el) => {
    const s = getComputedStyle(el);
    return { count: s.animationIterationCount, name: s.animationName };
  });
  expect((await read()).count).toBe("infinite");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await read()).name).toBe("none");
});
