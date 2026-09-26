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
  /** Unlocked skill ids, catalog order. */
  skills: string[];
  /** Every unlocked skill id with its level (1..3). */
  skillLevels: Record<string, number>;
  /** Every skill slot (catalog `skillSlots`), with the equipped skill id or null. */
  loadout: (string | null)[];
  /** Power bar, 0..combat.power.max; full enables the class's limit command. */
  power: number;
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
  /** The weapon: stored level, derived rarity, and every catalog upgrade (0 when never bought). */
  notebook: { level: number; rarity: string; upgrades: Record<string, number> };
  /** Owned priced avatar options, catalog order. */
  looks: string[];
  /** Nodes cleared per region. A missing region means none (AD-021). */
  progress: Record<string, number>;
};

/** One fight on a region's trail. The last node has `boss` set (AD-021). */
export type PathNode = { id: string; enemy: string; boss?: boolean };

export type Region = {
  id: string;
  name: string;
  tag: string;
  minLevel: number;
  description: string;
  path: PathNode[];
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

/** One level of a skill: its cost in skill points, the passive while equipped, and the % its command plays at. */
export type SkillLevel = { cost: number; bonus: number; scale: number };

export type SkillNode = {
  id: string;
  glyph: string;
  name: string;
  description: string;
  bonus: { type: Bonus["type"] };
  /** Levels 1..n in order; unlocking pays levels[0].cost. */
  levels: SkillLevel[];
};

export type SkillTree = { id: string; name: string; class: string; role: string; nodes: SkillNode[] };

export type Enemy = { id: string; region: string; name: string; level: number; hp: number; sp: number; weakness: string; drop: string; glyph: string; boss?: boolean };

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
  /** Limit commands spend the full power bar instead of SP and belong to one class. */
  limit?: boolean;
  class?: string;
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
  /** XP granted when used from the inventory; absent for items that cannot be used there. */
  xp?: number;
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
  /** The power bar: +perHit per hit, +perCrit when the hit consumed the weakness, capped at max. */
  power: { max: number; perHit: number; perCrit: number };
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

export type NotebookRarity = { id: string; name: string; from: number; look?: string };
export type NotebookLevel = { cost: number | null; dmg: number; hp: number };
export type NotebookUpgrade = {
  id: string;
  name: string;
  description: string;
  bonus: "dmg" | "hp" | "sp" | "spregen";
  levels: { minLevel: number; cost: number; amount: number }[];
};
export type NotebookCatalog = { rarities: NotebookRarity[]; levels: NotebookLevel[]; upgrades: NotebookUpgrade[] };

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
  /** How many skills a player equips at once. */
  skillSlots: number;
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
  notebook: NotebookCatalog;
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
  /** Path node this fight was started from. Absent on a random encounter. */
  node?: string;
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
