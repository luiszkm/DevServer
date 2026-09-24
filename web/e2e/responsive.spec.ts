import { expect, test, type Page } from "@playwright/test";
import { newDev } from "./helpers";

// responsive C7-C17: layout only exists in the real browser - jsdom never evaluates the media block.
const FAKE = "http://localhost:9180";
const PHONE_S = { width: 360, height: 740 };
const PHONE_M = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const SCENES: { route: string; label: string; ready: (page: Page) => Promise<void> }[] = [
  { route: "/", label: "TÍTULO", ready: (page) => expect(page.getByText("CLIQUE NAS PLACAS PARA NAVEGAR")).toBeVisible() },
  { route: "/mundo", label: "MUNDO", ready: (page) => expect(page.getByText("região atual: VILA LOCALHOST")).toBeVisible() },
  { route: "/server", label: "SERVER", ready: (page) => expect(page.getByText("LOJA DE COMPONENTES")).toBeVisible() },
  { route: "/deploy", label: "DEPLOY", ready: (page) => expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible() },
  { route: "/bug-fight", label: "BUG FIGHT", ready: (page) => expect(page.getByText("ENCONTRO · VILA LOCALHOST")).toBeVisible() },
  { route: "/skills", label: "SKILLS", ready: (page) => expect(page.getByText("PONTOS: 1")).toBeVisible() },
  { route: "/loja", label: "LOJA", ready: (page) => expect(page.getByText("LOJA DEVSERVER")).toBeVisible() },
  { route: "/avatar", label: "AVATAR", ready: (page) => expect(page.getByLabel("atributos")).toBeVisible() },
  { route: "/office", label: "OFFICE", ready: (page) => expect(page.getByText("CATÁLOGO")).toBeVisible() },
];

type Box = { x: number; y: number; width: number; height: number; name: string };

/** Boxes of every visible button, link and input under the given roots. */
async function controls(page: Page, roots: string[], exclude?: string): Promise<Box[]> {
  return page.evaluate(
    ({ roots, exclude }) =>
      roots
        .flatMap((r) => [...document.querySelectorAll(r)])
        .flatMap((root) => [...root.querySelectorAll<HTMLElement>("button, a, input")])
        .filter((el) => el.checkVisibility() && !(exclude && el.matches(exclude)))
        .map((el) => {
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height, name: (el.textContent || el.getAttribute("aria-label") || el.tagName).trim() };
        }),
    { roots, exclude },
  );
}

async function horizontalScroll(page: Page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
}

function outside(boxes: Box[], width: number) {
  return boxes.filter((b) => b.x < 0 || b.x + b.width > width + 0.5).map((b) => b.name);
}

async function openScene(page: Page, s: (typeof SCENES)[number]) {
  await page.goto(s.route);
  await s.ready(page);
}

const scene = (s: (typeof SCENES)[number]) => `section.scene[aria-label="${s.label}"]`;

