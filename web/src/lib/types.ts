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

export type Catalog = {
  version: string;
  regions: Region[];
  deployTypes: DeployType[];
  deployLevels: DeployLevel[];
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
