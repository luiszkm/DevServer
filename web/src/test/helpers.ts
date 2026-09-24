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
  { id: "sp_potion", name: "POÇÃO DE CACHE", glyph: "++", rarity: "COMUM", description: "30 SP", restore: { stat: "sp", amount: 30 }, price: { currency: "gems", amount: 15 } },
  { id: "hp_potion", name: "POÇÃO DE MEMÓRIA", glyph: "HP+", rarity: "COMUM", description: "40 HP", restore: { stat: "hp", amount: 40 }, price: { currency: "gems", amount: 12 } },
  { id: "boost_deploy", name: "ACELERADOR DE DEPLOY", glyph: ">>", rarity: "COMUM", description: "-15 min", price: { currency: "gems", amount: 35 } },
];

export const GEAR_SLOTS: Catalog["gearSlots"] = [
  { id: "setup", name: "CONFIGURAÇÃO" },
  { id: "bebida", name: "BEBIDA" },
  { id: "vestuario", name: "VESTUÁRIO" },
  { id: "acessorio", name: "ACESSÓRIO" },
];

export const GEAR: Catalog["gear"] = [
  { id: "macbook", name: "MACBOOK PRO", glyph: "[Mac]", slot: "setup", rarity: "RARO", description: "compila sem travar", price: { currency: "gems", amount: 120 }, bonus: { type: "dmg", amount: 8 } },
  { id: "monitor", name: "MONITOR ULTRAWIDE", glyph: "[==]", slot: "setup", rarity: "LENDÁRIO", description: "mais tela", price: { currency: "gems", amount: 200 }, bonus: { type: "sp", amount: 20 } },
  { id: "cafe", name: "CAFÉ EXPRESSO", glyph: "{C}", slot: "bebida", rarity: "COMUM", description: "cafeína", price: { currency: "coins", amount: 50 }, bonus: { type: "sp", amount: 12 } },
  { id: "moletom", name: "MOLETOM CONFORTÁVEL", glyph: "[[]]", slot: "vestuario", rarity: "COMUM", description: "conforto", price: { currency: "coins", amount: 70 }, bonus: { type: "hp", amount: 15 } },
  { id: "cadeira", name: "CADEIRA ERGONÔMICA", glyph: "[|]", slot: "vestuario", rarity: "RARO", description: "postura", price: { currency: "gems", amount: 150 }, bonus: { type: "hp", amount: 30 } },
  { id: "fone", name: "FONE COM CANCELAMENTO", glyph: "((o))", slot: "acessorio", rarity: "INCOMUM", description: "foco", price: { currency: "gems", amount: 90 }, bonus: { type: "dmg", amount: 6 } },
];

export const SKINS: Catalog["skins"] = [
  { id: "default", name: "DEV PADRÃO", rarity: "PADRÃO", description: "visual clássico", filter: "none", price: { currency: "gems", amount: 0 }, bonus: null },
  { id: "neon", name: "DEV NEON", rarity: "INCOMUM", description: "ciano", filter: "hue-rotate(140deg) saturate(1.8) brightness(1.1)", price: { currency: "gems", amount: 60 }, bonus: { type: "dmg", amount: 5 } },
  { id: "shadow", name: "DEV SOMBRIO", rarity: "RARO", description: "roxa", filter: "hue-rotate(210deg) saturate(1.4) brightness(0.8)", price: { currency: "gems", amount: 80 }, bonus: { type: "sp", amount: 10 } },
  { id: "golden", name: "DEV DOURADO", rarity: "LENDÁRIO", description: "dourada", filter: "hue-rotate(60deg) saturate(2.2) brightness(1.25)", price: { currency: "gems", amount: 150 }, bonus: { type: "hp", amount: 20 } },
];

