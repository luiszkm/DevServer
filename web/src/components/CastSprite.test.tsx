import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { castById } from "@/lib/cast";
import { CastSprite } from "./CastSprite";

describe("CastSprite", () => {
  it("still points at the cast png", () => {
    render(<CastSprite id="enemy-cat" alt="GATO" />);
    const img = screen.getByRole("img", { name: "GATO" });
    expect(img.getAttribute("src")).toBe("/cast/enemy-cat.png");
    expect(img.getAttribute("height")).toBe("176");
    expect(img.className.split(/\s+/)).toContain("cast-sprite");
    expect(castById("enemy-cat").frames).toBe(1);
  });

  it("enemy idle is a four-frame strip", () => {
    render(<CastSprite id="enemy-slime" alt="SLIME DE CACHE" />);
    const strip = screen.getByRole("img", { name: "SLIME DE CACHE" });
    expect(strip.className.split(/\s+/)).toContain("cast-strip");
    expect(strip.dataset.frames).toBe("4");
    expect(strip.style.backgroundImage.replace(/"/g, "")).toBe("url(/cast/enemy-slime.png)");
    const item = castById("enemy-slime");
    expect(item.frames).toBe(4);
    expect(item.w).toBe(item.cellW * 4);
  });

  it("strip exposes four frames", () => {
    const { container } = render(<CastSprite id="fx-data" alt="" />);
    const strip = container.querySelector(".cast-strip") as HTMLElement;
    expect(strip).not.toBeNull();
    expect(strip.dataset.frames).toBe("4");
    expect(strip.getAttribute("aria-hidden")).toBe("true");
    expect(strip.style.backgroundImage.replace(/"/g, "")).toBe("url(/cast/fx-data.png)");
    const item = castById("fx-data");
    expect(item.frames).toBe(4);
    expect(item.w).toBe(item.cellW * 4);
    expect(item.h).toBe(item.cellH);
  });

  it("height and anim override the arena default", () => {
    render(<CastSprite id="hero-m-walk" alt="" height={96} anim="walk" className="cast-walk" />);
    const strip = document.querySelector(".cast-strip") as HTMLElement;
    expect(strip.dataset.anim).toBe("walk");
    expect(strip.style.height).toBe("96px");
    expect(strip.className.split(/\s+/)).toContain("cast-walk");
  });
});
