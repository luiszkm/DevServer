import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BugFightPage from "@/app/(game)/bug-fight/page";
import { resolveLook } from "@/lib/avatar";
import type { Battle, BattleEvent, Catalog, Player } from "@/lib/types";
import { CATALOG, ENEMIES, COMMANDS, REGIONS, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { BattleScene } from "./BattleScene";

// A battle's enemy defaults to its region's original enemy, whose id is the region (assets-apply door 3).
const battle = (o: Partial<Battle> = {}): Battle => ({
  enemy: o.region ?? "vila", region: "vila", enemyHp: 60, enemyHpMax: 60, sp: 50, spMax: 50, weakness: false, status: "active", ...o,
});

// Stubs the OS "reduce motion" setting the scene reads to decide between playback and an instant turn.
const motion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)", media: q }));

function renderScene(opts: { p?: Player; catalog?: Catalog; setPlayer?: (p: Player) => void } = {}) {
  const setPlayer = opts.setPlayer ?? vi.fn();
  const view = render(
    <GameContext.Provider value={{ player: opts.p ?? player(), catalog: opts.catalog ?? CATALOG, setPlayer }}>
      <BattleScene />
    </GameContext.Provider>,
  );
  return { setPlayer, unmount: view.unmount };
}

const startWith = (b: Battle | null = battle(), p: Player = player()) => json(200, { battle: b, player: p });
const turn = (b: Battle | null, events: BattleEvent[], p: Player = player()) => json(200, { battle: b, player: p, events });
const command = (id: string) => document.querySelector(`[data-command="${id}"]`) as HTMLButtonElement;
const potion = (id: string) => document.querySelector(`[data-item="${id}"]`) as HTMLButtonElement;
const logText = () => screen.getByRole("log").textContent;

// Every region's enemy (api/catalog/combat.json), for the art checks that walk all six.
const ALL_ENEMIES: Catalog["enemies"] = [
  ...ENEMIES,
  { id: "mercado", region: "mercado", name: "PACOTE MALICIOSO", level: 7, hp: 85, sp: 60, weakness: "versão não travada", drop: "corrupt_dep", glyph: "[!pkg]" },
  { id: "caverna", region: "caverna", name: "EXCEÇÃO SELVAGEM", level: 10, hp: 110, sp: 70, weakness: "catch ausente", drop: "wild_trace", glyph: "{!!}" },
  { id: "torre", region: "torre", name: "RACE CONDITION", level: 15, hp: 160, sp: 85, weakness: "mutex ausente", drop: "race_core", glyph: "//=//" },
  { id: "nuvem", region: "nuvem", name: "MEMORY LEAK ANCESTRAL", level: 22, hp: 220, sp: 100, weakness: "garbage collector", drop: "memory_crystal", glyph: "^^^^" },
];
const EVERY_ENEMY: Catalog = { ...CATALOG, enemies: ALL_ENEMIES };
const sprite = () => document.querySelector(".battle-sprite") as HTMLElement;

