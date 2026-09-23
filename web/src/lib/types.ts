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

export type Catalog = {
  version: string;
  regions: Region[];
  deployTypes: DeployType[];
  deployLevels: DeployLevel[];
  skillTrees: SkillTree[];
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
