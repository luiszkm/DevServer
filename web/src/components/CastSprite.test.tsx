import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { castById } from "@/lib/cast";
import { CastSprite } from "./CastSprite";

describe("CastSprite", () => {
  it("still points at the cast png", () => {
    render(<CastSprite id="enemy-slime" alt="SLIME DE CACHE" />);
    const img = screen.getByRole("img", { name: "SLIME DE CACHE" });
    expect(img.getAttribute("src")).toBe("/cast/enemy-slime.png");
    expect(img.getAttribute("height")).toBe("112");
    expect(img.className.split(/\s+/)).toContain("cast-sprite");
    expect(castById("enemy-slime").frames).toBe(1);
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
});
