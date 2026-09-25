import type { AvatarOption, Catalog, Player } from "./types";

/** What decides the hero's look: the body, the picks, the equipped gear and the worn skin. */
export type LookInput = Pick<Player, "body" | "appearance" | "equipment" | "skin">;

/** Who set a part: equipped gear, the worn skin, the player's pick, or the catalog default. */
export type LookSource = "gear" | "skin" | "player" | "default";

/** One PNG of the hero, with the exact base-hex → target-hex swaps to paint it with. */
export type Layer = { src: string; swap: Record<string, string> };

export type Look = {
  layers: Layer[];
  /** Resolved option (and source) per part. */
  parts: Record<string, { option: string; by: LookSource }>;
  /** Stable id of the drawing: same key, same pixels. */
  key: string;
};

const layerSrc = (layer: string) => `/art/sprite/hero/${layer}.png`;

// The torso layers are drawn per body; head, hand and everything on them are shared.
const BODY_SUFFIX: Record<string, string> = { feminino: "-f" };

export function availableFor(option: AvatarOption, body: string): boolean {
  return !option.bodies || option.bodies.includes(body);
}

/** The catalog defaults with the body's own defaults on top. */
export function bodyDefaults(catalog: Catalog, body: string): Record<string, string> {
  return { ...catalog.avatar.defaults, ...catalog.avatar.bodies.find((b) => b.id === body)?.defaults };
}

/**
 * Resolves every avatar part, strongest first: gear with a look in the part's slot, the worn
 * skin's palette (colour parts), the player's pick, the body's default. A pick that is unknown,
 * of another part, gear-only, or not for this body falls back to the default.
 */
export function resolveLook(input: LookInput, catalog: Catalog): Look {
  const { parts, options } = catalog.avatar;
  const defaults = bodyDefaults(catalog, input.body);
  const option = (id?: string) => options.find((o) => o.id === id);
  const skin = catalog.skins.find((s) => s.id === input.skin);
  const resolved: Look["parts"] = {};
  const ramps: Record<string, string[]> = {};
  const styles: Record<string, AvatarOption> = {};

  for (const part of parts) {
    const pick = option(input.appearance[part.id]);
    let chosen = pick && pick.part === part.id && !pick.gearOnly && availableFor(pick, input.body) ? pick : undefined;
    let by: LookSource = chosen ? "player" : "default";
    chosen ??= option(defaults[part.id])!;

    const gear = part.gearSlot && catalog.gear.find((g) => g.id === input.equipment[part.gearSlot!]);
    if (gear && gear.look?.part === part.id) {
      chosen = option(gear.look.option)!;
      by = "gear";
    }
    const forced = part.kind === "color" ? skin?.palette[part.id] : undefined;
    if (forced) by = "skin";

    resolved[part.id] = { option: chosen.id, by };
    if (part.kind === "color") ramps[part.id] = forced ?? chosen.ramp!;
    else styles[part.id] = chosen;
  }

  // The art is painted in each colour part's catalog default ramp; swap it tone by tone.
  const swap = (...colorParts: string[]) => {
    const out: Record<string, string> = {};
    for (const id of colorParts) {
      const base = option(catalog.avatar.defaults[id])!.ramp!;
      base.forEach((hex, i) => {
        if (ramps[id][i] !== hex) out[hex] = ramps[id][i];
      });
    }
    return out;
  };
  // A style without a layer (SEM BARBA, SEM ÓCULOS) draws nothing.
  const suffix = BODY_SUFFIX[input.body] ?? "";
  const style = (part: string, colour?: string, perBody = false): Layer[] => {
    const o = styles[part];
    const layer = o.layer && (perBody ? o.layer + suffix : o.layer);
    return layer ? [{ src: layerSrc(layer), swap: o.fixed || !colour ? {} : swap(colour) }] : [];
  };
  const layers: Layer[] = [
    // The body carries the eyebrows, painted in the hair ramp so they follow the hair colour.
    { src: layerSrc(`body${suffix}`), swap: swap("tone", "eyes", "hairColor") },
    { src: layerSrc(`bottom${suffix}`), swap: swap("bottomColor") },
    ...style("top", "topColor", true),
    ...style("laptop"),
    { src: layerSrc("hand"), swap: swap("tone") },
    ...style("beard", "hairColor"),
    ...style("hair", "hairColor"),
    ...style("glasses"),
  ];
  const key = layers.map((l) => `${l.src}|${Object.entries(l.swap).map((e) => e.join(">")).join(",")}`).join(";");
  return { layers, parts: resolved, key };
}