describe("BattleScene", () => {
  // These prove what a turn leaves behind; with reduced motion the turn lands at once. Playback has its own describe.
  beforeEach(() => motion(true));

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
    for (const c of COMMANDS.filter((c) => !c.skill || c.skill === "f1")) {
      expect(command(c.id)).toHaveTextContent(c.label);
      expect(command(c.id)).toHaveTextContent(c.hint);
    }
    for (const id of ["refactor", "f1"]) expect(command(id)).toBeDisabled();
    for (const id of ["fix", "test", "plain", "rollback"]) expect(command(id)).toBeEnabled();
    expect(document.querySelector('[data-command="b2"]')).toBeNull();
  });

  // C57
  it("SP equal to cost pays", async () => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ sp: 10 })) });
    renderScene();
    await screen.findByLabelText("inimigo");
    for (const id of ["fix", "test"]) expect(command(id)).toBeEnabled();
    expect(command("refactor")).toBeDisabled();
  });

  // C58
  it("active fight hides new encounter", async () => {
    mockFetch({ "POST /api/me/battle": startWith() });
    renderScene();
    await screen.findByLabelText("inimigo");
    expect(screen.queryByRole("button", { name: "NOVO ENCONTRO" })).toBeNull();
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

  // shop-inventory-avatar C44
  it.each(["neon", "default"])("hero sprite wears skin (%s)", async (skin) => {
    const p = player({ skin, skins: ["default", "neon"] });
    mockFetch({ "POST /api/me/battle": startWith(battle(), p) });
    renderScene({ p });
    const hero = await screen.findByLabelText("herói na arena");
    const img = within(hero).getByRole("img", { name: "herói" });
    expect(img.dataset.look).toBe(resolveLook(p, CATALOG).key);
    expect(img.dataset.look!.includes(">")).toBe(skin !== "default");
  });

  // shop-inventory-avatar C49
  it("potions exclude the booster", async () => {
    const p = player({ inventory: [{ item: "boost_deploy", quantity: 1 }] });
    mockFetch({ "POST /api/me/battle": startWith(battle(), p) });
    renderScene({ p });
    await screen.findByLabelText("dev em combate");
    const items = [...document.querySelectorAll<HTMLButtonElement>("[data-item]")];
    expect(items.map((b) => b.dataset.item)).toEqual(["sp_potion", "hp_potion"]);
    expect(items[0]).toHaveTextContent("POÇÃO DE CACHE");
    expect(items[1]).toHaveTextContent("POÇÃO DE MEMÓRIA");
    expect(document.querySelector('[data-item="boost_deploy"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /ACELERADOR DE DEPLOY/ })).not.toBeInTheDocument();
  });

  // game-art C7
  it.each([
    ["vila", "NULL SLIME", 128],
    ["torre", "RACE CONDITION", 144],
    ["nuvem", "MEMORY LEAK ANCESTRAL", 128],
  ])("enemy sprite (%s)", async (region, name, size) => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ region })) });
    renderScene({ catalog: EVERY_ENEMY });
    await screen.findByLabelText("inimigo");
    const img = within(sprite()).getByRole("img");
    expect(img.getAttribute("src")).toBe(`/art/sprite/enemy-${region}.png`);
    expect(img.getAttribute("alt")).toBe(name);
    expect(img.getAttribute("width")).toBe(String(size));
    expect(img.getAttribute("height")).toBe(String(size));
    expect(img).toHaveClass("pixelated");
  });

  it("enemy sprite falls back to the glyph", async () => {
    mockFetch({
      "POST /api/me/battle": startWith(),
      "POST /api/me/battle/commands": turn(battle({ enemyHp: 50 }), [{ type: "damage", command: "fix", amount: 10 }]),
    });
    renderScene({ catalog: EVERY_ENEMY });
    await screen.findByLabelText("inimigo");
    fireEvent.error(sprite().querySelector("img")!);
    expect(sprite().querySelector("img")).toBeNull();
    expect(sprite()).toHaveTextContent("(0x0)");
    // the glyph stays through the next turn's render
    await userEvent.click(command("fix"));
    await screen.findByText(/HP 50\/60/);
    expect(sprite().querySelector("img")).toBeNull();
    expect(sprite()).toHaveTextContent("(0x0)");
  });

  // game-art C8
  it.each(REGIONS.map((r) => r.id))("battle background (%s)", async (region) => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ region })) });
    renderScene({ catalog: EVERY_ENEMY });
    await screen.findByLabelText("inimigo");
    const scene = document.querySelector("section.battle") as HTMLElement;
    expect(scene.style.backgroundImage.replace(/"/g, "")).toBe(`url(/art/background/battle-${region}.png)`);
  });

  // game-art C9
  it("potion art", async () => {
    const p = player({ inventory: [{ item: "sp_potion", quantity: 2 }] });
    mockFetch({ "POST /api/me/battle": startWith(battle(), p) });
    renderScene({ p });
    await screen.findByLabelText("dev em combate");
    for (const [id, glyph] of [["sp_potion", "++"], ["hp_potion", "HP+"]]) {
      const img = potion(id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/item-${id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(potion(id).textContent).not.toContain(glyph);
    }
    fireEvent.error(potion("hp_potion").querySelector("img")!);
    expect(potion("hp_potion").querySelector("img")).toBeNull();
    expect(potion("hp_potion")).toHaveTextContent("HP+");
    expect(potion("sp_potion").querySelector("img")).not.toBeNull();
  });
});

