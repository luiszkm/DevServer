import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const nav = vi.hoisted(() => ({ pathname: "/mundo" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

beforeEach(() => {
  nav.pathname = "/mundo";
});

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

// responsive C1-C6: the phone menu is a disclosure over the same nav
describe("Tabs menu", () => {
  const menu = () => screen.getByRole("button", { name: /^MENU/ });
  const scenes = () => screen.getByRole("navigation", { name: "Cenas" });

  it("menu starts closed", () => {
    render(<Tabs />);
    expect(menu()).toHaveAttribute("type", "button");
    expect(menu()).toHaveAttribute("aria-expanded", "false");
    expect(menu()).toHaveAttribute("aria-controls", "cenas-nav");
    expect(scenes()).toHaveAttribute("id", "cenas-nav");
    expect(scenes()).toHaveAttribute("data-open", "false");
  });

  it("menu opens", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    expect(menu()).toHaveAttribute("aria-expanded", "true");
    expect(scenes()).toHaveAttribute("data-open", "true");
  });

  it("link closes menu", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    const deploy = within(scenes()).getByRole("link", { name: /DEPLOY/ });
    deploy.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(deploy);
    expect(menu()).toHaveAttribute("aria-expanded", "false");
    expect(scenes()).toHaveAttribute("data-open", "false");
  });

  it("button closes menu", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    await userEvent.click(menu());
    expect(menu()).toHaveAttribute("aria-expanded", "false");
    expect(scenes()).toHaveAttribute("data-open", "false");
  });

  it("escape closes menu", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    within(scenes()).getByRole("link", { name: /SKILLS/ }).focus();
    await userEvent.keyboard("{Escape}");
    expect(menu()).toHaveAttribute("aria-expanded", "false");
    expect(scenes()).toHaveAttribute("data-open", "false");
    expect(menu()).toHaveFocus();
  });

  const labels: [string, string][] = [
    ["/", "MENU · TÍTULO"],
    ["/mundo", "MENU · MUNDO"],
    ["/server", "MENU · SERVER"],
    ["/deploy", "MENU · DEPLOY"],
    ["/bug-fight", "MENU · BUG FIGHT"],
    ["/skills", "MENU · SKILLS"],
    ["/loja", "MENU · LOJA"],
    ["/avatar", "MENU · AVATAR"],
    ["/office", "MENU · OFFICE"],
    ["/login", "MENU"],
  ];
  it.each(labels)("menu label %s", (pathname, label) => {
    nav.pathname = pathname;
    render(<Tabs />);
    expect(menu()).toHaveTextContent(new RegExp(`^${label}$`));
  });
});
