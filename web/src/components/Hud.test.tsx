import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, player } from "@/test/helpers";
import { GameShell } from "./GameShell";
import { Hud } from "./Hud";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("Hud", () => {
  // C23
  it("renders player values", () => {
    render(<Hud player={player({ level: 3, xp: 40, xpMax: 1000, hp: 80, hpMax: 140, coins: 55, gems: 7, skillPoints: 2 })} />);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    for (const text of ["LEVEL 3", "40/1000", "HP 80/140", "55", "7", "2"]) {
      expect(within(hud).getByText(text)).toBeInTheDocument();
    }
    expect(within(hud).getByText("COINS")).toBeInTheDocument();
    expect(within(hud).getByText("GEMS")).toBeInTheDocument();
    expect(within(hud).getByText("SKILL PTS")).toBeInTheDocument();
  });

  // C24
  it("pending shows CARREGANDO", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<GameShell><p>cena</p></GameShell>);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    expect(within(hud).getByText("CARREGANDO...")).toBeInTheDocument();
    expect(hud.textContent).not.toMatch(/\d/);
  });

  it("shows SAIR only when a logout handler is given", () => {
    const { rerender } = render(<Hud player={player()} />);
    expect(screen.queryByRole("button", { name: "SAIR" })).not.toBeInTheDocument();
    rerender(<Hud player={player()} onLogout={vi.fn()} />);
    expect(screen.getByRole("button", { name: "SAIR" })).toBeInTheDocument();
  });

  // C22
  it.each([
    [["f1", "b1"], "</>$_"],
    [[], "sem habilidades ativas"],
  ])("shows active skill glyphs (%j)", (skills, text) => {
    render(<Hud player={player({ skills })} catalog={CATALOG} />);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    const card = within(hud).getByText("SKILL PTS").parentElement!;
    if (skills.length) expect(within(card).getByLabelText("habilidades ativas").textContent).toBe(text);
    else expect(within(card).getByText(text)).toBeInTheDocument();
  });
});