describe("BattleScene turn playback", () => {
  beforeEach(() => motion(false));
  afterEach(() => vi.useRealTimers());

  const lines = () => Array.from(screen.getByRole("log").children).map((c) => c.textContent);
  const heroActor = () => screen.getByLabelText("herói na arena");
  const enemyActor = () => sprite().parentElement!;
  const fx = () => document.querySelector<HTMLElement>(".battle-fx");
  const float = () => document.querySelector<HTMLElement>(".battle-float");

  async function fightOneTurn(events: BattleEvent[], after: Battle | null, p = player({ hp: 100, hpMax: 100 })) {
    const setPlayer = vi.fn();
    const next = player({ hp: 91, hpMax: 100 });
    mockFetch({ "POST /api/me/battle": startWith(battle(), p), "POST /api/me/battle/commands": turn(after, events, next) });
    const view = renderScene({ p, setPlayer });
    await screen.findByLabelText("inimigo");
    setPlayer.mockClear();
    // Faked only now: RTL's findBy* polls with real timers.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fireEvent.click(command("fix"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    return { ...view, setPlayer, next };
  }

  // assets C47: the beat on stage picks the hero's animation
  const heroAnim = () => within(heroActor()).getByRole("img", { name: "herói" }).dataset.anim;
  it.each<[string, BattleEvent[], string]>([
    ["lunge", [{ type: "damage", command: "fix", amount: 20 }], "run"],
    ["cast", [{ type: "heal", amount: 10 }], "interact"],
    ["hit", [{ type: "counter", amount: 9 }], "idle"],
    ["fall", [{ type: "defeat" }], "idle"],
    ["flee", [{ type: "fled" }], "idle"],
  ])("hero anim on beat %s", async (_beat, events, anim) => {
    await fightOneTurn(events, battle({ enemyHp: 40 }));
    expect(heroAnim()).toBe(anim);
  });

  it("hero anim with no beat is idle", async () => {
    mockFetch({ "POST /api/me/battle": startWith(battle()) });
    renderScene();
    await screen.findByLabelText("inimigo");
    expect(heroAnim()).toBe("idle");
  });

  it("hero anim when the battle is won is jump", async () => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ status: "won", enemyHp: 0 })) });
    renderScene();
    await screen.findByLabelText("inimigo");
    expect(heroAnim()).toBe("jump");
  });

  it("plays the turn one event at a time", async () => {
    const { setPlayer, next } = await fightOneTurn(
      [{ type: "damage", command: "f1", amount: 20 }, { type: "counter", amount: 9 }],
      battle({ enemyHp: 40, sp: 40 }),
    );
    // beat 1: the dev's hit
    expect(lines().at(-1)).toBe("> </> MARKUP: 20 de dano");
    expect(heroActor()).toHaveClass("anim-lunge");
    expect(enemyActor()).toHaveClass("anim-hit");
    expect(fx()!.dataset.fx).toBe("code");
    expect(fx()!.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/code.png)");
    expect(within(enemyActor()).getByText("-20")).toBeInTheDocument();
    expect(screen.getByLabelText("inimigo")).toHaveTextContent("HP 40/60");
    expect(screen.getByLabelText("dev em combate")).toHaveTextContent("HP 100/100");
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-command], [data-item]")) expect(b).toBeDisabled();
    expect(setPlayer).not.toHaveBeenCalled();

    // beat 2: the counter
    act(() => vi.advanceTimersByTime(600));
    expect(lines().at(-1)).toBe("< NULL SLIME devolve um stack trace: -9 HP");
    expect(heroActor()).toHaveClass("anim-hit");
    expect(enemyActor()).toHaveClass("anim-lunge");
    expect(fx()!.dataset.fx).toBe("impact");
    expect(within(heroActor()).getByText("-9")).toBeInTheDocument();
    expect(screen.getByLabelText("dev em combate")).toHaveTextContent("HP 91/100");
    expect(command("fix")).toBeDisabled();
    expect(setPlayer).not.toHaveBeenCalled();

    // end: the server's state lands and the stage is quiet
    act(() => vi.advanceTimersByTime(600));
    expect(setPlayer).toHaveBeenCalledWith(next);
    expect(screen.getByLabelText("dev em combate")).toHaveTextContent("SP 40/50");
    expect(command("fix")).toBeEnabled();
    expect(fx()).toBeNull();
    expect(float()).toBeNull();
    expect(heroActor().className).not.toMatch(/anim-/);
  });

  it("crit shakes the stage", async () => {
    await fightOneTurn([{ type: "damage", command: "fix", amount: 36, weakness: true }], battle({ enemyHp: 24 }));
    expect(document.querySelector(".battle-stage")).toHaveClass("is-shake");
    expect(float()).toHaveTextContent("-36 CRÍTICO!");
    expect(float()).toHaveClass("tone-crit");
  });

  it("victory leaves the enemy down and RESOLVIDO after the last beat", async () => {
    const { setPlayer } = await fightOneTurn(
      [{ type: "damage", command: "fix", amount: 20 }, { type: "victory" }, { type: "reward", xp: 90, coins: 40, gems: 1, levelsGained: 0 }, { type: "drop", item: "null_shard" }],
      battle({ enemyHp: 0, status: "won" }),
    );
    act(() => vi.advanceTimersByTime(600));
    expect(enemyActor()).toHaveClass("anim-defeat");
    expect(enemyActor()).toHaveClass("is-down");
    expect(screen.queryByText("RESOLVIDO")).toBeNull();
    act(() => vi.advanceTimersByTime(700));
    expect(within(heroActor()).getByText("+90 XP")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(450));
    expect(within(enemyActor()).getByText("+1")).toBeInTheDocument();
    expect(float()!.querySelector("img")).toHaveAttribute("src", "/art/icon/item-null_shard.png");
    expect(lines().at(-1)).toBe("+1 FRAGMENTO NULL · dropou!");
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByText("RESOLVIDO")).toBeInTheDocument();
    expect(enemyActor()).toHaveClass("is-down");
    expect(setPlayer).toHaveBeenCalledTimes(1);
  });

  it("reduced motion lands the turn at once", async () => {
    motion(true);
    const { setPlayer, next } = await fightOneTurn(
      [{ type: "damage", command: "fix", amount: 20 }, { type: "counter", amount: 9 }],
      battle({ enemyHp: 40 }),
    );
    expect(lines().slice(-2)).toEqual(["> FIX: 20 de dano", "< NULL SLIME devolve um stack trace: -9 HP"]);
    expect(setPlayer).toHaveBeenCalledWith(next);
    expect(fx()).toBeNull();
    expect(heroActor().className).not.toMatch(/anim-/);
    expect(command("fix")).toBeEnabled();
  });

  it("unmount mid-turn drops the rest of the playback", async () => {
    const { setPlayer, unmount } = await fightOneTurn(
      [{ type: "damage", command: "fix", amount: 20 }, { type: "counter", amount: 9 }],
      battle({ enemyHp: 40 }),
    );
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(setPlayer).not.toHaveBeenCalled();
  });
});

