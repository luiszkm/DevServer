import { describe, expect, it } from "vitest";
import { beatOf, fxOf, type Beat, type FxId } from "./battleFx";
import type { BattleEvent } from "./types";

describe("beatOf", () => {
  it.each<[string, BattleEvent, Beat]>([
    [
      "damage",
      { type: "damage", command: "fix", amount: 20 },
      { hero: "lunge", enemy: "hit", fx: { id: "slash", on: "enemy" }, float: { text: "-20", tone: "damage", on: "enemy" }, enemyHp: -20, ms: 600 },
    ],
    [
      "damage crit",
      { type: "damage", command: "f2", amount: 36, weakness: true },
      { hero: "lunge", enemy: "hit", fx: { id: "code", on: "enemy" }, float: { text: "-36 CRÍTICO!", tone: "crit", on: "enemy" }, shake: true, enemyHp: -36, ms: 600 },
    ],
    ["heal", { type: "heal", amount: 18 }, { hero: "cast", fx: { id: "heal", on: "hero" }, float: { text: "+18 HP", tone: "heal", on: "hero" }, heroHp: 18, ms: 450 }],
    ["weakness", { type: "weakness" }, { hero: "cast", fx: { id: "scan", on: "enemy" }, float: { text: "FRAQUEZA!", tone: "info", on: "enemy" }, ms: 450 }],
    ["shield", { type: "shield" }, { hero: "cast", fx: { id: "shield", on: "hero" }, ms: 450 }],
    ["sp", { type: "sp", amount: 3 }, { hero: "cast", float: { text: "+3 SP", tone: "sp", on: "hero" }, ms: 450 }],
    [
      "item hp",
      { type: "item", item: "hp_potion", stat: "hp", amount: 40 },
      { hero: "cast", fx: { id: "heal", on: "hero" }, float: { text: "+40 HP", tone: "heal", on: "hero" }, heroHp: 40, ms: 450 },
    ],
    [
      "item sp",
      { type: "item", item: "sp_potion", stat: "sp", amount: 30 },
      { hero: "cast", fx: { id: "heal", on: "hero" }, float: { text: "+30 SP", tone: "sp", on: "hero" }, ms: 450 },
    ],
    [
      "counter",
      { type: "counter", amount: 9 },
      { hero: "hit", enemy: "lunge", fx: { id: "impact", on: "hero" }, float: { text: "-9", tone: "damage", on: "hero" }, heroHp: -9, ms: 600 },
    ],
    [
      "counter blocked",
      { type: "counter", amount: 5, blocked: true },
      { hero: "hit", enemy: "lunge", fx: { id: "shield", on: "hero" }, float: { text: "-5", tone: "damage", on: "hero" }, heroHp: -5, ms: 600 },
    ],
    ["victory", { type: "victory" }, { enemy: "defeat", ms: 700 }],
    ["reward", { type: "reward", xp: 90, coins: 40, gems: 1, levelsGained: 0 }, { float: { text: "+90 XP", tone: "reward", on: "hero" }, ms: 450 }],
    ["drop", { type: "drop", item: "null_shard" }, { float: { text: "+1", tone: "reward", on: "enemy", item: "null_shard" }, ms: 450 }],
    ["defeat", { type: "defeat" }, { hero: "fall", ms: 700 }],
    ["fled", { type: "fled" }, { hero: "flee", ms: 450 }],
  ])("%s", (_name, event, beat) => {
    expect(beatOf(event)).toEqual(beat);
  });
});

describe("fxOf", () => {
  it.each<[string | undefined, FxId]>([
    ["fix", "slash"],
    ["f1", "code"],
    ["f2", "code"],
    ["f3", "code"],
    ["b1", "data"],
    ["b3", "data"],
    ["i1", "scan"],
    ["i3", "bolt"],
    ["unknown", "slash"],
    [undefined, "slash"],
  ])("%s", (command, fx) => {
    expect(fxOf(command)).toBe(fx);
  });
});
