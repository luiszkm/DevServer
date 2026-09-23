import type { BattleEvent, Catalog, Enemy } from "./types";

/** Turns one turn event into the pt-BR log line the prototype shows. */
export function eventText(e: BattleEvent, enemy: Enemy, catalog: Catalog): string {
  // Ids in events always come from the catalog the api serves.
  const itemName = (id?: string) => catalog.items.find((i) => i.id === id)!.name;
  const label = () => catalog.commands.find((c) => c.id === e.command)!.label;
  switch (e.type) {
    case "damage":
      return `> ${label()}: ${e.amount} de dano${e.weakness ? " (crítico!)" : ""}`;
    case "heal":
      return `> +${e.amount} HP`;
    case "weakness":
      return `> fraqueza "${enemy.weakness}" exposta: próximo golpe é crítico.`;
    case "shield":
      return "> postura de defesa ativada: o próximo golpe é reduzido pela metade.";
    case "sp":
      return `> +${e.amount} SP recuperado.`;
    case "item":
      return `> ${itemName(e.item)} usada: +${e.amount} ${e.stat!.toUpperCase()}`;
    case "counter":
      return e.blocked ? `< escudo absorve parte do golpe: -${e.amount} HP` : `< ${enemy.name} devolve um stack trace: -${e.amount} HP`;
    case "victory":
      return `[OK] ${enemy.name} resolvido. exceção tratada.`;
    case "reward":
      return `+${e.xp} XP · +${e.coins} coins · +${e.gems} gems` + (e.levelsGained ? ` · +${e.levelsGained} nível!` : "");
    case "drop":
      return `+1 ${itemName(e.item)} · dropou!`;
    case "defeat":
      return "> você caiu. respawn na Vila Localhost com HP cheio.";
    case "fled":
      return "> ROLLBACK executado. de volta ao mapa.";
  }
}