test.describe("phone M", () => {
  test.use({ viewport: PHONE_M });

  test("C7 menu on phone", async ({ page }) => {
    await newDev(page);
    const nav = page.getByRole("navigation", { name: "Cenas" });
    const menu = page.getByRole("button", { name: /^MENU/ });
    const all = nav.getByRole("link", { includeHidden: true });
    await expect(all).toHaveCount(9);
    for (const link of await all.all()) await expect(link).toBeHidden();
    await expect(menu).toHaveText("MENU · TÍTULO");
    await expect(menu).toHaveAttribute("aria-expanded", "false");

    await menu.click();
    const links = nav.getByRole("link");
    for (const link of await links.all()) await expect(link).toBeVisible();
    const names = (await links.allTextContents()).map((t) => t.replace(/^\d\d/, ""));
    expect(names).toEqual(SCENES.map((s) => s.label));

    await nav.getByRole("link", { name: /DEPLOY/ }).click();
    await expect(page).toHaveURL(/\/deploy$/);
    await expect(page.getByText("PIPELINES DE DEPLOY")).toBeVisible();
    await expect(all).toHaveCount(9);
    for (const link of await all.all()) await expect(link).toBeHidden();
    await expect(menu).toHaveText("MENU · DEPLOY");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(all.filter({ hasText: "DEPLOY" })).toHaveAttribute("aria-current", "page");
  });

  for (const s of SCENES) {
    test(`C8 390 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      const { scrollWidth, innerWidth } = await horizontalScroll(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });

    test(`C11 390 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      const section = page.locator(scene(s));
      const clip = await section.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
      expect(clip.scrollHeight).toBeLessThanOrEqual(clip.clientHeight);
      const last = section.locator("button:visible, a:visible, input:visible").last();
      await last.scrollIntoViewIfNeeded();
      const box = (await last.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(PHONE_M.height);
    });
  }

  test("C13 title", async ({ page }) => {
    await newDev(page);
    await openScene(page, SCENES[0]);
    const img = page.locator(".title-art img");
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const frameWidth = await page.locator(".frame").evaluate((el) => el.clientWidth);
    const art = (await img.boundingBox())!;
    expect(Math.abs(art.width - frameWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(art.height / art.width - 0.8)).toBeLessThanOrEqual(0.01);
    const spots = await controls(page, [".title-art"]);
    expect(spots).toHaveLength(6);
    for (const b of spots) {
      expect(b.x).toBeGreaterThanOrEqual(art.x - 0.5);
      expect(b.y).toBeGreaterThanOrEqual(art.y - 0.5);
      expect(b.x + b.width).toBeLessThanOrEqual(art.x + art.width + 0.5);
      expect(b.y + b.height).toBeLessThanOrEqual(art.y + art.height + 0.5);
    }
  });
});

test.describe("phone S", () => {
  test.use({ viewport: PHONE_S });

  for (const s of SCENES) {
    test(`C8 360 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      const { scrollWidth, innerWidth } = await horizontalScroll(page);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });

    test(`C9 360 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      const boxes = await controls(page, [scene(s), "footer.hud"]);
      expect(boxes.length).toBeGreaterThan(0);
      expect(outside(boxes, PHONE_S.width)).toEqual([]);
    });

    test(`C10 360 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      const boxes = await controls(page, [scene(s), "footer.hud", ".tabs-bar"], ".title-art a");
      const small = boxes.filter((b) => b.width < 24 || b.height < 24).map((b) => `${b.name} ${b.width}x${b.height}`);
      expect(small).toEqual([]);
    });
  }

  test("C10 360 menu open", async ({ page }) => {
    await newDev(page);
    await page.getByRole("button", { name: /^MENU/ }).click();
    const boxes = await controls(page, ["nav#cenas-nav"]);
    expect(boxes).toHaveLength(9);
    const small = boxes.filter((b) => b.width < 24 || b.height < 24).map((b) => `${b.name} ${b.width}x${b.height}`);
    expect(small).toEqual([]);
  });

  test("C12 hud", async ({ page }) => {
    await newDev(page);
    const cards = page.locator("footer.hud .hud-card");
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
      const b = (await card.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(PHONE_S.width);
    }
    await expect(page.getByRole("button", { name: "SAIR" })).toBeVisible();
  });

  test("C14 world", async ({ page }) => {
    await newDev(page);
    await openScene(page, SCENES[1]);
    const map = (await page.locator(".world-map").boundingBox())!;
    const markers = page.locator(".world-map .node-marker");
    await expect(markers).toHaveCount(6);
    for (const m of await markers.all()) {
      const b = (await m.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(map.x);
      expect(b.y).toBeGreaterThanOrEqual(map.y);
      expect(b.x + b.width).toBeLessThanOrEqual(map.x + map.width);
      expect(b.y + b.height).toBeLessThanOrEqual(map.y + map.height);
    }
    for (const chip of await page.locator(".world-map .node-chip").all()) await expect(chip).toBeHidden();
  });

  const fitsPhone = async (page: Page) => {
    const { scrollWidth, innerWidth } = await horizontalScroll(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    const boxes = await controls(page, ["body"]);
    expect(boxes.length).toBeGreaterThan(0);
    expect(outside(boxes, PHONE_S.width)).toEqual([]);
  };

  test("C15 login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "ENTRAR COM GITHUB" })).toBeVisible();
    await fitsPhone(page);
  });

  test("C15 onboarding", async ({ page }) => {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const res = await page.request.post(`${FAKE}/fake/next-user`, { data: { id, login: `e2e_${String(id).slice(-10)}` } });
    expect(res.status()).toBe(204);
    await page.goto("/");
    await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
    await expect(page.getByRole("button", { name: "CRIAR DEV" })).toBeVisible();
    await fitsPhone(page);
  });

  test("C15 server down", async ({ page }) => {
    await page.route("**/api/me", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"internal","message":"x"}}' }));
    await page.goto("/");
    await expect(page.getByRole("button", { name: "TENTAR DE NOVO" })).toBeVisible();
    await fitsPhone(page);
  });

  test("C15 loading", async ({ page }) => {
    await page.route("**/api/me", () => {});
    await page.goto("/");
    await expect(page.getByText("CARREGANDO...")).toBeVisible();
    await fitsPhone(page);
  });

  test("C17 backgrounds", async ({ page }) => {
    await newDev(page);
    const cases: [number, string][] = [[1, ".world-map"], [2, ".server"], [8, ".office-room"], [4, ".battle"]];
    for (const [i, selector] of cases) {
      await openScene(page, SCENES[i]);
      const style = await page.locator(selector).evaluate((el) => {
        const s = getComputedStyle(el);
        return { backgroundSize: s.backgroundSize, imageRendering: s.imageRendering };
      });
      expect(style, selector).toEqual({ backgroundSize: "1280px 720px", imageRendering: "pixelated" });
    }
  });
});

test.describe("desktop", () => {
  test.use({ viewport: DESKTOP });

  for (const s of SCENES) {
    test(`C16 1280 ${s.route}`, async ({ page }) => {
      await newDev(page);
      await openScene(page, s);
      expect((await page.locator(".page").boundingBox())!.width).toBe(1200);
      expect((await page.locator(scene(s)).boundingBox())!.height).toBe(760);
      const links = page.getByRole("navigation", { name: "Cenas" }).getByRole("link");
      await expect(links).toHaveCount(9);
      const ys = new Set<number>();
      for (const link of await links.all()) {
        await expect(link).toBeVisible();
        ys.add((await link.boundingBox())!.y);
      }
      expect(ys.size).toBe(1);
      await expect(page.getByRole("button", { name: /^MENU/ })).toBeHidden();
    });
  }
});

// responsive C22-C24 (added after verification round 1): error and populated states at phone width
test.describe("phone S states", () => {
  test.use({ viewport: PHONE_S });

  const fail = (page: Page, path: string, status: number, body: object) =>
    page.route(`**${path}`, (r) =>
      r.request().method() === "POST" ? r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }) : r.continue(),
    );

  async function fitsWith(page: Page, el: ReturnType<Page["locator"]>) {
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(PHONE_S.width);
    const { scrollWidth, innerWidth } = await horizontalScroll(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  }

  const onboardingErrors: [string, number, object, string][] = [
    ["name taken", 409, { error: { code: "dev_name_taken", message: "nome em uso" } }, "NOME JÁ EM USO"],
    ["error", 500, { error: { code: "internal", message: "erro de teste" } }, "erro de teste"],
  ];
  async function onboardingError(page: Page, status: number, body: object, text: string) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const res = await page.request.post(`${FAKE}/fake/next-user`, { data: { id, login: `e2e_${String(id).slice(-10)}` } });
    expect(res.status()).toBe(204);
    await fail(page, "/api/players", status, body);
    await page.goto("/");
    await page.getByRole("link", { name: "ENTRAR COM GITHUB" }).click();
    await page.getByRole("button", { name: "BACKEND" }).click();
    await page.getByRole("button", { name: "CRIAR DEV" }).click();
    return page.locator(".field-error", { hasText: text });
  }

  for (const [name, status, body, text] of onboardingErrors) {
    test(`C22 onboarding ${name}`, async ({ page }) => {
      await fitsWith(page, await onboardingError(page, status, body, text));
    });

    // C26 (added after verification round 2): the message stays inside the panel, not only the viewport
    test(`C26 onboarding ${name}`, async ({ page }) => {
      const error = await onboardingError(page, status, body, text);
      await expect(error).toBeVisible();
      const b = (await error.boundingBox())!;
      const panel = (await page.locator(".onboarding").boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(panel.x);
      expect(b.y).toBeGreaterThanOrEqual(panel.y);
      expect(b.x + b.width).toBeLessThanOrEqual(panel.x + panel.width);
      expect(b.y + b.height).toBeLessThanOrEqual(panel.y + panel.height);
    });
  }

  test("C23 mundo alert", async ({ page }) => {
    await newDev(page);
    await fail(page, "/api/me/travel", 500, { error: { code: "internal", message: "erro de teste" } });
    await openScene(page, SCENES[1]);
    await page.getByRole("button", { name: "VIAJAR ATÉ AQUI" }).nth(1).click();
    await fitsWith(page, page.locator(scene(SCENES[1])).getByRole("alert"));
  });

  test("C23 deploy alert", async ({ page }) => {
    await newDev(page);
    await fail(page, "/api/me/deploys", 500, { error: { code: "internal", message: "erro de teste" } });
    await openScene(page, SCENES[3]);
    await page.getByRole("region", { name: "painel de deploy" }).getByRole("button", { name: "INICIAR DEPLOY" }).click();
    await fitsWith(page, page.locator(scene(SCENES[3])).getByRole("alert"));
  });

  test("C23 server alert", async ({ page }) => {
    await newDev(page);
    await openScene(page, SCENES[2]);
    await page.locator('[data-card="gpu"]').click();
    await fitsWith(page, page.locator(scene(SCENES[2])).getByRole("alert"));
  });

  const populated: { route: string; fill: (page: Page) => Promise<void> }[] = [
    {
      route: "/deploy",
      fill: async (page) => {
        await page.getByRole("button", { name: "BANCO DE DADOS" }).click();
        await page.getByRole("region", { name: "painel de deploy" }).getByRole("button", { name: "INICIAR DEPLOY" }).click();
        await expect(page.getByRole("button", { name: "BANCO DE DADOS" })).toContainText(/restante/);
      },
    },
    {
      route: "/bug-fight",
      fill: async (page) => {
        await page.locator('[data-command="fix"]').click();
        await expect(page.getByRole("log")).toContainText("FIX:");
      },
    },
    {
      route: "/skills",
      fill: async (page) => {
        await page.locator('[data-skill="f1"]').click();
        await expect(page.locator('[data-skill="f1"]')).toHaveAttribute("data-state", "ATIVA");
      },
    },
    {
      route: "/avatar",
      fill: async (page) => {
        await page.goto("/loja");
        await page.locator('[data-card="cafe"]').click();
        await page.getByRole("region", { name: "detalhe" }).getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
        await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");
        await page.goto("/avatar");
        await expect(page.locator('[data-slot="bebida"]')).toContainText("CAFÉ EXPRESSO");
      },
    },
    {
      route: "/office",
      fill: async (page) => {
        await page.locator('[data-card="planta"]').click();
        await page.locator('[data-cell="piso-5"]').click();
        await expect(page.getByRole("status")).toHaveText("PLANTA DE CANTO INSTALADO");
      },
    },
    {
      route: "/server",
      fill: async (page) => {
        await page.locator('[data-card="ram"]').click();
        await expect(page.getByRole("status")).toContainText("RAM 32GB instalado no slot 01");
      },
    },
  ];
  async function fitsPopulated(page: Page, s: (typeof SCENES)[number]) {
    const { scrollWidth, innerWidth } = await horizontalScroll(page);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    const boxes = await controls(page, [scene(s), "footer.hud"]);
    expect(boxes.length).toBeGreaterThan(0);
    expect(outside(boxes, PHONE_S.width)).toEqual([]);
    const small = boxes.filter((b) => b.width < 24 || b.height < 24).map((b) => `${b.name} ${b.width}x${b.height}`);
    expect(small).toEqual([]);
    const clip = await page.locator(scene(s)).evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    expect(clip.scrollHeight).toBeLessThanOrEqual(clip.clientHeight);
  }

  for (const p of populated) {
    test(`C24 360 ${p.route}`, async ({ page }) => {
      const s = SCENES.find((x) => x.route === p.route)!;
      await newDev(page);
      await openScene(page, s);
      await p.fill(page);
      await fitsPopulated(page, s);
    });
  }

  // C25 (added after verification round 2): LOJA with the equipped item selected shows REMOVER EQUIPAMENTO
  test("C25 360 /loja", async ({ page }) => {
    const s = SCENES[6];
    await newDev(page);
    await openScene(page, s);
    await page.locator('[data-card="cafe"]').click();
    const detail = page.getByRole("region", { name: "detalhe" });
    await detail.getByRole("button", { name: "COMPRAR E EQUIPAR" }).click();
    await expect(page.getByRole("status")).toHaveText("ITEM COMPRADO E EQUIPADO");
    await expect(detail.getByRole("button", { name: "REMOVER EQUIPAMENTO" })).toBeVisible();
    await fitsPopulated(page, s);
  });
});
