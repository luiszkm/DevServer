import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

vi.mock("next/navigation", () => ({ usePathname: () => "/mundo" }));

describe("Tabs", () => {
  // C26
  it("tab order and routes", () => {
    render(<Tabs />);
    const links = within(screen.getByRole("navigation", { name: "Cenas" })).getAllByRole("link");
    const got = links.map((l) => [l.textContent?.replace(/^\d\d/, ""), l.getAttribute("href")]);
    expect(got).toEqual([
      ["TÍTULO", "/"],
      ["MUNDO", "/mundo"],
      ["DEPLOY", "/deploy"],
      ["BUG FIGHT", "/bug-fight"],
      ["SKILLS", "/skills"],
      ["LOJA", "/loja"],
      ["AVATAR", "/avatar"],
    ]);
  });

  it("marks only the current route's tab as current", () => {
    render(<Tabs />);
    const current = within(screen.getByRole("navigation", { name: "Cenas" }))
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.getAttribute("href"))).toEqual(["/mundo"]);
  });
});
