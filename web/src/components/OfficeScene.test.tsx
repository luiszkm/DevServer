import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfficePage from "@/app/(game)/office/page";
import type { Player } from "@/lib/types";
import { CATALOG, OFFICE, json, mockFetch, player, room } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderOffice(p: Player = player(), setPlayer = vi.fn()) {
  render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer }}>
      <OfficePage />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const card = (id: string) => document.querySelector(`[data-card="${id}"]`) as HTMLButtonElement;
const cardIds = () => Array.from(document.querySelectorAll("[data-card]")).map((c) => c.getAttribute("data-card"));
const cell = (zone: string, i: number) => document.querySelector(`[data-cell="${zone}-${i}"]`) as HTMLButtonElement;
const cells = (zone: string) => Array.from(document.querySelectorAll(`[data-cell^="${zone}-"]`)) as HTMLButtonElement[];
const detail = () => screen.getByRole("region", { name: "detalhe" });
const status = () => screen.getByRole("status");
const filter = (name: string) => screen.getByRole("button", { name });
const stat = (label: string) => document.querySelector(`[data-stat="${label}"] .office-stat-value`)?.textContent;
const foot = () => document.querySelector(".office-foot")?.textContent;
const level = () => document.querySelector(".office-level")?.textContent;
const HINT = " · clicar num móvel já instalado guarda ele e devolve metade do valor.";

afterEach(() => vi.unstubAllGlobals());