describe("BattleScene assets", () => {
  // assets C26
  it("sp icon", async () => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ sp: 40 })) });
    renderScene();
    const hero = await screen.findByLabelText("dev em combate");
    const sp = within(hero).getByText("SP 40/50");
    const img = sp.firstElementChild!;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("/art/icon/ic-sp.png");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("width")).toBe("16");
    expect(sp.firstChild).toBe(img);
  });
});

function expectLoadingFx(text: HTMLElement) {
  const fx = text.querySelector("span.fx-loading") as HTMLElement;
  expect(fx).not.toBeNull();
  expect(fx.getAttribute("aria-hidden")).toBe("true");
  expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/loading.png)");
}

describe("BattleScene loading", () => {
  // assets C30
  it("loading fx", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderScene();
    expectLoadingFx(screen.getByText("CARREGANDO..."));
  });
});

describe("BattleScene enemy by id", () => {
  // assets-apply C8: the battle's enemy comes from battle.enemy, not from the region
  const SLIME: Catalog["enemies"][number] = { id: "slime", region: "vila", name: "SLIME DE CACHE", level: 2, hp: 45, sp: 40, weakness: "cache invalidado", drop: "null_shard", glyph: "(o.o)" };
  it("enemy by id: slime in vila", async () => {
    mockFetch({ "POST /api/me/battle": startWith(battle({ enemy: "slime", region: "vila", enemyHp: 45, enemyHpMax: 45 })) });
    renderScene({ catalog: { ...CATALOG, enemies: [...CATALOG.enemies, SLIME] } });
    const enemy = await screen.findByLabelText("inimigo");
    expect(enemy).toHaveTextContent("SLIME DE CACHE");
    expect(enemy).toHaveTextContent("fraqueza: cache invalidado");
    expect(enemy).not.toHaveTextContent("NULL SLIME");
    const img = sprite().querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/art/sprite/enemy-slime.png");
    expect(img.getAttribute("alt")).toBe("SLIME DE CACHE");
    expect(img.getAttribute("width")).toBe("128");
  });
});

