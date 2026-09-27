import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SceneShortcuts } from "./SceneShortcuts";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/mundo", useRouter: () => ({ push: nav.push }) }));

beforeEach(() => {
  nav.push = vi.fn();
});

// game-menu C9-C13: shortcuts 1-6
const SCENES: [string, string][] = [
  ["1", "/"],
  ["2", "/mundo"],
  ["3", "/office"],
  ["4", "/deploy"],
  ["5", "/bug-fight"],
  ["6", "/loja"],
];

describe("SceneShortcuts", () => {
  it("renders nothing", () => {
    const { container } = render(<SceneShortcuts />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(SCENES)("shortcut navigates %s -> %s", async (key, href) => {
    render(<SceneShortcuts />);
    await userEvent.keyboard(key);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(href);
  });

  it.each(["{Control>}3{/Control}", "{Meta>}3{/Meta}", "{Alt>}3{/Alt}"])("shortcut ignores modifiers %s", async (keys) => {
    render(<SceneShortcuts />);
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
    render(<SceneShortcuts />);
    const el = make();
    document.body.append(el);
    el.focus();
    expect(el).toHaveFocus();
    await userEvent.keyboard("3");
    expect(nav.push).not.toHaveBeenCalled();
    el.remove();
  });

  it.each(["0", "7", "9", "a"])("shortcut ignores other keys %s", async (key) => {
    render(<SceneShortcuts />);
    await userEvent.keyboard(key);
    expect(nav.push).not.toHaveBeenCalled();
  });

  // C22 (added after verification round 1): a key another handler already consumed is left alone
  it("shortcut ignores prevented", async () => {
    render(<SceneShortcuts />);
    const cancel = (e: KeyboardEvent) => e.preventDefault();
    document.body.addEventListener("keydown", cancel);
    await userEvent.keyboard("3");
    document.body.removeEventListener("keydown", cancel);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("stops listening once unmounted", async () => {
    const { unmount } = render(<SceneShortcuts />);
    unmount();
    await userEvent.keyboard("2");
    expect(nav.push).not.toHaveBeenCalled();
  });
});
