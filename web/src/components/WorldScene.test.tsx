import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, REGIONS, json, mockFetch, player } from "@/test/helpers";
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

  it("renders regions in catalog order", () => {
    const reversed = { ...CATALOG, regions: [...REGIONS].reverse() };
    renderWorld(player(), reversed);
    const names = screen.getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual([...REGIONS].reverse().map((r) => r.name));
  });

  it("shows the api message when travel is refused and keeps the player", async () => {
    mockFetch({ "POST /api/me/travel": json(422, { error: { code: "level_too_low", message: "nível insuficiente para esta região" } }) });
    const setPlayer = vi.fn();
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer }}>
        <WorldScene />
      </GameContext.Provider>,
    );
    await userEvent.click(button("FLORESTA DE LOGS"));
    expect(await screen.findByRole("alert")).toHaveTextContent("nível insuficiente para esta região");
    expect(setPlayer).not.toHaveBeenCalled();
  });

  it("shows SERVIDOR FORA DO AR when travel hits a network error", async () => {
    mockFetch({ "POST /api/me/travel": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderWorld(player());
    await userEvent.click(button("FLORESTA DE LOGS"));
    expect(await screen.findByRole("alert")).toHaveTextContent("SERVIDOR FORA DO AR");
  });
});
