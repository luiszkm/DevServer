import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

vi.mock("next/navigation", () => ({ usePathname: () => "/mundo" }));

describe("Tabs", () => {
  // C26 (foundation), C27 (office), C28 (server-room)
  it("tab order and routes", () => {
    render(<Tabs />);
    const links = within(screen.getByRole("navigation", { name: "Cenas" })).getAllByRole("link");
    const got = links.map((l) => [l.textContent?.replace(/^\d\d/, ""), l.getAttribute("href")]);
    expect(got).toEqual([
      ["TÍTULO", "/"],
      ["MUNDO", "/mundo"],
      ["SERVER", "/server"],
      ["DEPLOY", "/deploy"],
      ["BUG FIGHT", "/bug-fight"],
      ["SKILLS", "/skills"],
      ["LOJA", "/loja"],
      ["AVATAR", "/avatar"],
      ["OFFICE", "/office"],
    ]);
    expect(links.map((l) => l.querySelector(".tab-num")?.textContent)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09"]);
    expect(links[2].querySelector(".tab-num")?.textContent).toBe("03");
  });

  it("marks only the current route's tab as current", () => {
    render(<Tabs />);
    const current = within(screen.getByRole("navigation", { name: "Cenas" }))
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.getAttribute("href"))).toEqual(["/mundo"]);
  });
});
