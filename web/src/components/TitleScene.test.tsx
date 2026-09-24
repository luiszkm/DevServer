import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleScene } from "./TitleScene";

describe("TitleScene", () => {
  // C29
  it.each([
    ["MUNDO", "/mundo"],
    ["DEPLOY", "/deploy"],
    ["SKILLS", "/skills"],
    ["BUG", "/bug-fight"],
  ])("signs link to scenes (%s)", (name, href) => {
    render(<TitleScene />);
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  });

  // C29 (server-room)
  it("server hotspots", () => {
    render(<TitleScene />);
    const sign = screen.getByRole("link", { name: "SERVER" });
    expect(sign).toHaveAttribute("href", "/server");
    expect(sign.style).toMatchObject({ left: "17.1%", top: "46.7%", width: "14.6%", height: "5.2%" });
    expect(sign.querySelector(".hotspot-chip")).toBeNull();
    const building = screen.getByRole("link", { name: "SALA DE SERVIDORES" });
    expect(building).toHaveAttribute("href", "/server");
    expect(building.style).toMatchObject({ left: "68.5%", top: "39.2%", width: "26.4%", height: "33%" });
    expect(building.querySelector(".hotspot-chip")).toHaveTextContent("SALA DE SERVIDORES");
    // The four earlier signs keep their places.
    const others = ["DEPLOY", "MUNDO", "SKILLS", "BUG"].map((name) => {
      const l = screen.getByRole("link", { name });
      return [name, l.getAttribute("href"), l.style.left, l.style.top];
    });
    expect(others).toEqual([
      ["DEPLOY", "/deploy", "17.1%", "53.8%"],
      ["MUNDO", "/mundo", "17.1%", "60.9%"],
      ["SKILLS", "/skills", "43.2%", "49.5%"],
      ["BUG", "/bug-fight", "6.4%", "66.5%"],
    ]);
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });
});
