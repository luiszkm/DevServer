import { describe, expect, it } from "vitest";
import { CATALOG } from "@/test/helpers";
import { resolveLook, type LookInput } from "./avatar";

const TONE = ["#8a5234", "#b8764a", "#f6ba72", "#ffd8a0"];
const NEGRA = ["#3a1e10", "#5a3220", "#7c4a30", "#9c6844"];
const EYES = ["#3a2010", "#5c3418", "#7e4c26", "#a06a3a"];
const AZUL = ["#0c3060", "#1450a0", "#2a78d0", "#62a8f0"];
const HAIR = ["#141420", "#24242e", "#34343e", "#4a4a56"];
const LOIRO = ["#8a6420", "#b88a2c", "#e0b44a", "#f8dc84"];
const TOP = ["#202030", "#2c3838", "#383844", "#4c4c5a"];
const VINHO = ["#3a0c18", "#5a1426", "#7c2036", "#9c3048"];
const NEON = ["#1a6a70", "#2a9aa0", "#5ad2d2", "#a0f4f0"];

// The real catalog (helpers mirror api/catalog): neon forces tone, eyes and hair colour.
const catalog = CATALOG;
const ROSA = ["#6a1a4a", "#9c2a6c", "#d04a98", "#f080c0"];

const EMPTY = { setup: null, bebida: null, vestuario: null, acessorio: null };
const input = (o: Partial<LookInput> = {}): LookInput => ({ body: "masculino", appearance: {}, equipment: EMPTY, skin: "default", ...o });
const zip = (from: string[], to: string[]) => Object.fromEntries(from.map((h, i) => [h, to[i]]));
const src = (layer: string) => `/art/sprite/hero/${layer}.png`;

