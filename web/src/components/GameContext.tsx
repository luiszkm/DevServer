"use client";

import { createContext, useContext } from "react";
import type { Catalog, Player } from "@/lib/types";

export type Game = {
  player: Player;
  catalog: Catalog;
  /** Every mutation response carries the whole player; this is how the HUD follows it. */
  setPlayer: (p: Player) => void;
};

export const GameContext = createContext<Game | null>(null);

export function useGame(): Game {
  const g = useContext(GameContext);
  if (!g) throw new Error("useGame outside GameShell");
  return g;
}
