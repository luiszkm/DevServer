// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Completeness of the art on disk. Ids come from api/catalog/*.json at test time, and the paths are
// built from the door 1 literal (spec web/art/<category>/<kind>-<key>.json, PNG
// web/public/art/<category>/<kind>-<key>.png), never from GameArt.
//
// Test names are what the checks' `-t` filters select: keep each group's name free of the other
// groups' words ("enemy", "item", "battle background", "gear", "skill", "deploy", "hud", "rack",
// "office", "region", "scene background").

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function catalog<T>(file: string): T {
  return JSON.parse(readFileSync(`${ROOT}api/catalog/${file}`, "utf8")) as T;
}

/** Width and height from the PNG IHDR chunk (bytes 16-23, big-endian). */
function pngSize(path: string): [number, number] {
  const b = readFileSync(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

type Asset = { category: "icon" | "sprite" | "background"; name: string; size: [number, number] };

function expectAssets(assets: Asset[]) {
  expect(assets.length).toBeGreaterThan(0);
  for (const { category, name, size } of assets) {
    const spec = `${ROOT}web/art/${category}/${name}.json`;
    const png = `${ROOT}web/public/art/${category}/${name}.png`;
    expect.soft(existsSync(spec), spec).toBe(true);
    expect.soft(existsSync(png), png).toBe(true);
    if (existsSync(png)) expect.soft(pngSize(png), png).toEqual(size);
  }
}

type Combat = { enemies: { region: string }[]; items: { id: string }[] };
type Regions = { id: string }[];

const combat = catalog<Combat>("combat.json");
const regions = catalog<Regions>("regions.json");

const ENEMY_SIZE: Record<string, [number, number]> = { torre: [48, 48], nuvem: [64, 64] };

describe("catalog art on disk", () => {
  // C4
  it("enemy sprites per combat.json enemies", () => {
    expectAssets(
      combat.enemies.map((e) => ({ category: "sprite", name: `enemy-${e.region}`, size: ENEMY_SIZE[e.region] ?? [32, 32] })),
    );
  });

  // C5
  it("item icons per combat.json items, 16x16", () => {
    expectAssets(combat.items.map((i) => ({ category: "icon", name: `item-${i.id}`, size: [16, 16] })));
  });

  // C6
  it("battle background for each map area, 320x180", () => {
    expectAssets(regions.map((r) => ({ category: "background", name: `battle-${r.id}`, size: [320, 180] })));
  });
});
