import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeployPage from "@/app/(game)/deploy/page";
import type { Catalog, DeployJob, Player } from "@/lib/types";
import { CATALOG, DEPLOY_LEVELS, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { DeployScene } from "./DeployScene";

const T0 = Date.parse("2026-01-01T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");
const MIN = 60_000;

function job(type: string, level: number, startedMinAgo: number, minutes: number, serverNow = T0): DeployJob {
  const started = serverNow - startedMinAgo * MIN;
  return { type, level, startedAt: iso(started), endsAt: iso(started + minutes * MIN), ready: startedMinAgo >= minutes };
}

function list(deploys: DeployJob[], serverTime = T0) {
  return json(200, { serverTime: iso(serverTime), deploys });
}

function renderScene(opts: { p?: Player; catalog?: Catalog; setPlayer?: (p: Player) => void } = {}) {
  const setPlayer = opts.setPlayer ?? vi.fn();
  render(
    <GameContext.Provider value={{ player: opts.p ?? player(), catalog: opts.catalog ?? CATALOG, setPlayer }}>
      <DeployScene />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const panel = () => screen.getByRole("region", { name: "painel de deploy" });
const typeButton = (name: string) => screen.getByRole("button", { name });
const levelButton = (n: number) => within(panel()).getByRole("button", { name: `NV.${n}` });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("DeployScene", () => {
  // C13
  it("type statuses", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("frontend", 1, 1, 15), job("mobile", 1, 20, 15), job("database", 1, 15, 15)]) });
    renderScene();
    await screen.findByText("14:00 restante");
    const names = screen.getAllByRole("button").filter((b) => b.hasAttribute("data-type")).map((b) => b.getAttribute("data-type"));
    expect(names).toEqual(["backend", "frontend", "mobile", "database", "microservices"]);
    expect(typeButton("BACKEND")).toHaveTextContent("ocioso");
    for (const t of CATALOG.deployTypes) {
      expect(screen.getByRole("button", { name: t.name })).toHaveTextContent(t.name);
      expect(screen.getByRole("button", { name: t.name }).textContent).not.toContain(t.glyph);
    }
    expect(typeButton("FRONTEND")).toHaveTextContent("14:00 restante");
    expect(typeButton("MOBILE")).toHaveTextContent("pronto p/ coletar");
    expect(typeButton("BANCO DE DADOS")).toHaveTextContent("pronto p/ coletar");
  });

  // C14
  it("idle shows levels", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene({ p: player({ level: 1 }) });
    await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
    const times = ["15min", "30min", "1h", "3h", "6h"];
    const rewards = ["+80XP · +40coins", "+150XP · +70coins · +1gems", "+260XP · +110coins · +2gems", "+420XP · +180coins · +4gems", "+700XP · +300coins · +8gems"];
    for (let n = 1; n <= 5; n++) {
      expect(levelButton(n)).toHaveTextContent(times[n - 1]);
      expect(levelButton(n)).toHaveTextContent(rewards[n - 1]);
    }
    expect(levelButton(1)).toBeEnabled();
    for (const [n, min] of [[2, 3], [3, 6], [4, 10], [5, 15]]) {
      expect(levelButton(n)).toBeDisabled();
      expect(levelButton(n)).toHaveTextContent(`NÍVEL ${min}`);
    }
  });

  // C15
  it.each([
    [10, "LINT"],
    [24, "LINT"],
    [25, "BUILD"],
    [30, "BUILD"],
    [50, "TEST"],
    [60, "TEST"],
    [75, "SHIP"],
    [90, "SHIP"],
  ])("running shows stage and remaining (%i%%)", async (pct, stage) => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 3, (60 * pct) / 100, 60)]) });
    renderScene();
    expect(await within(panel()).findByText(stage)).toBeInTheDocument();
    expect(within(panel()).getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(pct));
  });

  it("running shows stage and remaining (formats)", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 4, 0, 180), job("frontend", 1, 10, 15)]) });
    renderScene();
    expect(await within(panel()).findByText("3:00:00")).toBeInTheDocument();
    await userEvent.click(typeButton("FRONTEND"));
    expect(within(panel()).getByText("05:00")).toBeInTheDocument();
  });

  // C16
  it("countdown ticks without fetch", async () => {
    const f = mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 0, 15)]) });
    renderScene();
    expect(await within(panel()).findByText("15:00")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(within(panel()).getByText("14:57")).toBeInTheDocument();
    expect(typeButton("BACKEND")).toHaveTextContent("14:57 restante");
    expect(f.fn).toHaveBeenCalledTimes(1);
  });

  // C17
  it("pending shows CARREGANDO", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderScene();
    expect(within(panel()).getByText("CARREGANDO...")).toBeInTheDocument();
  });

  it("shows blank statuses while the list loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderScene();
    for (const t of CATALOG.deployTypes) {
      const btn = screen.getByRole("button", { name: t.name });
      expect(btn).not.toHaveTextContent(/ocioso|restante|pronto/);
    }
  });

  // C18
  it.each([
    ["500", () => json(500, { error: { code: "internal", message: "x" } })],
    ["network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("list failure shows retry (%s)", async (_name, failure) => {
    const f = mockFetch({ "GET /api/me/deploys": failure as () => Response });
    renderScene();
    expect(await within(panel()).findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    await userEvent.click(within(panel()).getByRole("button", { name: "TENTAR DE NOVO" }));
    await within(panel()).findByText("SERVIDOR FORA DO AR");
    expect(f.calls("GET /api/me/deploys")).toBe(2);
  });

  // C19
  it("levels come from catalog", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    const levels = DEPLOY_LEVELS.map((l) => (l.level === 1 ? { ...l, minutes: 7, xp: 5 } : l));
    renderScene({ catalog: { ...CATALOG, deployLevels: levels } });
    await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
    expect(levelButton(1)).toHaveTextContent("7min");
    expect(levelButton(1)).toHaveTextContent("+5XP · +40coins");
  });

  // C20
  it("uses server time", async () => {
    const serverNow = T0 + 10 * MIN;
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 10, 15, serverNow)], serverNow) });
    renderScene();
    expect(await screen.findByText("05:00 restante")).toBeInTheDocument();
  });

  // C21
  it("start posts and logs", async () => {
    const started = job("backend", 1, 0, 15);
    const newPlayer = player({ coins: 101 });
    const f = mockFetch({
      "GET /api/me/deploys": list([]),
      "POST /api/me/deploys": json(201, { player: newPlayer, deploy: started, serverTime: iso(T0) }),
    });
    const { setPlayer } = renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" }));
    expect(await within(panel()).findByText("LINT")).toBeInTheDocument();
    const [, init] = f.fn.mock.calls.find(([u, i]) => String(u) === "/api/me/deploys" && i?.method === "POST")!;
    expect(JSON.parse(init!.body as string)).toEqual({ type: "backend", level: 1 });
    expect(setPlayer).toHaveBeenCalledWith(newPlayer);
    expect(screen.getByRole("log")).toHaveTextContent("$ devserver deploy --tipo=backend --nivel=1");
  });

  it("start posts the chosen level", async () => {
    const f = mockFetch({
      "GET /api/me/deploys": list([]),
      "POST /api/me/deploys": json(201, { player: player(), deploy: job("database", 2, 0, 30), serverTime: iso(T0) }),
    });
    renderScene({ p: player({ level: 3 }) });
    await userEvent.click(typeButton("BANCO DE DADOS"));
    await userEvent.click(await within(panel()).findByRole("button", { name: "NV.2" }));
    expect(levelButton(2)).toHaveAttribute("aria-pressed", "true");
    expect(levelButton(1)).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(within(panel()).getByRole("button", { name: "INICIAR DEPLOY" }));
    await within(panel()).findByText("LINT");
    const [, init] = f.fn.mock.calls.find(([u, i]) => String(u) === "/api/me/deploys" && i?.method === "POST")!;
    expect(JSON.parse(init!.body as string)).toEqual({ type: "database", level: 2 });
  });

  // C22
  it.each([
    ["deploy_running", () => json(409, { error: { code: "deploy_running", message: "já existe um deploy deste tipo em andamento" } }), "já existe um deploy deste tipo em andamento"],
    ["no body", () => new Response(null, { status: 502 }), "erro ao iniciar deploy"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
  ])("start error shows message (%s)", async (_name, failure, text) => {
    mockFetch({ "GET /api/me/deploys": list([]), "POST /api/me/deploys": failure as () => Response });
    const { setPlayer } = renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" }));
    expect(await within(panel()).findByRole("alert")).toHaveTextContent(text);
    expect(typeButton("BACKEND")).toHaveTextContent("ocioso");
    expect(setPlayer).not.toHaveBeenCalled();
  });

  it("disables INICIAR DEPLOY while the start is in flight", async () => {
    mockFetch({ "GET /api/me/deploys": list([]), "POST /api/me/deploys": () => new Promise<Response>(() => {}) });
    renderScene();
    const btn = await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  // C23
  it("deploy page renders the scene", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer: vi.fn() }}>
        <DeployPage />
      </GameContext.Provider>,
    );
    expect(screen.getByText("PIPELINES DE DEPLOY")).toBeInTheDocument();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
    await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
  });

  // C35
  it("claim updates player and logs", async () => {
    const newPlayer = player({ xp: 80, coins: 140 });
    mockFetch({
      "GET /api/me/deploys": list([job("backend", 1, 15, 15)]),
      "POST /api/me/deploys/backend/claim": json(200, { player: newPlayer, reward: { xp: 80, coins: 40, gems: 0, levelsGained: 0 } }),
    });
    const { setPlayer } = renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" }));
    expect(await screen.findByRole("log")).toHaveTextContent("> release de BACKEND nível 1 publicada.");
    expect(setPlayer).toHaveBeenCalledWith(newPlayer);
    expect(typeButton("BACKEND")).toHaveTextContent("ocioso");
    expect(within(panel()).getByRole("button", { name: "INICIAR DEPLOY" })).toBeInTheDocument();
  });

  // C36
  it("claim disabled until ready", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 14, 15)]) });
    renderScene();
    const btn = await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" });
    expect(btn).toBeDisabled();
    act(() => vi.advanceTimersByTime(MIN));
    expect(btn).toBeEnabled();
    expect(within(panel()).getByText("PRONTO PARA COLETAR")).toBeInTheDocument();
    expect(within(panel()).getByText("CONCLUÍDO")).toBeInTheDocument();
    expect(within(panel()).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("disables COLETAR RECOMPENSA while the claim is in flight", async () => {
    mockFetch({
      "GET /api/me/deploys": list([job("backend", 1, 15, 15)]),
      "POST /api/me/deploys/backend/claim": () => new Promise<Response>(() => {}),
    });
    renderScene();
    const btn = await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  // C37
  it.each([
    ["deploy_not_ready", () => json(409, { error: { code: "deploy_not_ready", message: "o deploy ainda não terminou" } }), "o deploy ainda não terminou"],
    ["no body", () => new Response(null, { status: 502 }), "erro ao coletar"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
  ])("claim error shows message (%s)", async (_name, failure, text) => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 15, 15)]), "POST /api/me/deploys/backend/claim": failure as () => Response });
    const { setPlayer } = renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" }));
    expect(await within(panel()).findByRole("alert")).toHaveTextContent(text);
    expect(within(panel()).getByRole("button", { name: "COLETAR RECOMPENSA" })).toBeInTheDocument();
    expect(setPlayer).not.toHaveBeenCalled();
  });

  it("keeps only the last 8 log lines", async () => {
    let n = 0;
    mockFetch({
      "GET /api/me/deploys": list([]),
      "POST /api/me/deploys": () => json(201, { player: player(), deploy: job(["backend", "frontend", "mobile", "database", "microservices"][n++], 1, 0, 15), serverTime: iso(T0) }),
    });
    renderScene();
    for (const name of ["BACKEND", "FRONTEND", "MOBILE", "BANCO DE DADOS"]) {
      await userEvent.click(typeButton(name));
      await userEvent.click(await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" }));
      await within(panel()).findByText("LINT");
    }
    const lines = screen.getByRole("log").children;
    expect(lines).toHaveLength(8);
    expect(screen.getByRole("log")).not.toHaveTextContent("v0.4.2-alpha");
  });

  // shop-inventory-avatar C42
  it("boost button", async () => {
    const boost = /^ACELERAR|^SEM ACELERADORES/;
    const f = mockFetch({
      "GET /api/me/deploys": list([job("backend", 2, 0, 30), job("frontend", 1, 15, 15)]),
      "POST /api/me/deploys/backend/boost": () => new Promise<Response>(() => {}),
    });
    renderScene({ p: player({ level: 3, inventory: [{ item: "boost_deploy", quantity: 1 }] }) });
    const btn = await within(panel()).findByRole("button", { name: "ACELERAR (-15min) · 1 disponíveis" });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(f.calls("POST /api/me/deploys/backend/boost")).toBe(1);

    await userEvent.click(typeButton("FRONTEND"));
    expect(within(panel()).getByText("PRONTO PARA COLETAR")).toBeInTheDocument();
    expect(within(panel()).queryByRole("button", { name: boost })).not.toBeInTheDocument();
  });

  it("boost button (no boosters)", async () => {
    const f = mockFetch({ "GET /api/me/deploys": list([job("backend", 2, 0, 30)]) });
    renderScene({ p: player({ level: 3, inventory: [] }) });
    const btn = await within(panel()).findByRole("button", { name: "SEM ACELERADORES · veja a Loja" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(f.fn).toHaveBeenCalledTimes(1);
  });

  // shop-inventory-avatar C43
  it("boost updates remaining", async () => {
    const running = job("backend", 2, 1, 30);
    const boosted = { ...running, endsAt: iso(Date.parse(running.endsAt) - 15 * MIN) };
    const updated = player({ level: 3, inventory: [] });
    mockFetch({
      "GET /api/me/deploys": list([running]),
      "POST /api/me/deploys/backend/boost": json(200, { deploy: boosted, player: updated, serverTime: iso(T0) }),
    });
    const { setPlayer } = renderScene({ p: player({ level: 3, inventory: [{ item: "boost_deploy", quantity: 1 }] }) });
    await screen.findByText("29:00 restante");
    expect(typeButton("BACKEND")).toHaveTextContent("29:00 restante");
    await userEvent.click(within(panel()).getByRole("button", { name: "ACELERAR (-15min) · 1 disponíveis" }));
    expect(await screen.findByText("14:00 restante")).toBeInTheDocument();
    expect(typeButton("BACKEND")).toHaveTextContent("14:00 restante");
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  // shop-inventory-avatar C48
  it.each([
    ["409 with message", () => json(409, { error: { code: "no_item", message: "você não tem este item" } }), "você não tem este item"],
    ["500 without body", () => new Response(null, { status: 500 }), "erro ao acelerar"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
  ])("boost errors (%s)", async (_name, failure, text) => {
    mockFetch({
      "GET /api/me/deploys": list([job("backend", 2, 1, 30)]),
      "POST /api/me/deploys/backend/boost": failure as () => Response,
    });
    renderScene({ p: player({ level: 3, inventory: [{ item: "boost_deploy", quantity: 1 }] }) });
    await screen.findByText("29:00 restante");
    await userEvent.click(within(panel()).getByRole("button", { name: "ACELERAR (-15min) · 1 disponíveis" }));
    expect(await within(panel()).findByText(text)).toBeInTheDocument();
    expect(panel().querySelector(".deploy-remaining")).toHaveTextContent("29:00");
    expect(typeButton("BACKEND")).toHaveTextContent("29:00 restante");
  });

  // game-art C21
  it("deploy art", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene();
    await screen.findAllByText("ocioso");
    for (const t of CATALOG.deployTypes) {
      const button = screen.getByRole("button", { name: t.name });
      expect(button).toHaveAccessibleName(t.name);
      const img = button.querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/deploy-${t.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      const name = button.querySelector(".deploy-type-name")!;
      expect(name.textContent).toBe(t.name);
      expect(button.textContent).not.toContain(t.glyph);
      // the icon comes before the name
      expect(name.firstElementChild!.contains(img)).toBe(true);
    }
    const backend = typeButton("BACKEND");
    fireEvent.error(backend.querySelector("img")!);
    expect(backend.querySelector("img")).toBeNull();
    expect(backend.querySelector(".deploy-type-name")).toHaveTextContent("$_");
    expect(backend).toHaveAccessibleName("BACKEND");
  });
});

function expectIcon(img: Element | null | undefined, src: string, width = 16) {
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe(String(width));
}

describe("DeployScene assets", () => {
  // assets C20
  it("lock icon", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene({ p: player({ level: 1 }) });
    await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
    const tag = levelButton(2).querySelector(".deploy-locked")!;
    expect(tag.textContent).toBe("NÍVEL 3");
    expectIcon(tag.firstElementChild, "/art/icon/ic-lock.png");
    expect(tag.firstChild).toBe(tag.firstElementChild);
    expect(levelButton(1).querySelector('img[src="/art/icon/ic-lock.png"]')).toBeNull();
  });
});

function expectLoadingFx(text: HTMLElement) {
  const fx = text.querySelector("span.fx-loading") as HTMLElement;
  expect(fx).not.toBeNull();
  expect(fx.getAttribute("aria-hidden")).toBe("true");
  expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/loading.png)");
}

describe("DeployScene world pieces", () => {
  // assets C30
  it("loading fx", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderScene();
    expectLoadingFx(within(panel()).getByText("CARREGANDO..."));
  });

  // assets C32
  it("chest closed on the claim button", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 15, 15)]) });
    renderScene();
    const btn = await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" });
    const img = btn.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/art/sprite/extra-bau.png");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("width")).toBe("32");
  });

  // assets C33
  it("chest opens after a 200 claim", async () => {
    mockFetch({
      "GET /api/me/deploys": list([job("backend", 1, 15, 15)]),
      "POST /api/me/deploys/backend/claim": json(200, { player: player(), reward: { xp: 80, coins: 40, gems: 0, levelsGained: 0 } }),
    });
    renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" }));
    await waitFor(() => expect(document.querySelector('img[src="/art/sprite/extra-bau-aberto.png"]')).not.toBeNull());
    const open = document.querySelector('img[src="/art/sprite/extra-bau-aberto.png"]')!;
    expect(open.getAttribute("alt")).toBe("");
    expect(open.getAttribute("width")).toBe("64");
    const fx = document.querySelector('[data-fx="collect"]') as HTMLElement;
    expect(fx).not.toBeNull();
    expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/collect.png)");
  });

  it("chest opens only on success (claim error)", async () => {
    mockFetch({
      "GET /api/me/deploys": list([job("backend", 1, 15, 15)]),
      "POST /api/me/deploys/backend/claim": json(409, { error: { code: "not_ready", message: "deploy ainda rodando" } }),
    });
    renderScene();
    await userEvent.click(await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" }));
    expect(await screen.findByText("deploy ainda rodando")).toBeInTheDocument();
    expect(document.querySelector('img[src="/art/sprite/extra-bau-aberto.png"]')).toBeNull();
    expect(document.querySelector('[data-fx="collect"]')).toBeNull();
  });
});

