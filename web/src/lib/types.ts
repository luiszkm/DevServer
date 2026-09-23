export type Player = {
  devName: string;
  class: string;
  level: number;
  xp: number;
  xpMax: number;
  hp: number;
  hpMax: number;
  coins: number;
  gems: number;
  skillPoints: number;
  region: string;
  skin: string;
  skills: string[];
  inventory: { item: string; quantity: number }[];
};

export type Region = {
  id: string;
  name: string;
  tag: string;
  minLevel: number;
  description: string;
};

export type DeployType = { id: string; name: string; glyph: string };

export type DeployLevel = {
  level: number;
  minLevel: number;
  minutes: number;
  xp: number;
  coins: number;
  gems: number;
};

export type SkillNode = {
  id: string;
  glyph: string;
  name: string;
  description: string;
  bonus: { type: "hp" | "sp" | "dmg"; amount: number };
};

export type SkillTree = { id: string; name: string; nodes: SkillNode[] };

export type Enemy = { region: string; name: string; level: number; hp: number; sp: number; weakness: string; drop: string; glyph: string };

export type Command = {
  id: string;
  label: string;
  hint: string;
  cost: number;
  damage?: [number, number];
  heal?: number;
  exposesWeakness?: boolean;
  shield?: boolean;
  spGain?: number;
  flee?: boolean;
  skill?: string;
};

export type Item = {
  id: string;
  name: string;
  glyph: string;
  rarity: string;
  description: string;
  restore?: { stat: "sp" | "hp"; amount: number };
};

export type CombatRules = {
  counter: [number, number];
  spRegen: number;
  weaknessMultiplier: number;
  victory: { xp: number; coins: number; gems: number };
  dropChance: number;
  potionChance: number;
  potion: string;
};

export type Catalog = {
  version: string;
  regions: Region[];
  deployTypes: DeployType[];
  deployLevels: DeployLevel[];
  skillTrees: SkillTree[];
  enemies: Enemy[];
  commands: Command[];
  items: Item[];
  combat: CombatRules;
};

export type Battle = {
  region: string;
  enemyHp: number;
  enemyHpMax: number;
  sp: number;
  spMax: number;
  weakness: boolean;
  status: "active" | "won";
};

export type BattleEvent = {
  type: "damage" | "heal" | "weakness" | "shield" | "sp" | "item" | "counter" | "victory" | "reward" | "drop" | "defeat" | "fled";
  command?: string;
  item?: string;
  stat?: string;
  amount?: number;
  weakness?: boolean;
  blocked?: boolean;
  xp?: number;
  coins?: number;
  gems?: number;
  levelsGained?: number;
};

export type DeployJob = {
  type: string;
  level: number;
  startedAt: string;
  endsAt: string;
  ready: boolean;
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