describe("OfficeScene", () => {
  // C28
  it("catalog panel", () => {
    renderOffice();
    expect(screen.getByText("CATÁLOGO")).toBeInTheDocument();
    expect(screen.getByText("escolha e clique num espaço da sala")).toBeInTheDocument();
    expect(cardIds()).toEqual([
      "mesa", "cadeira_gamer", "setup2", "rack", "cafeteira", "estante", "planta", "tapete", "neon", "poster", "kanban", "janela",
    ]);
    const want: [string, string][] = [
      ["mesa", "60C"], ["cadeira_gamer", "40G"], ["setup2", "90G"], ["rack", "70G"],
      ["cafeteira", "55C"], ["estante", "45C"], ["planta", "25C"], ["tapete", "30C"],
      ["neon", "35G"], ["poster", "20C"], ["kanban", "50C"], ["janela", "60G"],
    ];
    for (const [id, tag] of want) {
      expect(card(id).querySelector(".office-glyph img")?.getAttribute("src")).toBe(`/art/icon/office-${id}.png`);
      expect(card(id).querySelector(".office-tag")).toHaveTextContent(tag);
    }
    expect(filter("TODOS")).toHaveAttribute("aria-pressed", "true");
    expect(filter("PAREDE")).toHaveAttribute("aria-pressed", "false");
    expect(filter("PISO")).toHaveAttribute("aria-pressed", "false");
    expect(card("mesa")).toHaveAttribute("aria-pressed", "true");
    expect(cardIds().filter((id) => card(id!).getAttribute("aria-pressed") === "true")).toEqual(["mesa"]);
    expect(detail()).toHaveTextContent("MESA EM L");
  });

  // C29
  it("filters by zone", async () => {
    renderOffice();
    await userEvent.click(filter("PAREDE"));
    expect(cardIds()).toEqual(["neon", "poster", "kanban", "janela"]);
    expect(filter("PAREDE")).toHaveAttribute("aria-pressed", "true");
    expect(filter("TODOS")).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(filter("PISO"));
    expect(cardIds()).toEqual(["mesa", "cadeira_gamer", "setup2", "rack", "cafeteira", "estante", "planta", "tapete"]);
    await userEvent.click(filter("TODOS"));
    expect(cardIds()).toHaveLength(12);
  });

  // C30
  it("detail per furniture", async () => {
    renderOffice();
    const desc = () => detail().querySelector(".office-detail-desc")?.textContent;
    const cost = () => detail().querySelector(".office-detail-cost")?.textContent;
    const name = () => detail().querySelector(".office-detail-name")?.textContent;
    expect(name()).toBe("MESA EM L");
    expect(cost()).toBe("60 COINS");
    expect(detail().querySelector(".office-detail-glyph img")?.getAttribute("src")).toBe("/art/icon/office-mesa.png");
    expect(desc()).toBe("Espaço para dois monitores e o café. · PISO · conforto +8 · +3% XP");
    await userEvent.click(card("setup2"));
    expect(name()).toBe("SETUP 2 TELAS");
    expect(cost()).toBe("90 GEMS");
    expect(desc()).toBe("Build de um lado, log do outro. · PISO · conforto +14 · -5% tempo");
    await userEvent.click(card("cadeira_gamer"));
    expect(desc()).toBe("Plantão de madrugada sem dor nas costas. · PISO · conforto +10 · +1 SP/turno");
    await userEvent.click(card("planta"));
    expect(desc()).toBe("Oxigênio e um pouco de sanidade. · PISO · conforto +5");
    await userEvent.click(card("neon"));
    expect(desc()).toBe("IT WORKS ON MY MACHINE em ciano. · PAREDE · conforto +12");
  });

  // C31
  it("room grid", () => {
    renderOffice();
    expect(level()).toBe("CANTINHO");
    expect(screen.getByText("0 móveis instalados")).toBeInTheDocument();
    const wall = screen.getByRole("group", { name: "PAREDE" });
    const floor = screen.getByRole("group", { name: "PISO" });
    expect(wall.compareDocumentPosition(floor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(wall).getAllByRole("button")).toHaveLength(8);
    expect(within(floor).getAllByRole("button")).toHaveLength(24);
    for (const c of [...cells("parede"), ...cells("piso")]) expect(c).toHaveTextContent(/^\+$/);
  });

  it("room grid with furniture", () => {
    renderOffice(player({ office: room({ parede: { 1: "neon" }, piso: { 0: "mesa" } }) }));
    expect(cell("parede", 1).querySelector("img")?.getAttribute("src")).toBe("/art/icon/office-neon.png");
    expect(cell("parede", 1)).toHaveTextContent("LETREIRO NEON");
    expect(cell("piso", 0).querySelector("img")?.getAttribute("src")).toBe("/art/icon/office-mesa.png");
    expect(cell("piso", 0)).toHaveTextContent("MESA EM L");
    const empty = [...cells("parede"), ...cells("piso")].filter((c) => c !== cell("parede", 1) && c !== cell("piso", 0));
    expect(empty).toHaveLength(30);
    for (const c of empty) expect(c).toHaveTextContent(/^\+$/);
    expect(screen.getByText("2 móveis instalados")).toBeInTheDocument();
  });

  // C32
  it("footer", () => {
    renderOffice();
    expect(foot()).toBe(`faltam 30 de conforto para HOME OFFICE${HINT}`);
  });

  it("footer at the top level", () => {
    // 12 janelas would not fit the wall; 7 janelas (105) + 5 setup2 (70) + planta (5) = 180.
    renderOffice(player({
      office: room({
        parede: { 0: "janela", 1: "janela", 2: "janela", 3: "janela", 4: "janela", 5: "janela", 6: "janela" },
        piso: { 0: "setup2", 1: "setup2", 2: "setup2", 3: "setup2", 4: "setup2", 5: "planta" },
      }),
    }));
    expect(stat("CONFORTO")).toBe("180");
    expect(foot()).toBe(`escritório no nível máximo de conforto${HINT}`);
  });

  // C33
  it("level and stats", () => {
    // comfort: janela 15, setup2 14, cadeira_gamer 10, rack 9, mesa 8, cafeteira 7.
    const cases: [number, Player["office"], string][] = [
      [0, room(), "CANTINHO"],
      [29, room({ parede: { 0: "janela" }, piso: { 0: "setup2" } }), "CANTINHO"],
      [30, room({ parede: { 0: "janela", 1: "janela" } }), "HOME OFFICE"],
      [69, room({ parede: { 0: "janela", 1: "janela", 2: "janela" }, piso: { 0: "setup2", 1: "cadeira_gamer" } }), "HOME OFFICE"],
      [70, room({ piso: { 0: "setup2", 1: "setup2", 2: "setup2", 3: "setup2", 4: "setup2" } }), "ESTÚDIO"],
      [119, room({ parede: { 0: "janela", 1: "janela", 2: "janela", 3: "janela", 4: "janela" }, piso: { 0: "setup2", 1: "setup2", 2: "rack", 3: "cafeteira" } }), "ESTÚDIO"],
      [120, room({ parede: { 0: "janela", 1: "janela", 2: "janela", 3: "janela", 4: "janela", 5: "janela", 6: "janela", 7: "janela" } }), "LAB DEV"],
      [179, room({ parede: { 0: "janela", 1: "janela", 2: "janela", 3: "janela", 4: "janela", 5: "janela", 6: "janela", 7: "janela" }, piso: { 0: "setup2", 1: "setup2", 2: "setup2", 3: "rack", 4: "mesa" } }), "LAB DEV"],
      [180, room({ parede: { 0: "janela", 1: "janela", 2: "janela", 3: "janela", 4: "janela", 5: "janela", 6: "janela", 7: "janela" }, piso: { 0: "setup2", 1: "setup2", 2: "setup2", 3: "cadeira_gamer", 4: "mesa" } }), "SEDE DEVSERVE"],
    ];
    for (const [comfort, office, name] of cases) {
      const { unmount } = render(
        <GameContext.Provider value={{ player: player({ office }), catalog: CATALOG, setPlayer: vi.fn() }}>
          <OfficePage />
        </GameContext.Provider>,
      );
      expect(stat("CONFORTO"), `comfort ${comfort}`).toBe(String(comfort));
      expect(level(), `comfort ${comfort}`).toBe(name);
      unmount();
    }

    const floor: Record<number, string> = { 0: "mesa", 1: "estante", 2: "cadeira_gamer", 3: "cafeteira" };
    for (let i = 4; i < 13; i++) floor[i] = "setup2";
    renderOffice(player({ office: room({ piso: floor }) }));
    expect(stat("CONFORTO")).toBe("157");
    expect(stat("XP DE DEPLOY")).toBe("+5%");
    expect(stat("TEMPO DE DEPLOY")).toBe("-40%");
    expect(stat("SP POR TURNO")).toBe("+3");
  });

  // C34
  it("wrong zone", async () => {
    const { fn } = mockFetch({});
    renderOffice(player({ gems: 1000, coins: 1000 }));
    await userEvent.click(card("neon"));
    await userEvent.click(cell("piso", 0));
    expect(status()).toHaveTextContent("ESSE MÓVEL VAI NA PAREDE");
    await userEvent.click(card("mesa"));
    await userEvent.click(cell("parede", 0));
    expect(status()).toHaveTextContent("ESSE MÓVEL VAI NO PISO");
    expect(fn).not.toHaveBeenCalled();
  });

  // C35
  it("insufficient balance", async () => {
    const cases: { name: string; p: Player; pick?: string; blocked: string | null }[] = [
      { name: "59 coins", p: player({ coins: 59, gems: 1000 }), blocked: "COINS INSUFICIENTES" },
      { name: "60 coins", p: player({ coins: 60, gems: 1000 }), blocked: null },
      { name: "39 gems", p: player({ coins: 1000, gems: 39 }), pick: "cadeira_gamer", blocked: "GEMS INSUFICIENTES" },
      { name: "40 gems", p: player({ coins: 1000, gems: 40 }), pick: "cadeira_gamer", blocked: null },
    ];
    for (const tc of cases) {
      const m = mockFetch({ "POST /api/me/office/piso/0": json(200, { player: tc.p }) });
      const { unmount } = render(
        <GameContext.Provider value={{ player: tc.p, catalog: CATALOG, setPlayer: vi.fn() }}>
          <OfficePage />
        </GameContext.Provider>,
      );
      if (tc.pick) await userEvent.click(card(tc.pick));
      await userEvent.click(cell("piso", 0));
      if (tc.blocked) {
        expect(status(), tc.name).toHaveTextContent(tc.blocked);
        expect(m.fn, tc.name).not.toHaveBeenCalled();
      } else {
        expect(m.calls("POST /api/me/office/piso/0"), tc.name).toBe(1);
      }
      unmount();
      vi.unstubAllGlobals();
    }
  });

  // C36
  it("install", async () => {
    const after = player({ coins: 40, office: room({ piso: { 3: "mesa" } }) });
    const m = mockFetch({ "POST /api/me/office/piso/3": json(200, { player: after }) });
    const { setPlayer } = renderOffice(player({ coins: 100 }));
    await userEvent.click(cell("piso", 3));
    expect(m.calls("POST /api/me/office/piso/3")).toBe(1);
    const init = m.fn.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ furniture: "mesa" });
    expect(setPlayer).toHaveBeenCalledWith(after);
    expect(status()).toHaveTextContent("MESA EM L INSTALADO");
  });

  // C37
  it("remove", async () => {
    const before = player({ office: room({ parede: { 2: "janela" }, piso: { 0: "mesa", 1: "cafeteira" } }) });
    const after = player();
    const m = mockFetch({
      "POST /api/me/office/piso/0/remove": json(200, { player: after }),
      "POST /api/me/office/piso/1/remove": json(200, { player: after }),
      "POST /api/me/office/parede/2/remove": json(200, { player: after }),
    });
    const { setPlayer } = renderOffice(before);
    await userEvent.click(cell("piso", 0));
    expect(m.calls("POST /api/me/office/piso/0/remove")).toBe(1);
    expect((m.fn.mock.calls[0][1] as RequestInit).body).toBeUndefined();
    expect(setPlayer).toHaveBeenCalledWith(after);
    expect(status()).toHaveTextContent("GUARDADO · +30 COINS");
    await userEvent.click(cell("piso", 1));
    expect(status()).toHaveTextContent("GUARDADO · +27 COINS");
    await userEvent.click(cell("parede", 2));
    expect(status()).toHaveTextContent("GUARDADO · +30 GEMS");
    expect(m.calls("POST /api/me/office/parede/2/remove")).toBe(1);
  });

  // C38
  it("action errors", async () => {
    const occupied = json(409, { error: { code: "cell_occupied", message: "o espaço já tem um móvel" } });
    const cases: [string, () => Response | Promise<Response>, string][] = [
      ["409", () => occupied, "o espaço já tem um móvel"],
      ["500 no body", () => new Response(null, { status: 500 }), "falha na conexão. tente de novo."],
      ["network", () => Promise.reject(new TypeError("fetch failed")), "falha na conexão. tente de novo."],
    ];
    for (const [name, respond, text] of cases) {
      mockFetch({ "POST /api/me/office/piso/0": respond, "POST /api/me/office/piso/1/remove": respond });
      const setPlayer = vi.fn();
      const { unmount } = render(
        <GameContext.Provider value={{ player: player({ office: room({ piso: { 1: "mesa" } }) }), catalog: CATALOG, setPlayer }}>
          <OfficePage />
        </GameContext.Provider>,
      );
      await userEvent.click(cell("piso", 0));
      expect(status(), `install ${name}`).toHaveTextContent(text);
      expect(screen.getByRole("region", { name: "sala" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "TODOS" }));
      await userEvent.click(cell("piso", 1));
      expect(status(), `remove ${name}`).toHaveTextContent(text);
      expect(screen.getByRole("region", { name: "sala" })).toBeInTheDocument();
      expect(setPlayer).not.toHaveBeenCalled();
      unmount();
      vi.unstubAllGlobals();
    }
  });

  // C39
  it("pending disables room", async () => {
    let release!: (r: Response) => void;
    mockFetch({ "POST /api/me/office/piso/0": () => new Promise<Response>((r) => (release = r)) });
    renderOffice(player({ coins: 100 }));
    await userEvent.click(cell("piso", 0));
    const all = [...cells("parede"), ...cells("piso")];
    expect(all).toHaveLength(32);
    for (const c of all) expect(c).toBeDisabled();
    await act(async () => release(json(200, { player: player({ coins: 40, office: room({ piso: { 0: "mesa" } }) }) })));
    for (const c of all) expect(c).toBeEnabled();
  });

  // C45
  it("unknown furniture", async () => {
    const m = mockFetch({ "POST /api/me/office/piso/0/remove": json(200, { player: player({ office: room({ piso: { 1: "mesa" } }) }) }) });
    renderOffice(player({ office: room({ piso: { 0: "sofa", 1: "mesa" } }) }));
    expect(cell("piso", 0).querySelector(".office-cell-glyph")).toHaveTextContent(/^\?$/);
    expect(screen.getByText("1 móveis instalados")).toBeInTheDocument();
    expect(stat("CONFORTO")).toBe("8");
    await userEvent.click(cell("piso", 0));
    expect(m.calls("POST /api/me/office/piso/0/remove")).toBe(1);
    expect(status()).toHaveTextContent(/^GUARDADO$/);
  });

  // game-art C29
  it("furniture art", async () => {
    renderOffice(player({ office: room({ piso: { 0: "mesa", 1: "sofa" } }) }));
    for (const f of OFFICE.furniture) {
      const box = card(f.id).querySelector(".office-glyph") as HTMLElement;
      const img = box.querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/office-${f.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(box.textContent).not.toContain(f.glyph);
      // the art carries the colour now; the catalog colour no longer paints the glyph box
      expect(box.style.color).toBe("");

      await userEvent.click(card(f.id));
      const head = detail().querySelector(".office-detail-glyph img")!;
      expect(head.getAttribute("src")).toBe(`/art/icon/office-${f.id}.png`);
      expect(head.getAttribute("alt")).toBe("");
      expect(head.getAttribute("width")).toBe("32");
    }

    const mesa = cell("piso", 0).querySelector(".office-cell-glyph img")!;
    expect(mesa.getAttribute("src")).toBe("/art/icon/office-mesa.png");
    expect(mesa.getAttribute("alt")).toBe("");
    expect(mesa.getAttribute("width")).toBe("32");
    expect(cell("piso", 2).querySelector("img")).toBeNull();
    expect(cell("piso", 2).querySelector(".office-cell-glyph")?.textContent).toBe("+");
    expect(cell("piso", 1).querySelector("img")).toBeNull();
    expect(cell("piso", 1).querySelector(".office-cell-glyph")?.textContent).toBe("?");

    fireEvent.error(card("mesa").querySelector("img")!);
    expect(card("mesa").querySelector(".office-glyph img")).toBeNull();
    expect(card("mesa").querySelector(".office-glyph")).toHaveTextContent("[==]");
  });

  // game-art C30
  it("office background", () => {
    renderOffice();
    const room = screen.getByRole("region", { name: "sala" });
    expect(room).toHaveClass("office-room");
    expect(room.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/office.png)");
  });
});

