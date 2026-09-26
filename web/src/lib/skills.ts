import type { Bonus, Catalog, Command, Player, SkillLevel, SkillNode, SkillTree } from "./types";

/** The player's class tree (AD-018). */
export function classTree(catalog: Catalog, player: Player): SkillTree | undefined {
  return catalog.skillTrees.find((t) => t.class === player.class);
}

/** The class's limit command, the special of the fifth slot. */
export function classSpecial(catalog: Catalog, player: Player): Command | undefined {
  return catalog.commands.find((c) => c.limit && c.class === player.class);
}

/** Always-known kit: catalog commands with no skill and no limit (FIX, TEST, …, ROLLBACK). */
export function baseCommands(catalog: Catalog): Command[] {
  return catalog.commands.filter((c) => !c.skill && !c.limit);
}

/** The battle command whose `skill` matches an equipped id. */
export function commandForSkill(catalog: Catalog, skillId: string): Command | undefined {
  return catalog.commands.find((c) => c.skill === skillId);
}

/** The level of an unlocked skill; 0 when it is not unlocked. */
export function skillLevel(player: Player, id: string): number {
  return player.skillLevels[id] ?? 0;
}

/** A node's entry for a level, clamped to the levels it has, as the api reads it. */
export function levelOf(node: SkillNode, level: number): SkillLevel {
  return node.levels[Math.max(0, Math.min(level, node.levels.length) - 1)];
}

export function inLoadout(player: Player, id: string): boolean {
  return player.loadout.includes(id);
}

/** Passive of one type over the equipped skills at their level, as `player.Bonus` sums it (AD-019). */
export function loadoutBonus(catalog: Catalog, player: Player, type: Bonus["type"]): number {
  return catalog.skillTrees
    .flatMap((t) => t.nodes)
    .filter((n) => inLoadout(player, n.id) && n.bonus.type === type)
    .reduce((sum, n) => sum + levelOf(n, skillLevel(player, n.id)).bonus, 0);
}

/** "+12 SP", "+15 HP" or "+10% dano": the passive of a node at an amount. */
export function passiveText(node: SkillNode, amount: number): string {
  return node.bonus.type === "dmg" ? `+${amount}% dano` : `+${amount} ${node.bonus.type.toUpperCase()}`;
}
