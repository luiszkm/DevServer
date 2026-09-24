import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ServerPage from "@/app/(game)/server/page";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, RACK, json, mockFetch, player, rack } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderServer(p: Player = player(), setPlayer = vi.fn()) {
  const view = render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer }}>
      <ServerPage />
    </GameContext.Provider>,
  );
  return { setPlayer, ...view };
}

const card = (id: string) => document.querySelector(`[data-card="${id}"]`) as HTMLButtonElement;
const cardIds = () => Array.from(document.querySelectorAll("[data-card]")).map((c) => c.getAttribute("data-card"));
const slot = (i: number) => document.querySelector(`[data-slot="${i}"]`) as HTMLButtonElement;
const slots = () => Array.from(document.querySelectorAll("[data-slot]")) as HTMLButtonElement[];
const stat = (id: string) => {
  const el = document.querySelector(`[data-stat="${id}"]`)!;
  return {
    name: el.querySelector(".server-stat-name")?.textContent,
    value: el.querySelector(".server-stat-value")?.textContent,
    width: (el.querySelector(".server-bar-fill") as HTMLElement).style.width,
    bonus: el.querySelector(".server-stat-bonus")?.textContent,
  };
};
const terminal = () => screen.getByRole("status");
const six = (id: string) => rack({ 0: id, 1: id, 2: id, 3: id, 4: id, 5: id });

afterEach(() => vi.unstubAllGlobals());

