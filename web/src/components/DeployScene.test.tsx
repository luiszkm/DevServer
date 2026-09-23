import { act, render, screen, within } from "@testing-library/react";
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
});
