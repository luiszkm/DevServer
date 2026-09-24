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
  /** Owned gear ids, catalog order. */
  gear: string[];
  /** Every catalog slot, with the equipped gear id or null. */
  equipment: Record<string, string | null>;
  /** Owned skin ids, catalog order, always with "default". */
  skins: string[];
  /** Every catalog zone, each a list of its positions with the installed furniture id or null. */
  office: Record<string, (string | null)[]>;
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
  bonus: Bonus;
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

export type Bonus = { type: "hp" | "sp" | "dmg"; amount: number };

export type Price = { currency: "gems" | "coins"; amount: number };

export type Item = {
  id: string;
  name: string;
  glyph: string;
  rarity: string;
  description: string;
  restore?: { stat: "sp" | "hp"; amount: number };
  /** Absent for items the shop does not sell (drops). */
  price?: Price;
};

export type GearSlot = { id: string; name: string };

export type Gear = {
  id: string;
  name: string;
  glyph: string;
  slot: string;
  rarity: string;
  description: string;
  price: Price;
  bonus: Bonus;
};

export type Skin = {
  id: string;
  name: string;
  rarity: string;
  description: string;
  filter: string;
  price: Price;
  bonus: Bonus | null;
};

/** Furniture bonus: "xp" is % deploy XP, "deploy" is % off deploy time, "spregen" is SP per turn. */
export type OfficeBonus = { type: "xp" | "deploy" | "spregen"; amount: number };

export type OfficeZone = { id: string; name: string; cells: number };

export type Furniture = {
  id: string;
  name: string;
  glyph: string;
  color: string;
  zone: string;
  price: Price;
  comfort: number;
  bonus: OfficeBonus | null;
  description: string;
};

export type OfficeLevel = { min: number; name: string };

export type Office = {
  zones: OfficeZone[];
  furniture: Furniture[];
  levels: OfficeLevel[];
  maxDeployCut: number;
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
  gearSlots: GearSlot[];
  gear: Gear[];
  skins: Skin[];
  office: Office;
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
