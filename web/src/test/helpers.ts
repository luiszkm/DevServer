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

export const CATALOG: Catalog = { version: "v1", regions: REGIONS, deployTypes: DEPLOY_TYPES, deployLevels: DEPLOY_LEVELS };

export function player(overrides: Partial<Player> = {}): Player {
  return {
    devName: "DEV_01", class: "BACKEND", level: 1, xp: 0, xpMax: 500, hp: 100, hpMax: 100,
    coins: 100, gems: 20, skillPoints: 1, region: "vila", skin: "default", ...overrides,
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
