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
  slime_verde: "enemy-slime-verde",
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

/** Display box for a cast piece at the arena's 112px height. */
export function castBox(item: CastItem, height = 112) {
  const aspect = item.cellW / item.cellH;
  return { height, width: Math.round(height * aspect), aspect };
}

export function castFxStyle(item: CastItem, height = 112): CSSProperties {
  const { aspect } = castBox(item, height);
  return {
    backgroundImage: `url(${item.src})`,
    ["--cast-aspect" as string]: String(aspect),
    ["--cast-frames" as string]: String(item.frames),
    ["--cast-shift" as string]: `${-height * aspect * item.frames}px`,
  };
}
