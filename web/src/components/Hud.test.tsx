import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { GameShell } from "./GameShell";
import { Hud } from "./Hud";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {} }) }));

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
