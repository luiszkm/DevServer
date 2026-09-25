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

    // C31 (added after verification round 4): one object, centred
    it("menu icon centred", () => {
      const xs = points.map(([x]) => x);
      const ys = points.map(([, y]) => y);
      expect(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (width - 1) / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - (height - 1) / 2)).toBeLessThanOrEqual(1);
    });

    // C32 (added after verification round 5): one object - the opaque pixels form one 8-connected shape
    it("menu icon one object", () => {
      const seen = new Set<string>([points[0].join()]);
      const stack = [points[0]];
      while (stack.length) {
        const [x, y] = stack.pop()!;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const k = `${x + dx},${y + dy}`;
            if (!seen.has(k) && opaque(x + dx, y + dy)) {
              seen.add(k);
              stack.push([x + dx, y + dy]);
            }
          }
      }
      expect(seen.size).toBe(points.length);
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

  // game-menu C25-C27 (added after verification round 2): specular, tones per material, no inner-detail ink
  const hex = (px: (x: number, y: number) => number[], x: number, y: number) =>
    "#" + px(x, y).slice(0, 3).map((c) => c.toString(16).padStart(2, "0")).join("");

  it("menu office specular on the screen", () => {
    const { px } = pngPixels(`${ROOT}web/public/art/icon/menu-office.png`);
    const screen: string[] = [];
    for (let y = 3; y <= 6; y++) for (let x = 4; x <= 11; x++) screen.push(hex(px, x, y));
    expect(hex(px, 4, 3)).toBe("#b6f070");
    expect(screen.filter((c) => c === "#b6f070")).toHaveLength(1);
    expect(screen.filter((c) => !["#b6f070", "#1f5a08", "#6bd425"].includes(c))).toEqual([]);
  });

  it("menu material tones: office bezel and mundo paper", () => {
    const office = pngPixels(`${ROOT}web/public/art/icon/menu-office.png`);
    const bezel = new Set<string>();
    for (let x = 3; x <= 12; x++) [2, 7].forEach((y) => bezel.add(hex(office.px, x, y)));
    for (let y = 3; y <= 6; y++) [3, 12].forEach((x) => bezel.add(hex(office.px, x, y)));
    expect([...bezel].sort()).toEqual(["#121e2a", "#2a3642", "#46586a"]);

    const mundo = pngPixels(`${ROOT}web/public/art/icon/menu-mundo.png`);
    const paper = new Set<string>();
    const scenery = ["#060612", "#78c828", "#588818", "#286828", "#1296d2", "#c62a42"];
    for (let y = 0; y < mundo.height; y++)
      for (let x = 0; x < mundo.width; x++) {
        if (mundo.px(x, y)[3] !== 255) continue;
        const c = hex(mundo.px, x, y);
        if (!scenery.includes(c)) paper.add(c);
      }
    expect([...paper].sort()).toEqual(["#deb060", "#f6ead2", "#fbf6ea"]);
  });

  it.each<[string, [number, number][]]>([
    ["avatar", [[5, 6], [10, 6]]],
    ["deploy", [[5, 9], [10, 9], [5, 10], [10, 10], [5, 11], [10, 11]]],
    ["office", [[7, 8], [8, 8], [7, 10], [8, 10]]],
    ["titulo", []],
    ["mundo", []],
    ["server", []],
    ["bug-fight", []],
    ["skills", []],
    ["loja", []],
  ])("menu inner ink %s", (id, expected) => {
    const { width, height, px } = pngPixels(`${ROOT}web/public/art/icon/menu-${id}.png`);
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && px(x, y)[3] === 255;
    const inner: [number, number][] = [];
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        if (!opaque(x, y) || hex(px, x, y) !== "#060612") continue;
        let enclosed = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!opaque(x + dx, y + dy)) enclosed = false;
        if (enclosed) inner.push([x, y]);
      }
    expect(inner).toEqual(expected);
  });

  // game-menu C28-C30 (added after verification round 3): the tone and specular rules on every icon,
  // surfaces by legend char as the plan's "Material" assumption defines them
  type Surfaces = { surfaces: Record<string, string>; small: Record<string, string>; glossy?: Record<string, string> };
  const SURFACES: Record<string, Surfaces> = {
    avatar: { surfaces: { rosto: "smSp", cabelo: "hHj", moletom: "kKn" }, small: { ziper: "c" } },
    "bug-fight": { surfaces: { casco: "lrRs" }, small: { cabeca: "k", olhos: "w" } },
    deploy: { surfaces: { corpo: "wmM", aletas: "rRl" }, small: { vidro: "bB", chama: "yYf" }, glossy: { vidro: "net.4" } },
    loja: { surfaces: { saco: "Ddm", moeda: "gylM" }, small: { cordao: "r" }, glossy: { moeda: "gold.4" } },
    mundo: { surfaces: { papel: "pPq", terra: "gGL" }, small: { agua: "b", trilha: "x" } },
    office: { surfaces: { tela: "gGS", moldura: "fEF", mesa: "Wwd" }, small: { suporte: "Mm" }, glossy: { tela: "code.4" } },
    server: { surfaces: { estrutura: "Mmn", gavetas: "Sdz" }, small: { leds: "gby" } },
    skills: { surfaces: { estrela: "bmlw" }, small: {} },
    titulo: { surfaces: { telhado: "rRl", paredes: "Wwdk" }, small: { porta: "D", janela: "yY" } },
  };
  function spec(id: string) {
    const s = JSON.parse(readFileSync(`${ROOT}web/art/icon/menu-${id}.json`, "utf8")) as {
      legend: Record<string, string>;
      layers: { grid?: string[] }[];
    };
    expect(s.layers).toHaveLength(1);
    const counts: Record<string, number> = {};
    for (const row of s.layers[0].grid!) for (const ch of row) if (ch !== "." && ch !== " ") counts[ch] = (counts[ch] ?? 0) + 1;
    return { legend: s.legend, counts };
  }
  // Tones are counted by colour, not by name: some palette names share a hex (leaf.3 = grass.3).
  const PALETTE = JSON.parse(readFileSync(`${ROOT}.claude/skills/pixel-assets/references/palette.json`, "utf8")) as Record<string, string[] | string>;
  const toHex = (key: string) => {
    const [ramp, index] = key.split(".");
    return (PALETTE[ramp] as string[])[Number(index ?? 0)].toLowerCase();
  };
  const size = (chars: string, counts: Record<string, number>) => [...chars].reduce((a, c) => a + (counts[c] ?? 0), 0);

  it.each(Object.entries(SURFACES).flatMap(([id, t]) => Object.entries(t.surfaces).map(([name, chars]) => [id, name, chars])))(
    "menu surface tones %s %s",
    (id, _, chars) => {
      const { legend, counts } = spec(id);
      expect(size(chars, counts)).toBeGreaterThanOrEqual(12);
      const tones = new Set([...chars].filter((c) => counts[c]).map((c) => toHex(legend[c])));
      expect(tones.size).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(Object.keys(SURFACES))("menu surface table covers %s", (id) => {
    const { counts } = spec(id);
    const t = SURFACES[id];
    const owners = [...Object.values(t.surfaces), ...Object.values(t.small)].join("");
    for (const ch of Object.keys(counts).filter((c) => c !== "o")) expect([...owners].filter((c) => c === ch), `${id} '${ch}'`).toHaveLength(1);
    for (const [name, chars] of Object.entries(t.small)) expect(size(chars, counts), `${id} ${name}`).toBeLessThan(12);
  });

  it.each(Object.entries(SURFACES).flatMap(([id, t]) => Object.entries(t.glossy ?? {}).map(([name, top]) => [id, name, top])))(
    "menu glossy specular %s %s",
    (id, name, top) => {
      const { legend, counts } = spec(id);
      const t = SURFACES[id];
      const chars = t.surfaces[name] ?? t.small[name];
      expect([...chars].filter((c) => toHex(legend[c]) === toHex(top)).reduce((a, c) => a + (counts[c] ?? 0), 0)).toBe(1);
    },
  );

  // C33 (added after verification round 5): the coin is drawn from the gold ramp only (style guide: coin = gold)
  it("menu coin in gold", () => {
    const { legend, counts } = spec("loja");
    const coin = [...SURFACES.loja.surfaces.moeda].filter((c) => counts[c]);
    const gold = (PALETTE.gold as string[]).map((h) => h.toLowerCase());
    expect(coin.filter((c) => !gold.includes(toHex(legend[c])))).toEqual([]);
  });

  // C26: fixed names, no catalog entry (door 1)
  it("scene background for the map, the room and the machine hall, 320x180", () => {
    expectAssets(["world", "office", "server"].map((name) => ({ category: "background", name, size: [320, 180] })));
  });

  // avatar customization: the fixed layers plus every style layer avatar.json names, all on one 48x64 grid
  it("hero layers per avatar.json, 48x64", () => {
    const { options } = catalog<{ options: { layer?: string }[] }>("avatar.json");
    const { options: all } = catalog<{ options: { part: string; layer?: string }[] }>("avatar.json");
    // the feminine body has its own "-f" drawing of every layer but beards (masculine only)
    const feminine = ["body", "bottom", "hand", ...all.filter((o) => o.layer && o.part !== "beard").map((o) => o.layer!)].map((l) => `${l}-f`);
    const layers = ["body", "bottom", "hand", ...feminine, ...options.flatMap((o) => (o.layer ? [o.layer] : []))];
    expectAssets(layers.map((name) => ({ category: "sprite", name: `hero/${name}`, size: [48, 64] })));
  });

  // avatar customization: the game swaps colours hex to hex, so every ramp must be a palette ramp
  it("avatar ramps in the palette", () => {
    const { options } = catalog<{ options: { id: string; ramp?: string[] }[] }>("avatar.json");
    const skins = catalog<{ skins: { id: string; palette: Record<string, string[]> }[] }>("shop.json").skins;
    const ramps = Object.values(PALETTE).filter(Array.isArray).map((r) => (r as string[]).map((h) => h.toLowerCase()).join());
    const used = [...options.flatMap((o) => (o.ramp ? [[o.id, o.ramp] as const] : [])), ...skins.flatMap((s) => Object.entries(s.palette).map(([k, r]) => [`${s.id}.${k}`, r] as const))];
    expect(used.length).toBeGreaterThan(0);
    for (const [id, ramp] of used) expect.soft(ramps, id).toContain(ramp.map((h) => h.toLowerCase()).join());
  });
});

// avatar customization: the web mock copies avatar.json by value.
describe("web mock avatar", () => {
  it("web mock matches avatar catalog", async () => {
    const { AVATAR } = await import("@/test/helpers");
    expect(AVATAR).toEqual(catalog("avatar.json"));
  });
});

// forge C29: the web mock copies the forge recipes and the craft-only pieces by value.
describe("web mock", () => {
  it("web mock matches forge catalog", async () => {
    const { RECIPES, GEAR } = await import("@/test/helpers");
    const forge = catalog<{ recipes: unknown[] }>("forge.json");
    expect(RECIPES).toEqual(forge.recipes);
    const full = catalog<{ gear: { id: string; price?: unknown }[] }>("shop.json").gear.filter((g) => !g.price);
    expect(full.map((g) => g.id)).toEqual(["caneca_log", "hoodie_trace", "teclado_race"]);
    expect(GEAR.filter((g) => !g.price)).toEqual(full);
  });
});
