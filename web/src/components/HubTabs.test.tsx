import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HubTabs } from "./HubTabs";

const nav = vi.hoisted(() => ({ pathname: "/mundo" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

describe("HubTabs", () => {
  it("switches office, avatar, skills and server", () => {
    nav.pathname = "/avatar";
    render(<HubTabs />);
    const links = within(screen.getByRole("navigation", { name: "Base" })).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href"), l.getAttribute("aria-current")])).toEqual([
      ["OFFICE", "/office", null],
      ["AVATAR", "/avatar", "page"],
      ["SKILLS", "/skills", null],
      ["SERVER", "/server", null],
    ]);
  });

  it("stays hidden outside the hub", () => {
    nav.pathname = "/mundo";
    render(<HubTabs />);
    expect(screen.queryByRole("navigation", { name: "Base" })).not.toBeInTheDocument();
  });
});
