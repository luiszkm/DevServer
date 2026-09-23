import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BugFightPage from "@/app/(game)/bug-fight/page";
import type { Battle, BattleEvent, Catalog, Player } from "@/lib/types";
import { CATALOG, ENEMIES, COMMANDS, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { BattleScene } from "./BattleScene";

const battle = (o: Partial<Battle> = {}): Battle => ({
  region: "vila", enemyHp: 60, enemyHpMax: 60, sp: 50, spMax: 50, weakness: false, status: "active", ...o,
});

function renderScene(opts: { p?: Player; catalog?: Catalog; setPlayer?: (p: Player) => void } = {}) {
  const setPlayer = opts.setPlayer ?? vi.fn();
  render(
    <GameContext.Provider value={{ player: opts.p ?? player(), catalog: opts.catalog ?? CATALOG, setPlayer }}>
      <BattleScene />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const startWith = (b: Battle | null = battle(), p: Player = player()) => json(200, { battle: b, player: p });
const turn = (b: Battle | null, events: BattleEvent[], p: Player = player()) => json(200, { battle: b, player: p, events });
const command = (id: string) => document.querySelector(`[data-command="${id}"]`) as HTMLButtonElement;
const potion = (id: string) => document.querySelector(`[data-item="${id}"]`) as HTMLButtonElement;
const logText = () => screen.getByRole("log").textContent;

describe("BattleScene", () => {
  // C41
  it("starts and shows the enemy", async () => {
    const f = mockFetch({ "POST /api/me/battle": startWith() });
    renderScene();
    const enemy = await screen.findByLabelText("inimigo");
    expect(screen.getByText("ENCONTRO · VILA LOCALHOST")).toBeInTheDocument();
    expect(enemy).toHaveTextContent("NULL SLIME");
    expect(enemy).toHaveTextContent("Lv.3");
    expect(enemy).toHaveTextContent("HP 60/60");
    expect(enemy).toHaveTextContent("fraqueza: null-check");
    expect(f.calls("POST /api/me/battle")).toBe(1);
  });

  // C42
  it("lists commands with costs", async () => {
    const p = player({ skills: ["f1"] });
    mockFetch({ "POST /api/me/battle": startWith(battle({ sp: 11 }), p) });
    renderScene({ p });
    await screen.findByLabelText("inimigo");
    const ids = Array.from(document.querySelectorAll<HTMLElement>("[data-command]")).map((b) => b.dataset.command);
    expect(ids).toEqual(["fix", "test", "refactor", "plain", "f1", "rollback"]);
    const costs: Record<string, string> = { fix: "10 SP", test: "8 SP", refactor: "14 SP", plain: "grátis", f1: "12 SP", rollback: "grátis" };
    for (const [id, cost] of Object.entries(costs)) expect(command(id)).toHaveTextContent(cost);
    expect(command("fix")).toHaveTextContent("FIX");
    for (const id of ["refactor", "f1"]) expect(command(id)).toBeDisabled();
    for (const id of ["fix", "test", "plain", "rollback"]) expect(command(id)).toBeEnabled();
    expect(document.querySelector('[data-command="b2"]')).toBeNull();
  });

  // C43
  it("shows hero bars and potions", async () => {
    const p = player({ hp: 80, hpMax: 100, inventory: [{ item: "sp_potion", quantity: 2 }] });
    const f = mockFetch({
      "POST /api/me/battle": startWith(battle({ sp: 40 }), p),
      "POST /api/me/battle/items": turn(battle({ sp: 50 }), [{ type: "item", item: "sp_potion", stat: "sp", amount: 30 }], p),
    });
    renderScene({ p });
    const hero = await screen.findByLabelText("dev em combate");
    expect(hero).toHaveTextContent("HP 80/100");
    expect(hero).toHaveTextContent("SP 40/50");
    expect(potion("sp_potion")).toHaveTextContent("POÇÃO DE CACHE x2");
    expect(potion("hp_potion")).toHaveTextContent("POÇÃO DE MEMÓRIA x0");
    expect(potion("hp_potion")).toBeDisabled();
    await userEvent.click(potion("sp_potion"));
    await screen.findByText(/POÇÃO DE CACHE usada/);
    const [, init] = f.fn.mock.calls.find(([u]) => String(u) === "/api/me/battle/items")!;
    expect(JSON.parse(init!.body as string)).toEqual({ item: "sp_potion" });
  });

  // C44
  it("writes events to the log", async () => {
    const cases: [BattleEvent, string][] = [
      [{ type: "damage", command: "fix", amount: 20 }, "> FIX: 20 de dano"],
      [{ type: "damage", command: "fix", amount: 36, weakness: true }, "> FIX: 36 de dano (crítico!)"],
      [{ type: "heal", amount: 18 }, "> +18 HP"],
      [{ type: "weakness" }, '> fraqueza "null-check" exposta: próximo golpe é crítico.'],
      [{ type: "shield" }, "> postura de defesa ativada: o próximo golpe é reduzido pela metade."],
      [{ type: "sp", amount: 3 }, "> +3 SP recuperado."],
      [{ type: "item", item: "hp_potion", stat: "hp", amount: 40 }, "> POÇÃO DE MEMÓRIA usada: +40 HP"],
      [{ type: "counter", amount: 9 }, "< NULL SLIME devolve um stack trace: -9 HP"],
      [{ type: "counter", amount: 5, blocked: true }, "< escudo absorve parte do golpe: -5 HP"],
      [{ type: "victory" }, "[OK] NULL SLIME resolvido. exceção tratada."],
      [{ type: "reward", xp: 90, coins: 40, gems: 1, levelsGained: 0 }, "+90 XP · +40 coins · +1 gems"],
      [{ type: "reward", xp: 90, coins: 40, gems: 1, levelsGained: 1 }, "+90 XP · +40 coins · +1 gems · +1 nível!"],
      [{ type: "drop", item: "null_shard" }, "+1 FRAGMENTO NULL · dropou!"],
      [{ type: "defeat" }, "> você caiu. respawn na Vila Localhost com HP cheio."],
      [{ type: "fled" }, "> ROLLBACK executado. de volta ao mapa."],
    ];
    const queue = cases.map(([e]) => e);
    mockFetch({
      "POST /api/me/battle": startWith(),
      "POST /api/me/battle/commands": () => turn(battle(), [queue.shift()!]),
    });
    renderScene();
    await screen.findByLabelText("inimigo");
    for (const [, text] of cases) {
      await userEvent.click(command("plain"));
      const lines = Array.from(screen.getByRole("log").children).map((c) => c.textContent);
      expect(lines[lines.length - 1]).toBe(text);
    }
    expect(screen.getByRole("log").children).toHaveLength(6);
  });

  // C45
  it("turn updates player and battle", async () => {
    const after = player({ hp: 93 });
    mockFetch({
      "POST /api/me/battle": startWith(),
      "POST /api/me/battle/commands": turn(battle({ enemyHp: 40, sp: 45 }), [{ type: "damage", command: "fix", amount: 20 }, { type: "counter", amount: 7 }], after),
    });
    const { setPlayer } = renderScene();
    await userEvent.click(await screen.findByRole("button", { name: /FIX/ }));
    expect(await screen.findByText(/HP 40\/60/)).toBeInTheDocument();
    expect(screen.getByLabelText("dev em combate")).toHaveTextContent("SP 45/50");
    expect(setPlayer).toHaveBeenLastCalledWith(after);
  });

  // C46
  it("won shows RESOLVIDO and new encounter", async () => {
    let starts = 0;
    const f = mockFetch({
      "POST /api/me/battle": () => startWith(battle(starts++ === 0 ? { enemyHp: 0, status: "won" } : {})),
    });
    renderScene();
    expect(await screen.findByText("RESOLVIDO")).toBeInTheDocument();
    for (const id of ["fix", "plain"]) expect(command(id)).toBeDisabled();
    expect(potion("sp_potion")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "NOVO ENCONTRO" }));
    expect(await screen.findByText(/HP 60\/60/)).toBeInTheDocument();
    expect(screen.queryByText("RESOLVIDO")).not.toBeInTheDocument();
    expect(f.calls("POST /api/me/battle")).toBe(2);
  });

  // C47
  it.each([
    ["fled", "> ROLLBACK executado. de volta ao mapa."],
    ["defeat", "> você caiu. respawn na Vila Localhost com HP cheio."],
  ])("ended shows new encounter (%s)", async (type, text) => {
    mockFetch({ "POST /api/me/battle": startWith(), "POST /api/me/battle/commands": turn(null, [{ type: type as BattleEvent["type"] }]) });
    renderScene();
    await userEvent.click(await screen.findByRole("button", { name: /ROLLBACK/ }));
    expect(await screen.findAllByText("ENCONTRO ENCERRADO")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "NOVO ENCONTRO" })).toBeInTheDocument();
    expect(logText()).toContain(text);
    expect(screen.queryByLabelText("inimigo")).not.toBeInTheDocument();
    expect(command("fix")).toBeDisabled();
  });

  // C48
  it("disables actions while a turn is pending", async () => {
    mockFetch({ "POST /api/me/battle": startWith(), "POST /api/me/battle/commands": () => new Promise<Response>(() => {}) });
    renderScene();
    await userEvent.click(await screen.findByRole("button", { name: /FIX/ }));
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-command], [data-item]")) expect(b).toBeDisabled();
  });

  // C49
  it.each([
    ["not_enough_sp", () => json(409, { error: { code: "not_enough_sp", message: "SP insuficiente. use uma poção" } }), "> SP insuficiente. use uma poção"],
    ["no body", () => new Response(null, { status: 502 }), "> erro no combate"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "> SERVIDOR FORA DO AR"],
  ])("turn error goes to the log (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/battle": startWith(), "POST /api/me/battle/commands": failure as () => Response });
    const setPlayer = vi.fn();
    renderScene({ setPlayer });
    await screen.findByLabelText("inimigo");
    setPlayer.mockClear();
    await userEvent.click(command("fix"));
    await screen.findByText(text);
    expect(screen.getByLabelText("inimigo")).toHaveTextContent("HP 60/60");
    expect(screen.getByLabelText("dev em combate")).toHaveTextContent("SP 50/50");
    expect(setPlayer).not.toHaveBeenCalled();
    expect(command("fix")).toBeEnabled();
  });

  // C50
  it("loading and load failure (pending)", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderScene();
    expect(screen.getByText("CARREGANDO...")).toBeInTheDocument();
  });

  it.each([
    ["500", () => json(500, { error: { code: "internal", message: "x" } })],
    ["network", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("loading and load failure (%s)", async (_name, failure) => {
    const f = mockFetch({ "POST /api/me/battle": failure as () => Response });
    renderScene();
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "TENTAR DE NOVO" }));
    await screen.findByText("SERVIDOR FORA DO AR");
    expect(f.calls("POST /api/me/battle")).toBe(2);
  });

  // C51
  it("enemy and commands come from catalog", async () => {
    const catalog = {
      ...CATALOG,
      enemies: ENEMIES.map((e) => (e.region === "vila" ? { ...e, name: "BUG DE TESTE" } : e)),
      commands: COMMANDS.map((c) => (c.id === "fix" ? { ...c, label: "PATCH" } : c)),
    };
    mockFetch({ "POST /api/me/battle": startWith() });
    renderScene({ catalog });
    expect(await screen.findByLabelText("inimigo")).toHaveTextContent("BUG DE TESTE");
    expect(command("fix")).toHaveTextContent("PATCH");
    expect(logText()).toContain("> um BUG DE TESTE apareceu em VILA LOCALHOST!");
  });

  // C52
  it("bug-fight page renders the scene", async () => {
    mockFetch({ "POST /api/me/battle": startWith() });
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer: vi.fn() }}>
        <BugFightPage />
      </GameContext.Provider>,
    );
    expect(await screen.findByLabelText("inimigo")).toBeInTheDocument();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
  });
});
