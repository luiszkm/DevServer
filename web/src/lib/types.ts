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

export type Catalog = {
  version: string;
  regions: Region[];
};

export type ApiErrorBody = {
  error: { code: string; message: string };
};
