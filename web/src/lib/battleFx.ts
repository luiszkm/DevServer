import type { BattleEvent } from "./types";

export type HeroAnim = "lunge" | "hit" | "cast" | "fall" | "flee";
export type EnemyAnim = "lunge" | "hit" | "defeat";
/** A 4-frame strip at `/art/fx/<id>.png`. */
export type FxId = "slash" | "impact" | "code" | "data" | "bolt" | "scan" | "heal" | "shield";
export type Tone = "damage" | "crit" | "heal" | "sp" | "info" | "reward";
export type Side = "hero" | "enemy";

/**
 * How one turn event plays on the stage. `heroHp`/`enemyHp` are the HP change shown while the
 * turn plays; the server's state replaces them once the last beat ends.
 */
export type Beat = {
  hero?: HeroAnim;
  enemy?: EnemyAnim;
  fx?: { id: FxId; on: Side };
  float?: { text: string; tone: Tone; on: Side; item?: string };
  shake?: boolean;
  heroHp?: number;
  enemyHp?: number;
  ms: number;
};

// Damage commands grouped by skill tree; anything else lands a plain slash.
const COMMAND_FX: Record<string, FxId> = {
  fix: "slash",
  f1: "code",
  f2: "code",
  f3: "code",
  b1: "data",
  b3: "data",
  i1: "scan",
  i3: "bolt",
};

export function fxOf(command?: string): FxId {
  return (command && COMMAND_FX[command]) || "slash";
}

const HIT_MS = 600;
const BEAT_MS = 450;

export function beatOf(e: BattleEvent): Beat {
  const n = e.amount ?? 0;
  switch (e.type) {
    case "damage":
      return {
        hero: "lunge",
        enemy: "hit",
        fx: { id: fxOf(e.command), on: "enemy" },
        float: e.weakness ? { text: `-${n} CRÍTICO!`, tone: "crit", on: "enemy" } : { text: `-${n}`, tone: "damage", on: "enemy" },
        shake: e.weakness,
        enemyHp: -n,
        ms: HIT_MS,
      };
    case "heal":
      return { hero: "cast", fx: { id: "heal", on: "hero" }, float: { text: `+${n} HP`, tone: "heal", on: "hero" }, heroHp: n, ms: BEAT_MS };
    case "weakness":
      return { hero: "cast", fx: { id: "scan", on: "enemy" }, float: { text: "FRAQUEZA!", tone: "info", on: "enemy" }, ms: BEAT_MS };
    case "shield":
      return { hero: "cast", fx: { id: "shield", on: "hero" }, ms: BEAT_MS };
    case "sp":
      return { hero: "cast", float: { text: `+${n} SP`, tone: "sp", on: "hero" }, ms: BEAT_MS };
    case "item":
      return {
        hero: "cast",
        fx: { id: "heal", on: "hero" },
        float: { text: `+${n} ${e.stat!.toUpperCase()}`, tone: e.stat === "hp" ? "heal" : "sp", on: "hero" },
        heroHp: e.stat === "hp" ? n : undefined,
        ms: BEAT_MS,
      };
    case "counter":
      return {
        hero: "hit",
        enemy: "lunge",
        fx: { id: e.blocked ? "shield" : "impact", on: "hero" },
        float: { text: `-${n}`, tone: "damage", on: "hero" },
        heroHp: -n,
        ms: HIT_MS,
      };
    case "victory":
      return { enemy: "defeat", ms: 700 };
    case "reward":
      return { float: { text: `+${e.xp} XP`, tone: "reward", on: "hero" }, ms: BEAT_MS };
    case "drop":
      return { float: { text: "+1", tone: "reward", on: "enemy", item: e.item }, ms: BEAT_MS };
    case "defeat":
      return { hero: "fall", ms: 700 };
    case "fled":
      return { hero: "flee", ms: BEAT_MS };
  }
}
