import { rackBonus } from "./rack";
import type { Bonus, Catalog, Player, Price } from "./types";

/** Short bonus for a card: "+8% DMG", "+20 SP", "+15 HP" or "sem bônus". */
export function bonusShort(b: Bonus | null): string {
  if (!b) return "sem bônus";
  return b.type === "dmg" ? `+${b.amount}% DMG` : `+${b.amount} ${b.type.toUpperCase()}`;
}

/** Bonus for a detail panel: "+8% de dano", "+20 SP", "+15 HP" or "sem bônus de atributo". */
export function bonusLong(b: Bonus | null): string {
  if (!b) return "sem bônus de atributo";
  return b.type === "dmg" ? `+${b.amount}% de dano` : `+${b.amount} ${b.type.toUpperCase()}`;
}

/** Card price: "15g" in gems, "50c" in coins. */
export function priceShort(p: Price): string {
  return `${p.amount}${p.currency === "gems" ? "g" : "c"}`;
}

/** Detail price: "120 GEMS" or "50 COINS". */
export function priceLong(p: Price): string {
  return `${p.amount} ${p.currency === "gems" ? "GEMS" : "COINS"}`;
}

export function canPay(player: Player, p: Price): boolean {
  return (p.currency === "gems" ? player.gems : player.coins) >= p.amount;
}

export function insufficient(p: Price): string {
  return p.currency === "gems" ? "GEMS INSUFICIENTES" : "COINS INSUFICIENTES";
}

export function quantity(player: Player, item: string): number {
  return player.inventory.find((i) => i.item === item)?.quantity ?? 0;
}

export function isEquipped(player: Player, gearId: string, slot: string): boolean {
  return player.equipment[slot] === gearId;
}

/** Total bonus of one type over skills, equipped gear, the worn skin and the rack, as the api sums it (AD-012, AD-014). */
export function totalBonus(catalog: Catalog, player: Player, type: Bonus["type"]): number {
  const skills = catalog.skillTrees
    .flatMap((t) => t.nodes)
    .filter((n) => player.skills.includes(n.id) && n.bonus.type === type)
    .reduce((sum, n) => sum + n.bonus.amount, 0);
  const gear = catalog.gear
    .filter((g) => player.equipment[g.slot] === g.id && g.bonus.type === type)
    .reduce((sum, g) => sum + g.bonus.amount, 0);
  const skin = catalog.skins.find((s) => s.id === player.skin)?.bonus;
  return skills + gear + (skin?.type === type ? skin.amount : 0) + rackBonus(catalog, player, type);
}

/** Toast after a successful shop or avatar action; everything else shows the api's message. */
export const CONNECTION_FAILED = "falha na conexão. tente de novo.";
