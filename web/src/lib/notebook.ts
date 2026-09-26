import type { Catalog, NotebookUpgrade, Player } from "./types";

const LABEL: Record<NotebookUpgrade["bonus"], string> = {
  dmg: "DANO",
  hp: "HP",
  sp: "SP",
  spregen: "REGEN SP",
};

/** The notebook's share of one bonus, clamped the way the api clamps it (AD-024). */
export function notebookBonus(catalog: Catalog, player: Player, type: string): number {
  const nb = player.notebook;
  if (!nb || nb.level < 1 || catalog.notebook.levels.length === 0) return 0;
  const lv = catalog.notebook.levels[Math.min(nb.level, catalog.notebook.levels.length) - 1];
  let sum = type === "dmg" ? lv.dmg : type === "hp" ? lv.hp : 0;
  for (const u of catalog.notebook.upgrades) {
    if (u.bonus !== type || u.levels.length === 0) continue;
    const k = nb.upgrades[u.id] ?? 0;
    if (k < 1) continue;
    sum += u.levels[Math.min(k, u.levels.length) - 1].amount;
  }
  return sum;
}

export function rarityOf(catalog: Catalog, player: Player) {
  return catalog.notebook.rarities.find((r) => r.id === player.notebook.rarity) ?? catalog.notebook.rarities[0];
}

/** "+2% DANO" or "+10 HP". */
export function amountText(bonus: NotebookUpgrade["bonus"], amount: number): string {
  return bonus === "dmg" ? `+${amount}% ${LABEL[bonus]}` : `+${amount} ${LABEL[bonus]}`;
}

/** "NV 1/3" effect, from the current amount to the next. At max, only the current. */
export function effectText(u: NotebookUpgrade, level: number): string {
  const cap = Math.min(Math.max(level, 0), u.levels.length);
  const current = cap === 0 ? 0 : u.levels[cap - 1].amount;
  if (cap >= u.levels.length) return amountText(u.bonus, current);
  return `${amountText(u.bonus, current).replace(` ${LABEL[u.bonus]}`, "")} → ${amountText(u.bonus, u.levels[cap].amount)}`;
}
