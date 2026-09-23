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

export const CATALOG: Catalog = { version: "v1", regions: REGIONS };

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