describe("DeployScene scene", () => {
  // assets C39
  it("scene background", () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene();
  const section = document.querySelector("section.scene") as HTMLElement;
    expect(section.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/scene-dia.png)");
  });
});

describe("DeployScene hero anim", () => {
  // assets C48
  const hero = () => within(panel()).getByRole("img", { name: "herói" });
  it("hero anim: interact while the job runs", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 5, 15)]) });
    renderScene();
    await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" });
    expect(hero().dataset.anim).toBe("interact");
  });

  it("hero anim: idle when the job is ready", async () => {
    mockFetch({ "GET /api/me/deploys": list([job("backend", 1, 15, 15)]) });
    renderScene();
    await within(panel()).findByRole("button", { name: "COLETAR RECOMPENSA" });
    expect(hero().dataset.anim).toBe("idle");
  });
});

function expectFirstIcon(el: Element | null | undefined, src: string) {
  const img = el?.firstElementChild;
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe("16");
  expect(el!.firstChild).toBe(img);
}

describe("DeployScene applied assets", () => {
  // assets-apply C11
  it("wood header", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene();
    expect(document.querySelector(".deploy-head")).toHaveClass("panel-wood");
  });

  // assets-apply C12 / C13
  it("button icon on INICIAR DEPLOY and generic icon on the panel title", async () => {
    mockFetch({ "GET /api/me/deploys": list([]) });
    renderScene();
    const go = await within(panel()).findByRole("button", { name: "INICIAR DEPLOY" });
    expectFirstIcon(go, "/art/icon/btn-deploy.png");
    expectFirstIcon(panel().querySelector(".deploy-title"), "/art/icon/ic-laptop.png");
    expect(panel().querySelector(".deploy-title")!.textContent).toBe("BACKEND");
  });
});
