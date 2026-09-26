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
  /** Every rack slot, with the installed component id or null. */
  rack: (string | null)[];
  /** Body type, picked at creation; only a redesign token changes it. */
  body: string;
  /** Every avatar part, with the chosen option id (catalog defaults fill what was never picked). */
  appearance: Record<string, string>;
  /** Owned priced avatar options, catalog order. */
  looks: string[];
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

export type Enemy = { id: string; region: string; name: string; level: number; hp: number; sp: number; weakness: string; drop: string; glyph: string };

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
  /** Absent for gear the shop does not sell (made only at the forge). */
  price?: Price;
  bonus: Bonus;
  /** The avatar option this gear puts on the hero while equipped. */
  look?: { part: string; option: string };
};

export type Skin = {
  id: string;
  name: string;
  rarity: string;
  description: string;
  /** Ramps (4 tones, darkest first) this skin forces on avatar colour parts while worn. */
  palette: Record<string, string[]>;
  price: Price;
  bonus: Bonus | null;
};

export type AvatarPart = { id: string; name: string; kind: "color" | "style"; gearSlot?: string };

export type AvatarOption = {
  id: string;
  part: string;
  name: string;
  /** Colour options: 4 tones, darkest first. */
  ramp?: string[];
  /** Style options: the PNG at /art/sprite/hero/<layer>.png. */
  layer?: string;
  /** A style with its own colours; the part's colour does not apply. */
  fixed?: boolean;
  /** Worn only through gear; never picked. */
  gearOnly?: boolean;
  /** Bodies that can wear it; absent means every body. */
  bodies?: string[];
  price?: Price;
};

/** A body type; `defaults` overrides the avatar defaults for that body. */
export type AvatarBody = { id: string; name: string; defaults?: Record<string, string> };

export type Avatar = { bodies: AvatarBody[]; parts: AvatarPart[]; options: AvatarOption[]; defaults: Record<string, string> };

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

/** POWER, RAM or UPTIME: base + installed effects, capped at max; each step above base adds 1 to `bonus` (AD-014). */
export type RackStat = { id: string; name: string; color: string; base: number; max: number; step: number; bonus: "dmg" | "sp" | "coins" };

export type RackComponent = {
  id: string;
  name: string;
  glyph: string;
  color: string;
  price: Price;
  effects: { stat: string; amount: number }[];
};

export type Rack = { slots: number; stats: RackStat[]; components: RackComponent[] };

/** A forge recipe: its ingredients, plus an optional price, make one unit of its output. */
export type Recipe = {
  id: string;
  output: { kind: "item" | "gear"; id: string };
  ingredients: { item: string; quantity: number }[];
  price?: Price;
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
  avatar: Avatar;
  office: Office;
  rack: Rack;
  recipes: Recipe[];
};

export type Battle = {
  /** The catalog id of the enemy this battle drew (assets-apply door 2). */
  enemy: string;
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
