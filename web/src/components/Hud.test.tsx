import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { GameShell } from "./GameShell";
import { Hud } from "./Hud";

const nav = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: () => {} }) }));

describe("Hud", () => {
  // C23
  it("renders player values", () => {
    render(<Hud player={player({ level: 3, xp: 40, xpMax: 1000, hp: 80, hpMax: 140, coins: 55, gems: 7, skillPoints: 2 })} />);
    const hud = screen.getByRole("banner", { name: "HUD" });
    for (const text of ["LEVEL 3", "40/1000", "HP 80/140", "55", "7"]) {
      expect(within(hud).getByText(text)).toBeInTheDocument();
    }
    expect(within(hud).getByText("COINS")).toBeInTheDocument();
    expect(within(hud).getByText("GEMS")).toBeInTheDocument();
    expect(within(hud).queryByText("SKILL PTS")).not.toBeInTheDocument();
  });

  // C24
  it("pending shows CARREGANDO", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<GameShell><p>cena</p></GameShell>);
    const hud = screen.getByRole("banner", { name: "HUD" });
    expect(within(hud).getByText("CARREGANDO...")).toBeInTheDocument();
    expect(hud.textContent).not.toMatch(/\d/);
  });

  it("stacks the XP bar above the HP bar in one card", () => {
    render(<Hud player={player({ xp: 40, xpMax: 1000, hp: 80, hpMax: 140 })} />);
    const xp = screen.getByText("40/1000").closest(".hud-row")!;
    const hp = screen.getByText("HP 80/140").closest(".hud-row")!;
    expect(xp.parentElement).toBe(hp.parentElement);
    expect(xp.parentElement).toHaveClass("hud-bars");
    expect(xp.compareDocumentPosition(hp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("stacks COINS above GEMS in one card", () => {
    render(<Hud player={player({ coins: 55, gems: 7 })} />);
    const coins = screen.getByText("COINS").closest(".hud-row")!;
    const gems = screen.getByText("GEMS").closest(".hud-row")!;
    expect(coins.parentElement).toBe(gems.parentElement);
    expect(coins.parentElement).toHaveClass("hud-wallet");
    expect(coins).toHaveTextContent("55");
    expect(gems).toHaveTextContent("7");
    expect(coins.compareDocumentPosition(gems) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ["TÍTULO", "/", "titulo", "/mundo"],
    ["MUNDO", "/mundo", "mundo", "/"],
    ["DEPLOY", "/deploy", "deploy", "/"],
    ["BUG FIGHT", "/bug-fight", "bug-fight", "/"],
    ["LOJA", "/loja", "loja", "/"],
  ])("%s link: icon and name, current only on its route", (label, href, icon, elsewhere) => {
    for (const [pathname, current] of [[elsewhere, null], [href, "page"]]) {
      nav.pathname = pathname!;
      const { unmount } = render(<Hud player={player()} />);
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("aria-current")).toBe(current);
      expect(link.textContent).toBe(label);
      expect(link.firstElementChild?.getAttribute("src")).toBe(`/art/icon/menu-${icon}.png`);
      unmount();
    }
    nav.pathname = "/";
  });

  it("puts TÍTULO, MUNDO, DEPLOY then BUG FIGHT in the card right after the XP and HP bars", () => {
    render(<Hud player={player()} />);
    const card = screen.getByRole("link", { name: "MUNDO" }).parentElement!;
    expect(card.previousElementSibling?.classList.contains("hud-bars")).toBe(true);
    expect([...card.children].map((c) => c.textContent)).toEqual(["TÍTULO", "MUNDO", "DEPLOY", "BUG FIGHT"]);
  });

  it("puts the LOJA link under GEMS", () => {
    render(<Hud player={player()} />);
    const loja = screen.getByRole("link", { name: "LOJA" });
    const gems = screen.getByText("GEMS").closest(".hud-row")!;
    expect(loja.parentElement).toBe(gems.parentElement);
    expect(gems.nextElementSibling).toBe(loja);
  });

  it("puts SAIR below LEVEL, beside the hero", () => {
    const p = player({ level: 15 });
    render(
      <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer: vi.fn() }}>
        <Hud player={p} onLogout={vi.fn()} />
      </GameContext.Provider>,
    );
    const sair = screen.getByRole("button", { name: "SAIR" });
    const level = screen.getByText("LEVEL 15");
    expect(level.parentElement).toBe(sair.parentElement);
    expect(level.compareDocumentPosition(sair) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(level.closest(".hud-card")!.querySelector(".hud-hero canvas")).not.toBeNull();
  });

  it("shows SAIR only when a logout handler is given", () => {
    const { rerender } = render(<Hud player={player()} />);
    expect(screen.queryByRole("button", { name: "SAIR" })).not.toBeInTheDocument();
    rerender(<Hud player={player()} onLogout={vi.fn()} />);
    expect(screen.getByRole("button", { name: "SAIR" })).toBeInTheDocument();
  });

  // game-art C20
  it.each([
    ["XP", "hud-xp"],
    ["HP 100/100", "hud-heart"],
    ["COINS", "hud-coin"],
    ["GEMS", "hud-gem"],
  ])("currency art (%s)", (label, icon) => {
    render(<Hud player={player({ hp: 100, hpMax: 100 })} />);
    const card = screen.getByText(label).closest(".hud-card") as HTMLElement;
    const img = card.querySelector(`img[src="/art/icon/${icon}.png"]`)!;
    expect(img).not.toBeNull();
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("width")).toBe("16");
    expect(img).toHaveClass("pixelated");
  });
});

