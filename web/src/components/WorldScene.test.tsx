import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, REGIONS, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { WorldScene } from "./WorldScene";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderWorld(p: Player, catalog: Catalog = CATALOG) {
  return render(
    <GameContext.Provider value={{ player: p, catalog, setPlayer: vi.fn() }}>
      <WorldScene />
    </GameContext.Provider>,
  );
}

const marker = (id: string) => document.querySelector(`[data-region="${id}"] .node-marker`) as HTMLElement;
const LOCKED = "grayscale(1) brightness(.6)";

async function openPanel(regionName: string) {
  await userEvent.click(screen.getByRole("button", { name: regionName }));
  // jsdom has no CSS transitionend; finish the walk so ENTRAR unlocks.
  const hero = document.querySelector(".map-hero");
  if (hero) fireEvent.transitionEnd(hero, { propertyName: "left" });
  return screen.getByRole("dialog", { name: regionName });
}

const enterBtn = (dialog: HTMLElement) => within(dialog).getByRole("button", { name: /ENTRAR|EXPLORAR|REQUER NÍVEL/ });

describe("WorldScene", () => {
  // C33
  it("min levels come from catalog", async () => {
    const catalog = { ...CATALOG, regions: REGIONS.map((r) => (r.id === "floresta" ? { ...r, minLevel: 3 } : r)) };
    renderWorld(player({ level: 1 }), catalog);
    const dialog = await openPanel("FLORESTA DE LOGS");
    expect(enterBtn(dialog)).toHaveTextContent("REQUER NÍVEL 3");
    expect(enterBtn(dialog)).toBeDisabled();
  });

  // C34
  it("locks regions above player level", async () => {
    renderWorld(player({ level: 1 }));
    const vila = await openPanel("VILA LOCALHOST");
    expect(enterBtn(vila)).toHaveTextContent("EXPLORAR");
    expect(enterBtn(vila)).toBeEnabled();
    await userEvent.click(within(vila).getByRole("button", { name: "FECHAR" }));
    const floresta = await openPanel("FLORESTA DE LOGS");
    expect(enterBtn(floresta)).toHaveTextContent("ENTRAR");
    expect(enterBtn(floresta)).toBeEnabled();
    await userEvent.click(within(floresta).getByRole("button", { name: "FECHAR" }));
    for (const [name, min] of [["MERCADO DE PACOTES", 2], ["CAVERNA DOS BUGS", 5], ["TORRE DE DEPLOY", 8], ["PICOS DA NUVEM", 12]]) {
      const dialog = await openPanel(name as string);
      expect(enterBtn(dialog)).toHaveTextContent(`REQUER NÍVEL ${min}`);
      expect(enterBtn(dialog)).toBeDisabled();
      await userEvent.click(within(dialog).getByRole("button", { name: "FECHAR" }));
    }
  });

  // C39
  it("shows current region", () => {
    const { container } = renderWorld(player({ region: "floresta" }));
    expect(screen.getByText("região atual: FLORESTA DE LOGS")).toBeInTheDocument();
    const current = container.querySelectorAll('[aria-current="location"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("data-region", "floresta");
  });

  it("renders regions in catalog order", () => {
    const reversed = { ...CATALOG, regions: [...REGIONS].reverse() };
    const { container } = renderWorld(player(), reversed);
    const ids = [...container.querySelectorAll("[data-region]")].map((n) => n.getAttribute("data-region"));
    expect(ids).toEqual([...REGIONS].reverse().map((r) => r.id));
  });

  it("shows the api message when travel is refused and keeps the player", async () => {
    mockFetch({ "POST /api/me/travel": json(422, { error: { code: "level_too_low", message: "nível insuficiente para esta região" } }) });
    const setPlayer = vi.fn();
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer }}>
        <WorldScene />
      </GameContext.Provider>,
    );
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nível insuficiente para esta região");
    expect(setPlayer).not.toHaveBeenCalled();
  });

  it("shows SERVIDOR FORA DO AR when travel hits a network error", async () => {
    mockFetch({ "POST /api/me/travel": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderWorld(player());
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("SERVIDOR FORA DO AR");
  });

  it("falls back to a generic message when a travel error has no body", async () => {
    mockFetch({ "POST /api/me/travel": new Response(null, { status: 502 }) });
    renderWorld(player());
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("erro ao viajar");
  });

  it("disables travel buttons while a travel is pending", async () => {
    mockFetch({ "POST /api/me/travel": () => new Promise<Response>(() => {}) });
    renderWorld(player());
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(within(dialog).getByRole("button", { name: "ENTRAR" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "FECHAR" })).toBeDisabled();
    expect(marker("vila")).toBeDisabled();
    expect(marker("floresta")).toBeDisabled();
  });

  it("places a region unknown to the map and names an unknown current region by its id", () => {
    const extra = { id: "lua", name: "LUA", tag: "NOVO", minLevel: 1, description: "nova", path: [] };
    const { container } = renderWorld(player({ region: "lua" }), { ...CATALOG, regions: [...REGIONS, extra] });
    const node = container.querySelector('[data-region="lua"]') as HTMLElement;
    expect(node.style.left).toBe("50%");
    expect(node.style.top).toBe("50%");
    expect(screen.getByText("região atual: LUA")).toBeInTheDocument();
  });

  it("names the current region by its id when the catalog lacks it", () => {
    renderWorld(player({ region: "sumida" }));
    expect(screen.getByText("região atual: sumida")).toBeInTheDocument();
  });

  it("marks map nodes as here, open or locked", () => {
    renderWorld(player({ level: 1, region: "vila" }));
    expect(marker("vila")).toHaveClass("here");
    expect(marker("vila").style.filter).toBe("");
    expect(marker("floresta")).not.toHaveClass("here");
    expect(marker("floresta").style.filter).toBe("");
    expect(marker("caverna")).not.toHaveClass("here");
    expect(marker("caverna").style.filter).toBe(LOCKED);
  });

  // game-art C31
  it("region art", () => {
    const { container } = renderWorld(player());
    expect(container.querySelector(".node-diamond")).toBeNull();
    for (const r of REGIONS) {
      const img = marker(r.id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/region-${r.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(marker(r.id).textContent).toBe("");
    }
    const map = container.querySelector(".world-map") as HTMLElement;
    expect(map.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/world.png)");

    // The current marker also carries the flag (assets C34): the fallback is about the region's own icon.
    fireEvent.error(marker("vila").querySelector("img")!);
    expect(marker("vila").querySelector('img[src^="/art/icon/region-"]')).toBeNull();
    expect(marker("vila")).toHaveTextContent(/^HUB$/);
    expect(marker("floresta").querySelector("img")).not.toBeNull();
  });

  // game-art C32
  it("marker state", () => {
    renderWorld(player({ level: 5, region: "floresta" }));
    for (const id of ["torre", "nuvem"]) expect(marker(id).style.filter, id).toBe(LOCKED);
    for (const id of ["vila", "mercado", "caverna"]) {
      expect(marker(id).style.filter, id).toBe("");
      expect(marker(id), id).not.toHaveClass("here");
    }
    expect(marker("floresta")).toHaveClass("here");
    expect(marker("floresta").style.filter).toBe("");
  });
});

function expectIcon(img: Element | null | undefined, src: string, width = 16) {
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe(String(width));
}

describe("WorldScene assets", () => {
  // assets C19
  it("lock icon", async () => {
    renderWorld(player({ level: 1, region: "vila" }));
    const dialog = await openPanel("CAVERNA DOS BUGS");
    const locked = enterBtn(dialog);
    expect(locked).toHaveTextContent("REQUER NÍVEL 5");
    expectIcon(locked.firstElementChild, "/art/icon/ic-lock.png");
    expect(locked.firstChild).toBe(locked.firstElementChild);
    await userEvent.click(within(dialog).getByRole("button", { name: "FECHAR" }));
    const open = await openPanel("FLORESTA DE LOGS");
    expect(enterBtn(open).querySelector('img[src="/art/icon/ic-lock.png"]')).toBeNull();
  });
});

describe("WorldScene world pieces", () => {
  // assets C34
  it("flag on the current marker only", () => {
    renderWorld(player({ region: "floresta" }));
    const flags = document.querySelectorAll('img[src="/art/sprite/build-flag.png"]');
    expect(flags).toHaveLength(1);
    expect(flags[0].closest(".node-marker.here")).toBe(marker("floresta"));
    expect(flags[0].getAttribute("alt")).toBe("");
    expect(flags[0].getAttribute("width")).toBe("32");
  });

  // assets C35
  it("teleport after a 200 travel", async () => {
    mockFetch({ "POST /api/me/travel": json(200, { player: player({ region: "floresta" }) }) });
    renderWorld(player({ region: "vila" }));
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    await waitFor(() => expect(document.querySelector('[data-fx="teleport"]')).not.toBeNull());
    const fx = document.querySelector('[data-fx="teleport"]') as HTMLElement;
    expect(fx.closest("[data-region]")!.getAttribute("data-region")).toBe("floresta");
    expect(fx.getAttribute("data-fx")).toBe("teleport");
    expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/teleport.png)");
  });

  it("teleport only on success (travel error)", async () => {
    mockFetch({ "POST /api/me/travel": json(422, { error: { code: "level_too_low", message: "nível insuficiente para esta região" } }) });
    renderWorld(player({ region: "vila" }));
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(await screen.findByText("nível insuficiente para esta região")).toBeInTheDocument();
    expect(document.querySelector('[data-fx="teleport"]')).toBeNull();
  });
});

describe("WorldScene hero anim", () => {
  // assets C48
  const hero = () => document.querySelector(".map-hero canvas") as HTMLCanvasElement;
  it("hero anim: idle beside the current marker", () => {
    renderWorld(player({ region: "floresta" }));
    expect(document.querySelectorAll(".map-hero canvas")).toHaveLength(1);
    const wrap = hero().closest(".map-hero") as HTMLElement;
    expect(wrap.style.left).toBe("40%");
    expect(wrap.style.top).toBe("34%");
    expect(hero().dataset.anim).toBe("idle");
  });

  it("hero anim: walk while the travel is pending", async () => {
    mockFetch({ "POST /api/me/travel": () => new Promise<Response>(() => {}) });
    renderWorld(player({ region: "vila" }));
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    expect(hero().dataset.anim).toBe("walk");
  });

  it("map click walks the hero to the marker and opens the region panel", async () => {
    renderWorld(player({ region: "vila" }));
    await userEvent.click(screen.getByRole("button", { name: "FLORESTA DE LOGS" }));
    const dialog = await screen.findByRole("dialog", { name: "FLORESTA DE LOGS" });
    expect(dialog).toHaveTextContent("logs");
    expect(within(dialog).getByRole("button", { name: "ENTRAR" })).toBeDisabled();
    await waitFor(() => {
      const wrap = hero().closest(".map-hero") as HTMLElement;
      expect(wrap.style.left).toBe("40%");
      expect(wrap.style.top).toBe("34%");
    });
    expect(hero().dataset.anim).toBe("walk");
    fireEvent.transitionEnd(document.querySelector(".map-hero")!, { propertyName: "left" });
    expect(within(dialog).getByRole("button", { name: "ENTRAR" })).toBeEnabled();
    expect(hero().dataset.anim).toBe("idle");
  });

  it("map panel ENTRAR travels to the focused region", async () => {
    mockFetch({ "POST /api/me/travel": json(200, { player: player({ region: "floresta" }) }) });
    const setPlayer = vi.fn();
    render(
      <GameContext.Provider value={{ player: player({ region: "vila" }), catalog: CATALOG, setPlayer }}>
        <WorldScene />
      </GameContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "FLORESTA DE LOGS" }));
    // Finish the walk so ENTRAR unlocks (jsdom has no CSS transitionend).
    fireEvent.transitionEnd(document.querySelector(".map-hero")!, { propertyName: "left" });
    await userEvent.click(within(screen.getByRole("dialog", { name: "FLORESTA DE LOGS" })).getByRole("button", { name: "ENTRAR" }));
    await waitFor(() => expect(setPlayer).toHaveBeenCalled());
    expect(setPlayer.mock.calls[0][0].region).toBe("floresta");
    expect(document.querySelector('[data-fx="teleport"]')).not.toBeNull();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mundo/floresta"));
  });

  it("ENTRAR opens the region map", async () => {
    push.mockClear();
    mockFetch({ "POST /api/me/travel": json(200, { player: player({ region: "floresta" }) }) });
    renderWorld(player({ region: "vila" }));
    const dialog = await openPanel("FLORESTA DE LOGS");
    await userEvent.click(within(dialog).getByRole("button", { name: "ENTRAR" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/mundo/floresta"));
  });

  it("EXPLORAR skips travel", async () => {
    push.mockClear();
    const fetchMock = mockFetch({});
    renderWorld(player({ region: "vila" }));
    const dialog = await openPanel("VILA LOCALHOST");
    await userEvent.click(within(dialog).getByRole("button", { name: "EXPLORAR" }));
    expect(push).toHaveBeenCalledWith("/mundo/vila");
    expect(fetchMock.calls("POST /api/me/travel")).toBe(0);
  });
});

function expectFirstIcon(el: Element | null | undefined, src: string) {
  const img = el?.firstElementChild;
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe("16");
  expect(el!.firstChild).toBe(img);
}

describe("WorldScene applied assets", () => {
  // assets-apply C12
  it("button icon on ENTRAR", async () => {
    renderWorld(player({ level: 1, region: "vila" }));
    const open = await openPanel("FLORESTA DE LOGS");
    expectFirstIcon(enterBtn(open), "/art/icon/btn-start.png");
    expect(enterBtn(open)).toHaveAccessibleName("ENTRAR");
    await userEvent.click(within(open).getByRole("button", { name: "FECHAR" }));
    const locked = await openPanel("CAVERNA DOS BUGS");
    expect(enterBtn(locked).querySelector('img[src="/art/icon/btn-start.png"]')).toBeNull();
  });

  // assets-apply C13: the crown marks the CHEFE and ENDGAME tags only
  it.each([
    ["torre", true], ["nuvem", true], ["vila", false], ["floresta", false], ["mercado", false], ["caverna", false],
  ])("generic icon: crown on tag of %s = %s", async (id, crowned) => {
    renderWorld(player({ level: 1, region: "vila" }));
    const name = REGIONS.find((r) => r.id === id)!.name;
    const dialog = await openPanel(name);
    const chip = within(dialog).getByText(REGIONS.find((r) => r.id === id)!.tag, { selector: ".chip" });
    if (crowned) expectFirstIcon(chip, "/art/icon/ic-crown.png");
    else expect(chip.querySelector("img")).toBeNull();
  });
});

describe("WorldScene campfire", () => {
  // assets-apply C21
  it("campfire strip over the map fire", () => {
    renderWorld(player());
    const fires = document.querySelectorAll("span.fx-fire");
    expect(fires).toHaveLength(1);
    const fire = fires[0] as HTMLElement;
    expect(fire.getAttribute("aria-hidden")).toBe("true");
    expect(fire.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/fire.png)");
  });
});
