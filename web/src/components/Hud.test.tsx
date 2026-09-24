import { fireEvent, render, screen, within } from "@testing-library/react";
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
    [["f1", "b1"], ["MARKUP SEMÂNTICO", "API REST"]],
    [[], []],
  ])("shows active skill glyphs (%j)", (skills, names) => {
    render(<Hud player={player({ skills })} catalog={CATALOG} />);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    const card = within(hud).getByText("SKILL PTS").parentElement!;
    if (skills.length) expect(within(within(card).getByLabelText("habilidades ativas")).getAllByRole("img").map((i) => i.getAttribute("alt"))).toEqual(names);
    else expect(within(card).getByText("sem habilidades ativas")).toBeInTheDocument();
  });

  it("shows active skill glyphs only with a catalog (none without one)", () => {
    render(<Hud player={player({ skills: ["f1"] })} />);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    expect(within(hud).queryByLabelText("habilidades ativas")).not.toBeInTheDocument();
    expect(within(hud).queryByText("sem habilidades ativas")).not.toBeInTheDocument();
    expect(within(hud).getByText("SKILL PTS")).toBeInTheDocument();
  });

  // game-art C19
  it.each([[["f1"]], [["f1", "b2", "i3"]]])("skill art (%j)", (skills) => {
    render(<Hud player={player({ skills })} catalog={CATALOG} />);
    const chips = screen.getByLabelText("habilidades ativas");
    const imgs = within(chips).getAllByRole("img");
    const names: Record<string, string> = { f1: "MARKUP SEMÂNTICO", b2: "CAMADA DE CACHE", i3: "AUTO-SCALING" };
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(skills.map((id) => `/art/icon/skill-${id}.png`));
    expect(imgs.map((i) => i.getAttribute("alt"))).toEqual(skills.map((id) => names[id]));
    for (const img of imgs) {
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
    }
  });

  it("skill art (none active)", () => {
    render(<Hud player={player({ skills: [] })} catalog={CATALOG} />);
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    expect(within(hud).getByText("sem habilidades ativas")).toBeInTheDocument();
    expect(hud.querySelector('img[src^="/art/icon/skill-"]')).toBeNull();
  });

  it("skill art falls back to the glyph", () => {
    render(<Hud player={player({ skills: ["f1"] })} catalog={CATALOG} />);
    const chips = screen.getByLabelText("habilidades ativas");
    fireEvent.error(within(chips).getByRole("img"));
    expect(within(chips).queryByRole("img")).toBeNull();
    expect(chips).toHaveTextContent("</>");
  });

  // game-art C20
  it.each([
    ["XP", "hud-xp"],
    ["HP 100/100", "hud-heart"],
    ["COINS", "hud-coin"],
    ["GEMS", "hud-gem"],
  ])("currency art (%s)", (label, icon) => {
    render(<Hud player={player({ hp: 100, hpMax: 100 })} catalog={CATALOG} />);
    const card = screen.getByText(label).closest(".hud-card") as HTMLElement;
    const img = card.querySelector(`img[src="/art/icon/${icon}.png"]`)!;
    expect(img).not.toBeNull();
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("width")).toBe("32");
    expect(img).toHaveClass("pixelated");
  });
});