function expectIcon(img: Element | null | undefined, src: string, width = 16) {
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe(String(width));
}

describe("Hud assets", () => {
  // assets C17
  it("exit icon", () => {
    render(<Hud player={player()} onLogout={vi.fn()} />);
    const sair = screen.getByRole("button", { name: "SAIR" });
    expectIcon(sair.querySelector("img"), "/art/icon/btn-exit.png");
    expect(screen.queryByText("SKILL PTS")).not.toBeInTheDocument();
  });

  // assets C27
  it("icon fails", () => {
    render(<Hud player={player()} onLogout={vi.fn()} />);
    const sair = screen.getByRole("button", { name: "SAIR" });
    fireEvent.error(sair.querySelector("img")!);
    expect(sair.querySelector("img")).toBeNull();
    expect(sair.textContent).toBe("SAIR");
    expect(sair.children).toHaveLength(0);
  });
});

function expectLoadingFx(text: HTMLElement) {
  const fx = text.querySelector("span.fx-loading") as HTMLElement;
  expect(fx).not.toBeNull();
  expect(fx.getAttribute("aria-hidden")).toBe("true");
  expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/loading.png)");
}

describe("Hud loading", () => {
  // assets C30
  it("loading fx", () => {
    render(<Hud />);
    expectLoadingFx(screen.getByText("CARREGANDO..."));
  });
});

describe("Hud hero", () => {
  it("hero holds the rarity laptop", () => {
    const p = player({ notebook: { level: 4, rarity: "raro", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } });
    render(
      <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer: vi.fn() }}>
        <Hud player={p} />
      </GameContext.Provider>,
    );
    expect(document.querySelector("canvas")?.getAttribute("data-look")).toContain("/art/sprite/hero/laptop-raro.png");
  });

  it("the hero and dev name link to BASE", () => {
    const p = player({ devName: "OCTOCAT" });
    render(
      <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer: vi.fn() }}>
        <Hud player={p} />
      </GameContext.Provider>,
    );
    const link = screen.getByRole("link", { name: "OCTOCAT · ir para a base" });
    expect(link.getAttribute("href")).toBe("/office");
    expect(link.querySelector("canvas.hero-avatar")).not.toBeNull();
    expect(link).toHaveTextContent("OCTOCAT");
  });
});

describe("Hud applied assets", () => {
  // assets-apply C12
  it("button icon: rank before LEVEL", () => {
    render(<Hud player={player({ level: 3 })} />);
    const title = screen.getByText("LEVEL 3");
    const img = title.firstElementChild!;
    expect(img.getAttribute("src")).toBe("/art/icon/btn-rank.png");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("width")).toBe("16");
    expect(title.firstChild).toBe(img);
  });
});
