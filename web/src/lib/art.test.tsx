// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
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

const MENU_ICONS = ["titulo", "mundo", "server", "deploy", "bug-fight", "skills", "loja", "avatar", "office"];

/** RGBA pixels of a PNG as the renderer writes it (8-bit RGBA, filter 0 on every row). */
function pngPixels(path: string) {
  const b = readFileSync(path);
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  expect([b[24], b[25]]).toEqual([8, 6]);
  const idat: Buffer[] = [];
  for (let i = 8; i < b.length; ) {
    const len = b.readUInt32BE(i);
    if (b.toString("latin1", i + 4, i + 8) === "IDAT") idat.push(b.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = 1 + width * 4;
  for (let y = 0; y < height; y++) expect(raw[y * stride]).toBe(0);
  const px = (x: number, y: number) => Array.from(raw.subarray(y * stride + 1 + x * 4, y * stride + 5 + x * 4));
  return { width, height, px };
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
type Shop = { gear: { id: string }[] };
type Skills = { trees: { nodes: { id: string }[] }[] };
type Deploys = { types: { id: string }[] };
type Rack = { components: { id: string }[] };
type Office = { furniture: { id: string }[] };

const combat = catalog<Combat>("combat.json");
const regions = catalog<Regions>("regions.json");
const shop = catalog<Shop>("shop.json");
const skills = catalog<Skills>("skills.json");
const deploys = catalog<Deploys>("deploys.json");
const rackCatalog = catalog<Rack>("rack.json");
const officeCatalog = catalog<Office>("office.json");

const icons = (names: string[]): Asset[] => names.map((name) => ({ category: "icon", name, size: [16, 16] }));

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

  // C12
  it("gear icons per shop.json, 16x16", () => {
    expectAssets(icons(shop.gear.map((g) => `gear-${g.id}`)));
  });

  // C13
  it("skill icons per skills.json tree nodes, 16x16", () => {
    expectAssets(icons(skills.trees.flatMap((t) => t.nodes).map((n) => `skill-${n.id}`)));
  });

  // C14
  it("deploy icons per deploys.json types, 16x16", () => {
    expectAssets(icons(deploys.types.map((t) => `deploy-${t.id}`)));
  });

  // C15: fixed names, no catalog entry (door 1)
  it("hud icons for coin, gem, heart and xp, 16x16", () => {
    expectAssets(icons(["hud-coin", "hud-gem", "hud-heart", "hud-xp"]));
  });

  // C23
  it("component icons per rack.json, 16x16", () => {
    expectAssets(icons(rackCatalog.components.map((k) => `rack-${k.id}`)));
  });

  // C24
  it("furniture icons per office.json, 16x16", () => {
    expectAssets(icons(officeCatalog.furniture.map((f) => `office-${f.id}`)));
  });

  // C25
  it("map marker icons per regions.json, 16x16", () => {
    expectAssets(icons(regions.map((r) => `region-${r.id}`)));
  });

  // game-menu C1: one icon per scene, ids fixed by the plan (door 1)
  it("menu icons per scene, 16x16", () => {
    expectAssets(icons(MENU_ICONS.map((id) => `menu-${id}`)));
  });

  // game-menu C19-C21 (added after verification round 1): the style guide's mechanical icon rules
  describe.each(MENU_ICONS)("menu-%s", (id) => {
    const { width, height, px } = pngPixels(`${ROOT}web/public/art/icon/menu-${id}.png`);
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && px(x, y)[3] === 255;
    const points: [number, number][] = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (opaque(x, y)) points.push([x, y]);
    const isInk = (x: number, y: number) => px(x, y).slice(0, 3).join() === "6,6,18";

    it("menu icon margin and fill", () => {
      expect(points.filter(([x, y]) => x === 0 || y === 0 || x === width - 1 || y === height - 1)).toEqual([]);
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      const side = Math.max(Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1);
      expect(side).toBeGreaterThanOrEqual(12);
      expect(side).toBeLessThanOrEqual(14);
    });

    it("menu icon outline in ink", () => {
      const edge = points.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !opaque(x + dx, y + dy)));
      expect(edge.filter(([x, y]) => !isInk(x, y))).toEqual([]);
    });

    it("menu icon light from the top-left", () => {
      const lum = (x: number, y: number) => {
        const [r, g, b] = px(x, y);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const mean = (ps: [number, number][]) => ps.reduce((a, [x, y]) => a + lum(x, y), 0) / ps.length;
      const lit = points.filter(([x, y]) => !isInk(x, y));
      expect(mean(lit.filter(([x, y]) => x + y < 15))).toBeGreaterThan(mean(lit.filter(([x, y]) => x + y > 15)));
    });
  });

  // C26: fixed names, no catalog entry (door 1)
  it("scene background for the map, the room and the machine hall, 320x180", () => {
    expectAssets(["world", "office", "server"].map((name) => ({ category: "background", name, size: [320, 180] })));
  });
});