export const OFFICE: Catalog["office"] = {
  zones: [
    { id: "parede", name: "PAREDE", cells: 8 },
    { id: "piso", name: "PISO", cells: 24 },
  ],
  furniture: [
    { id: "mesa", name: "MESA EM L", glyph: "[==]", color: "#ffc93c", zone: "piso", price: { currency: "coins", amount: 60 }, comfort: 8, bonus: { type: "xp", amount: 3 }, description: "Espaço para dois monitores e o café." },
    { id: "cadeira_gamer", name: "CADEIRA GAMER", glyph: "[|]", color: "#e05252", zone: "piso", price: { currency: "gems", amount: 40 }, comfort: 10, bonus: { type: "spregen", amount: 1 }, description: "Plantão de madrugada sem dor nas costas." },
    { id: "setup2", name: "SETUP 2 TELAS", glyph: "][", color: "#45b7ff", zone: "piso", price: { currency: "gems", amount: 90 }, comfort: 14, bonus: { type: "deploy", amount: 5 }, description: "Build de um lado, log do outro." },
    { id: "rack", name: "RACK CASEIRO", glyph: "::", color: "#6bd425", zone: "piso", price: { currency: "gems", amount: 70 }, comfort: 9, bonus: { type: "deploy", amount: 6 }, description: "Servidor local zumbindo no canto." },
    { id: "cafeteira", name: "CAFETEIRA", glyph: "{C}", color: "#ffc93c", zone: "piso", price: { currency: "coins", amount: 55 }, comfort: 7, bonus: { type: "spregen", amount: 2 }, description: "Combustível renovável do dev." },
    { id: "estante", name: "ESTANTE DE LIVROS", glyph: "|||", color: "#b46cf0", zone: "piso", price: { currency: "coins", amount: 45 }, comfort: 6, bonus: { type: "xp", amount: 2 }, description: "Documentação que ninguém lê, mas inspira." },
    { id: "planta", name: "PLANTA DE CANTO", glyph: "^", color: "#6bd425", zone: "piso", price: { currency: "coins", amount: 25 }, comfort: 5, bonus: null, description: "Oxigênio e um pouco de sanidade." },
    { id: "tapete", name: "TAPETE PIXELADO", glyph: "##", color: "#8b6cf0", zone: "piso", price: { currency: "coins", amount: 30 }, comfort: 4, bonus: null, description: "Aquece a sala e abafa o teclado." },
    { id: "neon", name: "LETREIRO NEON", glyph: "~~", color: "#45b7ff", zone: "parede", price: { currency: "gems", amount: 35 }, comfort: 12, bonus: null, description: "IT WORKS ON MY MACHINE em ciano." },
    { id: "poster", name: "PÔSTER RETRÔ", glyph: "[#]", color: "#ffc93c", zone: "parede", price: { currency: "coins", amount: 20 }, comfort: 4, bonus: null, description: "Key art do DevServer emoldurada." },
    { id: "kanban", name: "QUADRO KANBAN", glyph: "[+]", color: "#dbeeff", zone: "parede", price: { currency: "coins", amount: 50 }, comfort: 5, bonus: { type: "xp", amount: 2 }, description: "Post-its que viram sprint." },
    { id: "janela", name: "JANELA COM VISTA", glyph: "[/]", color: "#8fc3e8", zone: "parede", price: { currency: "gems", amount: 60 }, comfort: 15, bonus: null, description: "Luz natural entre dois deploys." },
  ],
  levels: [
    { min: 0, name: "CANTINHO" },
    { min: 30, name: "HOME OFFICE" },
    { min: 70, name: "ESTÚDIO" },
    { min: 120, name: "LAB DEV" },
    { min: 180, name: "SEDE DEVSERVE" },
  ],
  maxDeployCut: 40,
};

/** An office with the given cells filled: room({ piso: { 0: "mesa" }, parede: { 1: "neon" } }). */
export function room(filled: { parede?: Record<number, string>; piso?: Record<number, string> } = {}): Player["office"] {
  const zone = (n: number, cells: Record<number, string> = {}) => Array.from({ length: n }, (_, i) => cells[i] ?? null);
  return { parede: zone(8, filled.parede), piso: zone(24, filled.piso) };
}

export const CATALOG: Catalog = {
  version: "v1", regions: REGIONS, deployTypes: DEPLOY_TYPES, deployLevels: DEPLOY_LEVELS, skillTrees: SKILL_TREES,
  enemies: ENEMIES, commands: COMMANDS, items: ITEMS,
  combat: { counter: [7, 14], spRegen: 5, weaknessMultiplier: 1.8, victory: { xp: 90, coins: 40, gems: 1 }, dropChance: 65, potionChance: 30, potion: "sp_potion" },
  gearSlots: GEAR_SLOTS, gear: GEAR, skins: SKINS, office: OFFICE,
};

export function player(overrides: Partial<Player> = {}): Player {
  return {
    devName: "DEV_01", class: "BACKEND", level: 1, xp: 0, xpMax: 500, hp: 100, hpMax: 100,
    coins: 100, gems: 20, skillPoints: 1, region: "vila", skin: "default", skills: [], inventory: [{ item: "sp_potion", quantity: 2 }],
    gear: [], equipment: { setup: null, bebida: null, vestuario: null, acessorio: null }, skins: ["default"], office: room(), ...overrides,
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
