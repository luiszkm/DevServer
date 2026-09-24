import type { Catalog, Player, RackComponent, RackStat } from "./types";

export type RackStatValue = { stat: RackStat; value: number; bonus: number };

/** Each stat as the api computes it (AD-014): min(max, base + Σ effects), bonus floor((value − base) / step). */
export function rackStats(catalog: Catalog, player: Player): RackStatValue[] {
  const installed = (player.rack ?? [])
    .map((id) => catalog.rack.components.find((k) => k.id === id))
    .filter((k): k is RackComponent => k !== undefined);
  return catalog.rack.stats.map((stat) => {
    const sum = installed.flatMap((k) => k.effects).filter((e) => e.stat === stat.id).reduce((a, e) => a + e.amount, 0);
    const value = Math.min(stat.max, stat.base + sum);
    return { stat, value, bonus: Math.floor((value - stat.base) / stat.step) };
  });
}

/** The rack's share of one bonus type. */
export function rackBonus(catalog: Catalog, player: Player, type: string): number {
  return rackStats(catalog, player)
    .filter((s) => s.stat.bonus === type)
    .reduce((a, s) => a + s.bonus, 0);
}

/** "power +25", "power +12 · uptime +8". */
export function effectsText(k: RackComponent): string {
  return k.effects.map((e) => `${e.stat} +${e.amount}`).join(" · ");
}

/** The bar's reading: UPTIME is a percentage, POWER and RAM are plain numbers. */
export function statValue(s: RackStatValue): string {
  return s.stat.id === "uptime" ? `${s.value}%` : String(s.value);
}

/** "DANO +4%", "SP MÁX +6", "COINS DE DEPLOY +20%". */
export function statBonus(s: RackStatValue): string {
  if (s.stat.bonus === "dmg") return `DANO +${s.bonus}%`;
  if (s.stat.bonus === "sp") return `SP MÁX +${s.bonus}`;
  return `COINS DE DEPLOY +${s.bonus}%`;
}

export const slotLabel = (i: number) => `0${i + 1}`;
