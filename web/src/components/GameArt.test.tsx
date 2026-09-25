import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameArt, type ArtKind } from "./GameArt";

describe("GameArt", () => {
  // C1: door 1 address, native size x scale, alt passed through
  it.each<[ArtKind, string, number, string, number]>([
    ["item", "hp_potion", 2, "/art/icon/item-hp_potion.png", 32],
    ["gear", "macbook", 4, "/art/icon/gear-macbook.png", 64],
    ["skill", "f1", 2, "/art/icon/skill-f1.png", 32],
    ["deploy", "backend", 2, "/art/icon/deploy-backend.png", 32],
    ["rack", "gpu", 3, "/art/icon/rack-gpu.png", 48],
    ["office", "mesa", 2, "/art/icon/office-mesa.png", 32],
    ["region", "vila", 2, "/art/icon/region-vila.png", 32],
    ["hud", "coin", 2, "/art/icon/hud-coin.png", 32],
    ["enemy", "vila", 4, "/art/sprite/enemy-vila.png", 128],
    ["enemy", "torre", 1, "/art/sprite/enemy-torre.png", 48],
    ["enemy", "nuvem", 1, "/art/sprite/enemy-nuvem.png", 64],
    ["enemy", "torre", 3, "/art/sprite/enemy-torre.png", 144],
    ["enemy", "nuvem", 2, "/art/sprite/enemy-nuvem.png", 128],
  ])("address and size (%s %s x%i)", (kind, id, scale, src, size) => {
    render(<GameArt kind={kind} id={id} scale={scale} alt="retrato" fallback="?" />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe(src);
    expect(img.getAttribute("width")).toBe(String(size));
    expect(img.getAttribute("height")).toBe(String(size));
    expect(img.getAttribute("alt")).toBe("retrato");
    expect(img.className.split(/\s+/)).toContain("pixelated");
  });

  it("address and size (empty alt stays empty)", () => {
    const { container } = render(<GameArt kind="item" id="hp_potion" scale={2} alt="" fallback="HP+" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe("");
  });

  // game-menu C3: the scene menu kind (door 2)
  it("menu address", () => {
    render(<GameArt kind="menu" id="loja" scale={2} alt="" fallback="" />);
    const img = document.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/art/icon/menu-loja.png");
    expect(img.getAttribute("width")).toBe("32");
    expect(img.getAttribute("height")).toBe("32");
    expect(img.className.split(/\s+/)).toContain("pixelated");
  });

  // assets C8: the kinds added by the asset sheet (door 1); icons are 16, sprites 32, the server hut 96
  it.each<[ArtKind, string, string, number]>([
    ["btn", "exit", "/art/icon/btn-exit.png", 16],
    ["ic", "lock", "/art/icon/ic-lock.png", 16],
    ["medal", "ouro", "/art/icon/medal-ouro.png", 16],
    ["prop", "rack", "/art/sprite/prop-rack.png", 32],
    ["build", "flag", "/art/sprite/build-flag.png", 32],
    ["build", "server-hut", "/art/sprite/build-server-hut.png", 96],
    ["mob", "robo", "/art/sprite/mob-robo.png", 32],
    ["npc", "dev", "/art/sprite/npc-dev.png", 32],
    ["extra", "bau", "/art/sprite/extra-bau.png", 32],
  ])("new kinds (%s %s)", (kind, id, src, size) => {
    render(<GameArt kind={kind} id={id} scale={1} alt="" fallback="" />);
    const img = document.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(src);
    expect(img.getAttribute("width")).toBe(String(size));
    expect(img.getAttribute("height")).toBe(String(size));
  });

  // C2
  it("fallback replaces the image after an error", () => {
    const { container } = render(<GameArt kind="item" id="hp_potion" scale={2} alt="" fallback="HP+" />);
    const img = container.querySelector("img")!;
    expect(screen.queryByText("HP+")).not.toBeInTheDocument();
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("HP+")).toBeInTheDocument();
  });

  it("fallback resets when the id changes", () => {
    const { container, rerender } = render(<GameArt kind="item" id="hp_potion" scale={2} alt="" fallback="HP+" />);
    fireEvent.error(container.querySelector("img")!);
    rerender(<GameArt kind="item" id="sp_potion" scale={2} alt="" fallback="++" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/art/icon/item-sp_potion.png");
  });
});
