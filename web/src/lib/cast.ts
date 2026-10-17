import type { CSSProperties } from "react";
import type { FxId } from "./battleFx";
import manifest from "../../cast/manifest.json";

export type CastItem = {
  id: string;
  src: string;
  w: number;
  h: number;
  frames: number;
  cellW: number;
  cellH: number;
  source: string;
};

const BY_ID = new Map((manifest.items as CastItem[]).map((item) => [item.id, item]));

export function castById(id: string): CastItem {
  const item = BY_ID.get(id);
  if (!item) throw new Error(`unknown cast ${id}`);
  return item;
}

/** Enemy ids that have a painted cast sprite. Anything else stays on `/art`. */
export const CAST_ENEMY: Record<string, string> = {
  slime: "enemy-slime",
  vila: "enemy-slime-dark",
  slime_verde: "enemy-slime-verde",
  caverna: "enemy-snake",
  torre: "enemy-spider",
  boss_nuvem: "enemy-boss-nuvem",
};

/** Fx ids that play a cast piece. `scan` and the rest stay on `/art/fx`. */
export const CAST_FX: Partial<Record<FxId, string>> = {
  slash: "fx-slash",
  impact: "fx-impact",
  code: "fx-code",
  bolt: "fx-bolt",
  heal: "fx-heal",
  shield: "fx-shield",
  data: "fx-data",
  ship: "fx-crit",
};

export function castFxItem(fx: FxId): CastItem | null {
  const id = CAST_FX[fx];
  return id ? castById(id) : null;
}

/** Arena height for painted cast. Matches `.cast-sprite`, `.cast-strip` and `.battle-fx.cast-fx`. */
export const CAST_HEIGHT = 176;

/** Map token height. Taller than the old 64px rig, still small enough to sit on a marker. */
export const MAP_CAST_HEIGHT = 96;

/** Painted hero in the HUD. */
export const HUD_CAST_HEIGHT = 64;

/** Painted hero on a shop card or a body button. */
export const THUMB_CAST_HEIGHT = 72;

/** Painted hero in a portrait: shop detail, avatar preview, onboarding, deploy. */
export const PORTRAIT_CAST_HEIGHT = 160;

const ATTACK_BEATS = new Set(["lunge", "cast", "special"]);

/** Battle pose for a beat. A strike or a cast plays the attack strip; anything else holds idle. There is no jump sheet. */
export function castBattlePose(hero?: string): "idle" | "attack" {
  return hero && ATTACK_BEATS.has(hero) ? "attack" : "idle";
}

/** Map pose. Walking or a pending travel plays the walk strip. */
export function castMapPose(moving: boolean): "idle" | "walk" {
  return moving ? "walk" : "idle";
}

/** Painted hero for a body. Anything other than `feminino` uses the masculine sheets. */
export function castHeroId(body: string, pose: "idle" | "walk" | "run" | "attack" | "interact"): string {
  return `hero-${body === "feminino" ? "f" : "m"}-${pose}`;
}

/** Display box for a cast piece at the arena height. */
export function castBox(item: CastItem, height = CAST_HEIGHT) {
  const aspect = item.cellW / item.cellH;
  return { height, width: Math.round(height * aspect), aspect };
}

export function castFxStyle(item: CastItem, height = CAST_HEIGHT): CSSProperties {
  const { aspect } = castBox(item, height);
  return {
    backgroundImage: `url(${item.src})`,
    ["--cast-aspect" as string]: String(aspect),
    ["--cast-frames" as string]: String(item.frames),
    ["--cast-shift" as string]: `${-height * aspect * item.frames}px`,
  };
}
