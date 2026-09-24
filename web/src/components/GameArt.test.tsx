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