function expectIcon(img: Element | null | undefined, src: string, width = 16) {
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe(String(width));
}

describe("OfficeScene assets", () => {
  // assets C22
  it("price icon", () => {
    renderOffice(player({ office: room() }));
    const coins = card("mesa").querySelector(".office-tag")!;
    expect(coins.textContent).toBe("60C");
    expectIcon(coins.firstElementChild, "/art/icon/hud-coin.png");
    expect(coins.firstChild).toBe(coins.firstElementChild);
    const gems = card("janela").querySelector(".office-tag")!;
    expect(gems.textContent).toBe("60G");
    expectIcon(gems.firstElementChild, "/art/icon/hud-gem.png");
    expect(gems.firstChild).toBe(gems.firstElementChild);
  });

  // assets C24: comfort 0 / 30 / 75 / 120 / 190 reach levels 1..5 (janela = 15, setup2 = 14)
  const windows = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, "janela"]));
  const setups = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, "setup2"]));
  it.each([
    [room(), "CANTINHO", "bronze"],
    [room({ parede: windows(2) }), "HOME OFFICE", "prata"],
    [room({ parede: windows(5) }), "ESTÚDIO", "ouro"],
    [room({ parede: windows(8) }), "LAB DEV", "azul"],
    [room({ parede: windows(8), piso: setups(5) }), "SEDE DEVSERVE", "roxo"],
  ])("level medal (%#)", (office, name, medal) => {
    renderOffice(player({ office }));
    const level = document.querySelector(".office-level")!;
    expect(level.textContent).toBe(name);
    expectIcon(level.firstElementChild, `/art/icon/medal-${medal}.png`, 32);
    expect(level.firstChild).toBe(level.firstElementChild);
  });
});
