import type { Catalog, OfficeBonus, OfficeLevel, Player, Price } from "./types";

export type OfficeStats = { count: number; comfort: number; xp: number; deploy: number; spregen: number };

/** Sums the installed furniture as the api does (AD-013): "deploy" capped at maxDeployCut. */
export function officeStats(catalog: Catalog, player: Player): OfficeStats {
  const stats: OfficeStats = { count: 0, comfort: 0, xp: 0, deploy: 0, spregen: 0 };
  for (const cells of Object.values(player.office)) {
    for (const id of cells) {
      const f = id ? catalog.office.furniture.find((x) => x.id === id) : undefined;
      if (!f) continue;
      stats.count++;
      stats.comfort += f.comfort;
      if (f.bonus) stats[f.bonus.type] += f.bonus.amount;
    }
  }
  stats.deploy = Math.min(catalog.office.maxDeployCut, stats.deploy);
  return stats;
}

/** The highest level whose min the comfort reaches, and the one after it. */
export function officeLevel(catalog: Catalog, comfort: number): { level: OfficeLevel; next: OfficeLevel | null } {
  const levels = catalog.office.levels;
  let i = 0;
  levels.forEach((l, idx) => {
    if (comfort >= l.min) i = idx;
  });
  return { level: levels[i], next: levels[i + 1] ?? null };
}

/** "+3% XP", "-5% tempo", "+1 SP/turno". */
export function furnitureBonus(b: OfficeBonus): string {
  if (b.type === "xp") return `+${b.amount}% XP`;
  if (b.type === "deploy") return `-${b.amount}% tempo`;
  return `+${b.amount} SP/turno`;
}

/** What removing a piece gives back: half the price, rounded down, in its currency. */
export function refundText(p: Price): string {
  return `+${Math.floor(p.amount / 2)} ${p.currency === "gems" ? "GEMS" : "COINS"}`;
}
