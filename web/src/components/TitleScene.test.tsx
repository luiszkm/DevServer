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
});
