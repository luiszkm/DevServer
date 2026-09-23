import { vi } from "vitest";
import type { Catalog, Player } from "@/lib/types";

export const REGIONS: Catalog["regions"] = [
  { id: "vila", name: "VILA LOCALHOST", tag: "HUB", minLevel: 1, description: "hub" },
  { id: "floresta", name: "FLORESTA DE LOGS", tag: "EXPLORAR", minLevel: 1, description: "logs" },
  { id: "mercado", name: "MERCADO DE PACOTES", tag: "LOJA", minLevel: 2, description: "pacotes" },
  { id: "caverna", name: "CAVERNA DOS BUGS", tag: "COMBATE", minLevel: 5, description: "bugs" },
  { id: "torre", name: "TORRE DE DEPLOY", tag: "CHEFE", minLevel: 8, description: "torre" },
  { id: "nuvem", name: "PICOS DA NUVEM", tag: "ENDGAME", minLevel: 12, description: "nuvem" },
];

export const DEPLOY_TYPES: Catalog["deployTypes"] = [
  { id: "backend", name: "BACKEND", glyph: "$_" },
  { id: "frontend", name: "FRONTEND", glyph: "</>" },
  { id: "mobile", name: "MOBILE", glyph: "[]" },
  { id: "database", name: "BANCO DE DADOS", glyph: "##" },
  { id: "microservices", name: "MICROSSERVIÇOS", glyph: "::" },
];

export const DEPLOY_LEVELS: Catalog["deployLevels"] = [
  { level: 1, minLevel: 1, minutes: 15, xp: 80, coins: 40, gems: 0 },
  { level: 2, minLevel: 3, minutes: 30, xp: 150, coins: 70, gems: 1 },
  { level: 3, minLevel: 6, minutes: 60, xp: 260, coins: 110, gems: 2 },
  { level: 4, minLevel: 10, minutes: 180, xp: 420, coins: 180, gems: 4 },
  { level: 5, minLevel: 15, minutes: 360, xp: 700, coins: 300, gems: 8 },
];

export const SKILL_TREES: Catalog["skillTrees"] = [
  { id: "frontend", name: "FRONTEND", nodes: [
    { id: "f1", glyph: "</>", name: "MARKUP SEMÂNTICO", description: "+10 HP máximo permanente", bonus: { type: "hp", amount: 10 } },
    { id: "f2", glyph: "{}", name: "GRID MASTER", description: "+8 SP máximo em combate", bonus: { type: "sp", amount: 8 } },
    { id: "f3", glyph: "~", name: "MOTION", description: "+10% de dano em todos os ataques", bonus: { type: "dmg", amount: 10 } },
  ] },
  { id: "backend", name: "BACKEND", nodes: [
    { id: "b1", glyph: "$_", name: "API REST", description: "+10 HP máximo permanente", bonus: { type: "hp", amount: 10 } },
    { id: "b2", glyph: "[]", name: "CAMADA DE CACHE", description: "+10 SP máximo em combate", bonus: { type: "sp", amount: 10 } },
    { id: "b3", glyph: "##", name: "FILA DE EVENTOS", description: "+12% de dano em todos os ataques", bonus: { type: "dmg", amount: 12 } },
  ] },
  { id: "infra", name: "INFRA", nodes: [
    { id: "i1", glyph: ">_", name: "SHELL SCRIPT", description: "+8 SP máximo em combate", bonus: { type: "sp", amount: 8 } },
    { id: "i2", glyph: "::", name: "CONTAINERS", description: "+15 HP máximo permanente", bonus: { type: "hp", amount: 15 } },
    { id: "i3", glyph: "^", name: "AUTO-SCALING", description: "+15% de dano em todos os ataques", bonus: { type: "dmg", amount: 15 } },
  ] },
];

export const ENEMIES: Catalog["enemies"] = [
  { region: "vila", name: "NULL SLIME", level: 3, hp: 60, sp: 50, weakness: "null-check", drop: "null_shard", glyph: "(0x0)" },
  { region: "floresta", name: "LOG WISP", level: 5, hp: 70, sp: 55, weakness: "referência circular", drop: "log_essence", glyph: "(~.~)" },
];

export const COMMANDS: Catalog["commands"] = [
  { id: "fix", label: "FIX", hint: "corrige o bug", cost: 10, damage: [14, 20] },
  { id: "test", label: "TEST", hint: "expõe a fraqueza", cost: 8, exposesWeakness: true },
  { id: "refactor", label: "REFACTOR", hint: "recupera 18 HP", cost: 14, heal: 18 },
  { id: "plain", label: "PLAIN", hint: "defende e recupera 3 SP", cost: 0, shield: true, spGain: 3 },
  { id: "f1", label: "</> MARKUP", hint: "golpe limpo", cost: 12, damage: [12, 14], skill: "f1" },
  { id: "b2", label: "[] CACHE", hint: "recupera 24 HP", cost: 16, heal: 24, skill: "b2" },
  { id: "rollback", label: "ROLLBACK", hint: "volta para o mapa", cost: 0, flee: true },
];

export const ITEMS: Catalog["items"] = [
  { id: "null_shard", name: "FRAGMENTO NULL", glyph: "0x0", rarity: "COMUM", description: "resto de slime" },
  { id: "sp_potion", name: "POÇÃO DE CACHE", glyph: "++", rarity: "COMUM", description: "30 SP", restore: { stat: "sp", amount: 30 } },
  { id: "hp_potion", name: "POÇÃO DE MEMÓRIA", glyph: "HP+", rarity: "COMUM", description: "40 HP", restore: { stat: "hp", amount: 40 } },
];

export const CATALOG: Catalog = {
  version: "v1", regions: REGIONS, deployTypes: DEPLOY_TYPES, deployLevels: DEPLOY_LEVELS, skillTrees: SKILL_TREES,
  enemies: ENEMIES, commands: COMMANDS, items: ITEMS,
  combat: { counter: [7, 14], spRegen: 5, weaknessMultiplier: 1.8, victory: { xp: 90, coins: 40, gems: 1 }, dropChance: 65, potionChance: 30, potion: "sp_potion" },
};

export function player(overrides: Partial<Player> = {}): Player {
  return {
    devName: "DEV_01", class: "BACKEND", level: 1, xp: 0, xpMax: 500, hp: 100, hpMax: 100,
    coins: 100, gems: 20, skillPoints: 1, region: "vila", skin: "default", skills: [], inventory: [{ item: "sp_potion", quantity: 2 }], ...overrides,
  };
}

export function json(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Route = Response | (() => Response | Promise<Response>);

/** Stubs fetch with a table of "METHOD /path" -> response; unknown calls fail the test. */
export function mockFetch(routes: Record<string, Route>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${(init?.method ?? "GET").toUpperCase()} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`unexpected fetch ${key}`);
    const res = typeof route === "function" ? await route() : route;
    return res.clone();
  });
  vi.stubGlobal("fetch", fn);
  return {
    fn,
    calls: (key: string) =>
      fn.mock.calls.filter(([input, init]) => `${(init?.method ?? "GET").toUpperCase()} ${String(input)}` === key).length,
  };
}