describe("ServerScene", () => {
  // C30
  it("empty rack", () => {
    renderServer();
    expect(Array.from(document.querySelectorAll("[data-stat]")).map((e) => e.getAttribute("data-stat"))).toEqual(["power", "ram", "uptime"]);
    expect(stat("power")).toMatchObject({ name: "POWER", value: "20", width: "20%" });
    expect(stat("ram")).toMatchObject({ name: "RAM", value: "15", width: "15%" });
    expect(stat("uptime")).toMatchObject({ name: "UPTIME", value: "60%", width: "60%" });
    const rackPanel = screen.getByRole("region", { name: "RACK LOCALHOST-01" });
    expect(rackPanel).toHaveTextContent("RACK LOCALHOST-01");
    expect(slots()).toHaveLength(6);
    const shop = screen.getByRole("region", { name: "LOJA DE COMPONENTES" });
    expect(shop).toHaveTextContent("LOJA DE COMPONENTES");
    expect(cardIds()).toEqual(["cpu", "ram", "ssd", "cache", "lb", "gpu"]);
    expect(cardIds().map((id) => card(id!).querySelector(".server-card-name")?.textContent)).toEqual([
      "CPU 8-CORE", "RAM 32GB", "SSD NVME", "CACHE REDIS", "LOAD BALANCER", "GPU EDGE",
    ]);
    expect(terminal()).toHaveTextContent(/^> selecione um componente para instalar no rack\.$/);
  });

  // C31
  it("stats and bonuses", () => {
    const cases: [Player["rack"], string, Partial<ReturnType<typeof stat>>][] = [
      [rack(), "power", { value: "20", bonus: "DANO +0%" }],
      [rack(), "ram", { value: "15", bonus: "SP MÁX +0" }],
      [rack(), "uptime", { value: "60%", bonus: "COINS DE DEPLOY +0%" }],
      [rack({ 0: "gpu" }), "power", { value: "60", width: "60%", bonus: "DANO +4%" }],
      [six("gpu"), "power", { value: "100", width: "100%", bonus: "DANO +8%" }],
      [rack({ 0: "cpu", 1: "gpu" }), "power", { value: "85", bonus: "DANO +6%" }],
      [rack({ 0: "ram" }), "ram", { value: "45", width: "45%", bonus: "SP MÁX +6" }],
      [six("ram"), "ram", { value: "100", width: "100%", bonus: "SP MÁX +17" }],
      [rack({ 0: "lb" }), "uptime", { value: "80%", width: "80%", bonus: "COINS DE DEPLOY +20%" }],
      [six("lb"), "uptime", { value: "99%", width: "99%", bonus: "COINS DE DEPLOY +39%" }],
      [rack({ 0: "ssd" }), "power", { value: "32", bonus: "DANO +1%" }],
      [rack({ 0: "ssd" }), "uptime", { value: "68%", bonus: "COINS DE DEPLOY +8%" }],
    ];
    for (const [r, id, want] of cases) {
      const { unmount } = renderServer(player({ rack: r }));
      expect(stat(id), `${id} with ${r.join(",")}`).toMatchObject(want);
      unmount();
    }
  });

  // C32
  it("slot states", () => {
    renderServer(player({ rack: rack({ 1: "gpu", 2: "ssd", 3: "quantum" }) }));
    const read = (i: number) => [
      slot(i).querySelector(".server-slot-glyph")?.textContent,
      slot(i).querySelector(".server-slot-name")?.textContent,
      slot(i).querySelector(".server-slot-note")?.textContent,
    ];
    expect(read(0)).toEqual(["-", "SLOT 01 VAZIO", "livre"]);
    expect(read(1)).toEqual(["#", "GPU EDGE", "power +40"]);
    expect(read(2)).toEqual(["=", "SSD NVME", "power +12 · uptime +8"]);
    expect(read(3)[0]).toBe("?");
    expect(read(4)).toEqual(["-", "SLOT 05 VAZIO", "livre"]);
    expect(read(5)).toEqual(["-", "SLOT 06 VAZIO", "livre"]);
  });

  // C33
  it("shop cards", () => {
    const { unmount } = renderServer(player({ coins: 100 }));
    const read = (id: string) => [
      card(id).querySelector(".server-card-glyph")?.textContent,
      card(id).querySelector(".server-card-name")?.textContent,
      card(id).querySelector(".server-card-effect")?.textContent,
      card(id).querySelector(".server-card-price")?.textContent,
    ];
    expect(cardIds().map((id) => read(id!))).toEqual([
      ["::", "CPU 8-CORE", "power +25", "80C"],
      ["[]", "RAM 32GB", "ram +30", "60C"],
      ["=", "SSD NVME", "power +12 · uptime +8", "70C"],
      ["~", "CACHE REDIS", "power +18", "90C"],
      [">>", "LOAD BALANCER", "uptime +20", "120C"],
      ["#", "GPU EDGE", "power +40", "150C"],
    ]);
    expect(card("lb").style.opacity).toBe("0.45");
    expect(card("gpu").style.opacity).toBe("0.45");
    expect(card("cpu").style.opacity).toBe("1");
    unmount();
    renderServer(player({ coins: 80 }));
    expect(card("cpu").style.opacity).toBe("1");
    expect(card("cache").style.opacity).toBe("0.45");
  });

  // C34
  it("rack full", async () => {
    const m = mockFetch({});
    renderServer(player({ coins: 1000, rack: six("ram") }));
    await userEvent.click(card("cpu"));
    expect(terminal()).toHaveTextContent(/^> rack cheio\. remova um componente antes\.$/);
    expect(m.fn).not.toHaveBeenCalled();
  });

  // C35
  it("insufficient coins", async () => {
    const m = mockFetch({ "POST /api/me/rack": json(200, { player: player({ coins: 0, rack: rack({ 0: "cpu" }) }) }) });
    const { unmount } = renderServer(player({ coins: 79 }));
    await userEvent.click(card("cpu"));
    expect(terminal()).toHaveTextContent(/^> coins insuficientes para CPU 8-CORE\.$/);
    expect(screen.getByRole("alert")).toHaveTextContent(/^COINS INSUFICIENTES$/);
    expect(m.fn).not.toHaveBeenCalled();
    unmount();
    renderServer(player({ coins: 80 }));
    await userEvent.click(card("cpu"));
    expect(m.calls("POST /api/me/rack")).toBe(1);
  });

  // C36
  it("buy", async () => {
    const after = player({ coins: 40, rack: rack({ 0: "gpu", 1: "gpu", 2: "ram" }) });
    const m = mockFetch({ "POST /api/me/rack": json(200, { player: after }) });
    const { setPlayer } = renderServer(player({ coins: 100, rack: rack({ 0: "gpu", 1: "gpu" }) }));
    await userEvent.click(card("ram"));
    expect(m.calls("POST /api/me/rack")).toBe(1);
    expect(JSON.parse(String((m.fn.mock.calls[0][1] as RequestInit).body))).toEqual({ component: "ram" });
    expect(setPlayer).toHaveBeenCalledWith(after);
    expect(terminal()).toHaveTextContent(/^> RAM 32GB instalado no slot 03 · ram \+30$/);
  });

  // C37
  it("remove", async () => {
    const after = player({ rack: rack({ 3: "quantum" }) });
    const m = mockFetch({
      "POST /api/me/rack/1/remove": json(200, { player: after }),
      "POST /api/me/rack/3/remove": json(200, { player: player() }),
    });
    const { setPlayer } = renderServer(player({ rack: rack({ 1: "gpu", 3: "quantum" }) }));
    await userEvent.click(slot(1));
    expect(m.calls("POST /api/me/rack/1/remove")).toBe(1);
    expect((m.fn.mock.calls[0][1] as RequestInit).body).toBeUndefined();
    expect(setPlayer).toHaveBeenCalledWith(after);
    expect(terminal()).toHaveTextContent(/^> GPU EDGE removido\. 150 coins devolvidos\.$/);
    await userEvent.click(slot(3));
    expect(m.calls("POST /api/me/rack/3/remove")).toBe(1);
    expect(terminal()).toHaveTextContent(/^> componente removido\.$/);
  });

  // C38
  it("empty slot", async () => {
    const m = mockFetch({});
    renderServer();
    await userEvent.click(slot(4));
    expect(terminal()).toHaveTextContent(/^> slot 05 vazio\. compre um componente ao lado\.$/);
    expect(m.fn).not.toHaveBeenCalled();
  });

  // C39
  it("action errors", async () => {
    const full = json(409, { error: { code: "rack_full", message: "rack cheio. remova um componente antes" } });
    const cases: [string, () => Response | Promise<Response>, string][] = [
      ["409", () => full, "> rack cheio. remova um componente antes"],
      ["500 no body", () => new Response(null, { status: 500 }), "> falha na conexão. tente de novo."],
      ["network", () => Promise.reject(new TypeError("fetch failed")), "> falha na conexão. tente de novo."],
    ];
    for (const [name, respond, text] of cases) {
      mockFetch({ "POST /api/me/rack": respond, "POST /api/me/rack/0/remove": respond });
      const { setPlayer, unmount } = renderServer(player({ coins: 1000, rack: rack({ 0: "gpu" }) }));
      await userEvent.click(card("cpu"));
      expect(terminal().textContent, `buy ${name}`).toBe(text);
      expect(screen.getByRole("region", { name: "RACK LOCALHOST-01" })).toBeInTheDocument();
      await userEvent.click(slot(0));
      expect(terminal().textContent, `remove ${name}`).toBe(text);
      expect(screen.getByRole("region", { name: "RACK LOCALHOST-01" })).toBeInTheDocument();
      expect(setPlayer).not.toHaveBeenCalled();
      unmount();
      vi.unstubAllGlobals();
    }
  });

  // C40
  it("pending disables", async () => {
    let release!: (r: Response) => void;
    mockFetch({ "POST /api/me/rack": () => new Promise<Response>((r) => (release = r)) });
    renderServer(player({ coins: 100 }));
    await userEvent.click(card("ram"));
    const all = [...slots(), ...cardIds().map((id) => card(id!))];
    expect(all).toHaveLength(12);
    for (const b of all) expect(b).toBeDisabled();
    await act(async () => release(json(200, { player: player({ coins: 40, rack: rack({ 0: "ram" }) }) })));
    for (const b of all) expect(b).toBeEnabled();
  });

  // C47
  it("gems priced component", async () => {
    const catalog: Catalog = {
      ...CATALOG,
      rack: { ...RACK, components: RACK.components.map((k) => (k.id === "gpu" ? { ...k, price: { currency: "gems", amount: 150 } } : k)) },
    };
    const show = (p: Player) =>
      render(
        <GameContext.Provider value={{ player: p, catalog, setPlayer: vi.fn() }}>
          <ServerPage />
        </GameContext.Provider>,
      );

    const m = mockFetch({
      "POST /api/me/rack": json(200, { player: player({ gems: 0, coins: 0, rack: rack({ 0: "gpu" }) }) }),
      "POST /api/me/rack/0/remove": json(200, { player: player({ gems: 150, coins: 0 }) }),
    });
    let view = show(player({ gems: 149, coins: 1000 }));
    expect(card("gpu").querySelector(".server-card-price")).toHaveTextContent(/^150G$/);
    expect(card("gpu").style.opacity).toBe("0.45");
    await userEvent.click(card("gpu"));
    expect(terminal()).toHaveTextContent(/^> gems insuficientes para GPU EDGE\.$/);
    expect(screen.getByRole("alert")).toHaveTextContent(/^GEMS INSUFICIENTES$/);
    expect(m.fn).not.toHaveBeenCalled();
    view.unmount();

    view = show(player({ gems: 150, coins: 0 }));
    expect(card("gpu").style.opacity).toBe("1");
    await userEvent.click(card("gpu"));
    expect(m.calls("POST /api/me/rack")).toBe(1);
    view.unmount();

    show(player({ gems: 0, coins: 0, rack: rack({ 0: "gpu" }) }));
    await userEvent.click(slot(0));
    expect(m.calls("POST /api/me/rack/0/remove")).toBe(1);
    expect(terminal()).toHaveTextContent(/^> GPU EDGE removido\. 150 gems devolvidos\.$/);
  });
});
