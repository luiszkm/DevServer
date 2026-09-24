import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

const nav = vi.hoisted(() => ({ pathname: "/mundo", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));

beforeEach(() => {
  nav.pathname = "/mundo";
  nav.push = vi.fn();
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

  // responsive C21 (added after verification round 1): only Escape closes from the keyboard
  it("other keys keep menu open", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    within(scenes()).getByRole("link", { name: /SKILLS/ }).focus();
    await userEvent.keyboard("{Tab}");
    expect(menu()).toHaveAttribute("aria-expanded", "true");
    expect(scenes()).toHaveAttribute("data-open", "true");
    await userEvent.keyboard("a");
    expect(menu()).toHaveAttribute("aria-expanded", "true");
    expect(scenes()).toHaveAttribute("data-open", "true");
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

// game-menu C4, C5, C9-C13, C15: hotbar slots, shortcuts 1-9 and the MENU icon
const SLOTS: [string, string, string, string][] = [
  ["01", "TÍTULO", "/", "titulo"],
  ["02", "MUNDO", "/mundo", "mundo"],
  ["03", "SERVER", "/server", "server"],
  ["04", "DEPLOY", "/deploy", "deploy"],
  ["05", "BUG FIGHT", "/bug-fight", "bug-fight"],
  ["06", "SKILLS", "/skills", "skills"],
  ["07", "LOJA", "/loja", "loja"],
  ["08", "AVATAR", "/avatar", "avatar"],
  ["09", "OFFICE", "/office", "office"],
];

describe("Tabs hotbar", () => {
  const links = () => within(screen.getByRole("navigation", { name: "Cenas" })).getAllByRole("link");
  const menu = () => screen.getByRole("button", { name: /^MENU/ });

  it("slot icons", () => {
    render(<Tabs />);
    const got = links().map((l) => {
      const img = l.querySelector(".tab-icon > img");
      return [
        l.querySelector(".tab-num")?.textContent,
        l.textContent?.replace(/^\d\d/, ""),
        l.getAttribute("href"),
        img?.getAttribute("src"),
        img?.getAttribute("alt"),
        img?.getAttribute("width"),
        img?.className.split(/\s+/).includes("pixelated"),
      ];
    });
    expect(got).toEqual(SLOTS.map(([num, label, href, icon]) => [num, label, href, `/art/icon/menu-${icon}.png`, "", "32", true]));
  });

  it("slot icon fallback", () => {
    render(<Tabs />);
    const loja = links()[6];
    fireEvent.error(loja.querySelector("img")!);
    expect(loja.querySelector("img")).toBeNull();
    expect(loja.querySelector(".tab-num")).toHaveTextContent("07");
    expect(loja).toHaveTextContent("LOJA");
  });

  it.each(SLOTS.map(([num, , href], i) => [String(i + 1), href, num]))("shortcut navigates %s -> %s", async (key, href) => {
    render(<Tabs />);
    await userEvent.keyboard(key);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(href);
  });

  it.each(["{Control>}3{/Control}", "{Meta>}3{/Meta}", "{Alt>}3{/Alt}"])("shortcut ignores modifiers %s", async (keys) => {
    render(<Tabs />);
    await userEvent.keyboard(keys);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it.each([
    ["input", () => document.createElement("input")],
    ["textarea", () => document.createElement("textarea")],
    ["select", () => {
      const el = document.createElement("select");
      el.append(new Option("x"));
      return el;
    }],
    ["contenteditable", () => {
      const el = document.createElement("div");
      el.setAttribute("contenteditable", "true");
      el.tabIndex = 0;
      return el;
    }],
  ] as [string, () => HTMLElement][])("shortcut ignores editable %s", async (_, make) => {
    render(<Tabs />);
    const el = make();
    document.body.append(el);
    el.focus();
    expect(el).toHaveFocus();
    await userEvent.keyboard("3");
    expect(nav.push).not.toHaveBeenCalled();
    el.remove();
  });

  it.each(["0", "a"])("shortcut ignores other keys %s", async (key) => {
    render(<Tabs />);
    await userEvent.keyboard(key);
    expect(nav.push).not.toHaveBeenCalled();
  });

  // C22 (added after verification round 1): a key another handler already consumed is left alone
  it("shortcut ignores prevented", async () => {
    render(<Tabs />);
    const cancel = (e: KeyboardEvent) => e.preventDefault();
    document.body.addEventListener("keydown", cancel);
    await userEvent.keyboard("3");
    document.body.removeEventListener("keydown", cancel);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("shortcut closes menu", async () => {
    render(<Tabs />);
    await userEvent.click(menu());
    expect(menu()).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("4");
    expect(nav.push).toHaveBeenCalledWith("/deploy");
    expect(menu()).toHaveAttribute("aria-expanded", "false");
  });

  it("menu button icon", () => {
    nav.pathname = "/loja";
    const { unmount } = render(<Tabs />);
    const img = menu().querySelector("img");
    expect(img?.getAttribute("src")).toBe("/art/icon/menu-loja.png");
    expect(img?.getAttribute("alt")).toBe("");
    expect(menu()).toHaveTextContent(/^MENU · LOJA$/);
    unmount();
    nav.pathname = "/login";
    render(<Tabs />);
    expect(menu().querySelector("img")).toBeNull();
    expect(menu()).toHaveTextContent(/^MENU$/);
  });

  // C23 (added after verification round 1): the icon comes first, for every scene
  it.each(SLOTS)("menu button icon per scene %s %s", (_, label, href, icon) => {
    nav.pathname = href;
    render(<Tabs />);
    const first = menu().firstElementChild;
    expect(first?.tagName).toBe("IMG");
    expect(first?.getAttribute("src")).toBe(`/art/icon/menu-${icon}.png`);
    expect(first?.getAttribute("alt")).toBe("");
    expect(first?.nextSibling?.textContent).toBe(`MENU · ${label}`);
  });
});