describe("resolveLook", () => {
  it("default look: every part from the catalog, nothing swapped", () => {
    const look = resolveLook(input(), catalog);
    expect(look.layers).toEqual([
      { src: src("body"), swap: {} },
      { src: src("bottom"), swap: {} },
      { src: src("top-moletom"), swap: {} },
      { src: src("laptop-basico"), swap: {} },
      { src: src("hand"), swap: {} },
      { src: src("hair-espetado"), swap: {} },
    ]);
    for (const p of Object.values(look.parts)) expect(p.by).toBe("default");
  });

  it("player picks: colours swap tone by tone on their layers, styles pick the layer", () => {
    const look = resolveLook(
      input({ appearance: { tone: "tone_negra", eyes: "eyes_azul", hair: "hair_moicano", hairColor: "hair_loiro", topColor: "top_vinho" } }),
      catalog,
    );
    expect(look.layers).toEqual([
      { src: src("body"), swap: { ...zip(TONE, NEGRA), ...zip(EYES, AZUL), ...zip(HAIR, LOIRO) } },
      { src: src("bottom"), swap: {} },
      { src: src("top-moletom"), swap: zip(TOP, VINHO) },
      { src: src("laptop-basico"), swap: {} },
      { src: src("hand"), swap: zip(TONE, NEGRA) },
      { src: src("hair-moicano"), swap: zip(HAIR, LOIRO) },
    ]);
    expect(look.parts.hair).toEqual({ option: "hair_moicano", by: "player" });
    expect(look.parts.laptop).toEqual({ option: "laptop_basico", by: "default" });
  });

  it("beard follows the hair colour and sits under the hair; glasses are fixed and drawn last", () => {
    const look = resolveLook(input({ appearance: { beard: "beard_cheia", glasses: "glasses_redondo", hairColor: "hair_loiro" } }), catalog);
    expect(look.layers.slice(5)).toEqual([
      { src: src("beard-cheia"), swap: zip(HAIR, LOIRO) },
      { src: src("hair-espetado"), swap: zip(HAIR, LOIRO) },
      { src: src("glasses-redondo"), swap: {} },
    ]);
  });

  it("no beard and no glasses draw nothing", () => {
    const look = resolveLook(input({ appearance: { beard: "beard_nenhuma", glasses: "glasses_nenhum" } }), catalog);
    expect(look.layers.map((l) => l.src)).not.toContain(src("beard-nenhuma"));
    expect(look.layers).toHaveLength(6);
    expect(look.parts.beard).toEqual({ option: "beard_nenhuma", by: "player" });
  });

  it("fixed style ignores the part's colour", () => {
    const look = resolveLook(input({ appearance: { top: "top_jaqueta", topColor: "top_vinho" } }), catalog);
    expect(look.layers[2]).toEqual({ src: src("top-jaqueta"), swap: {} });
  });

  it("worn skin forces its palette over the player's colours", () => {
    const look = resolveLook(input({ skin: "neon", appearance: { tone: "tone_negra", hairColor: "hair_loiro", topColor: "top_vinho" } }), catalog);
    expect(look.layers[0].swap).toEqual({ ...zip(TONE, NEON), ...zip(EYES, AZUL), ...zip(HAIR, ROSA) });
    expect(look.layers[4].swap).toEqual(zip(TONE, NEON));
    expect(look.layers[5].swap).toEqual(zip(HAIR, ROSA));
    expect(look.layers[2].swap).toEqual(zip(TOP, VINHO));
    expect(look.parts.tone).toEqual({ option: "tone_negra", by: "skin" });
    expect(look.parts.topColor).toEqual({ option: "top_vinho", by: "player" });
  });

  it("gear with a look dresses the top", () => {
    const look = resolveLook(input({ equipment: { ...EMPTY, vestuario: "hoodie_trace" }, appearance: { top: "top_jaqueta" } }), catalog);
    expect(look.layers[2]).toEqual({ src: src("top-hoodie_trace"), swap: {} });
    expect(look.parts.top).toEqual({ option: "top_hoodie_trace", by: "gear" });
  });

  it("gear with a look swaps the laptop", () => {
    const look = resolveLook(input({ equipment: { ...EMPTY, setup: "macbook" } }), catalog);
    expect(look.layers[3]).toEqual({ src: src("laptop-macbook"), swap: {} });
    expect(look.parts.laptop).toEqual({ option: "laptop_macbook", by: "gear" });
  });

  it("gear without a look keeps the player's pick", () => {
    const look = resolveLook(input({ equipment: { ...EMPTY, vestuario: "cadeira" }, appearance: { top: "top_jaqueta" } }), catalog);
    expect(look.parts.top).toEqual({ option: "top_jaqueta", by: "player" });
  });

  it.each([
    ["unknown id", { hair: "hair_sumiu" }],
    ["option of another part", { hair: "hair_loiro" }],
    ["gear-only option", { top: "top_hoodie_trace" }],
  ])("%s falls back to the default", (_name, appearance) => {
    const look = resolveLook(input({ appearance }), catalog);
    const [part, id] = Object.entries(appearance)[0];
    expect(look.parts[part].by).toBe("default");
    expect(look.parts[part].option).not.toBe(id);
  });

  it("key changes with the drawing and only with it", () => {
    const a = resolveLook(input(), catalog).key;
    expect(resolveLook(input({ appearance: { hair: "hair_espetado" } }), catalog).key).toBe(a);
    expect(resolveLook(input({ appearance: { hairColor: "hair_loiro" } }), catalog).key).not.toBe(a);
  });

  it("feminino draws its own version of every layer", () => {
    const look = resolveLook(input({ body: "feminino" }), catalog);
    expect(look.layers.map((l) => l.src)).toEqual([
      src("body-f"), src("bottom-f"), src("top-moletom-f"), src("laptop-basico-f"), src("hand-f"), src("hair-rabo-f"),
    ]);
    // feminino's own defaults: brown ponytail and black pants, swapped from the base ramps
    expect(look.parts.hair).toEqual({ option: "hair_rabo", by: "default" });
    const ramp = (id: string) => catalog.avatar.options.find((o) => o.id === id)!.ramp!;
    expect(look.layers[1].swap).toEqual(zip(ramp("bottom_jeans"), ramp("bottom_preto")));
    expect(look.layers[5].swap).toEqual(zip(HAIR, ramp("hair_castanho")));
  });

  it("gear and glasses on feminino use the feminine variants", () => {
    const look = resolveLook(input({ body: "feminino", equipment: { ...EMPTY, vestuario: "hoodie_trace", setup: "macbook" }, appearance: { glasses: "glasses_redondo" } }), catalog);
    expect(look.layers[2]).toEqual({ src: src("top-hoodie_trace-f"), swap: {} });
    expect(look.layers[3]).toEqual({ src: src("laptop-macbook-f"), swap: {} });
    expect(look.layers.at(-1)).toEqual({ src: src("glasses-redondo-f"), swap: {} });
  });

  it.each([
    ["beard on feminino", "feminino", { beard: "beard_cheia" }, "beard", "beard_nenhuma"],
    ["feminine hair on masculino", "masculino", { hair: "hair_rabo" }, "hair", "hair_espetado"],
  ])("%s falls back to the body's default", (_name, body, appearance, part, fallback) => {
    const look = resolveLook(input({ body, appearance }), catalog);
    expect(look.parts[part]).toEqual({ option: fallback, by: "default" });
  });

  it("a pick for both bodies is kept on feminino", () => {
    const look = resolveLook(input({ body: "feminino", appearance: { hair: "hair_curto" } }), catalog);
    expect(look.parts.hair).toEqual({ option: "hair_curto", by: "player" });
  });
});
