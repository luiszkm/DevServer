import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, REGIONS, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { WorldScene } from "./WorldScene";

function renderWorld(p: Player, catalog: Catalog = CATALOG) {
  return render(
    <GameContext.Provider value={{ player: p, catalog, setPlayer: vi.fn() }}>
      <WorldScene />
    </GameContext.Provider>,
  );
}

const button = (regionName: string) =>
  within(screen.getByRole("article", { name: regionName })).getByRole("button");

describe("WorldScene", () => {
  // C33
  it("min levels come from catalog", () => {
    const catalog = { ...CATALOG, regions: REGIONS.map((r) => (r.id === "vila" ? { ...r, minLevel: 3 } : r)) };
    renderWorld(player({ level: 1 }), catalog);
    expect(button("VILA LOCALHOST")).toHaveTextContent("REQUER NÍVEL 3");
    expect(button("VILA LOCALHOST")).toBeDisabled();
  });

  // C34
  it("locks regions above player level", () => {
    renderWorld(player({ level: 1 }));
    for (const name of ["VILA LOCALHOST", "FLORESTA DE LOGS"]) {
      expect(button(name)).toHaveTextContent("VIAJAR ATÉ AQUI");
      expect(button(name)).toBeEnabled();
    }
    for (const [name, min] of [["MERCADO DE PACOTES", 2], ["CAVERNA DOS BUGS", 5], ["TORRE DE DEPLOY", 8], ["PICOS DA NUVEM", 12]]) {
      expect(button(name as string)).toHaveTextContent(`REQUER NÍVEL ${min}`);
      expect(button(name as string)).toBeDisabled();
    }
  });

  // C39
  it("shows current region", () => {
    const { container } = renderWorld(player({ region: "floresta" }));
    expect(screen.getByText("região atual: FLORESTA DE LOGS")).toBeInTheDocument();
    const current = container.querySelectorAll('[aria-current="location"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("data-region", "floresta");
  });
});
