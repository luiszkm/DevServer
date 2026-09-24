import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AvatarPage from "@/app/(game)/avatar/page";
import type { Player } from "@/lib/types";
import { CATALOG, SKINS, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderAvatar(p: Player = player(), setPlayer = vi.fn()) {
  render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer }}>
      <AvatarPage />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const filterOf = (id: string) => SKINS.find((s) => s.id === id)!.filter;
const tab = (name: string) => screen.getByRole("tab", { name });
const cells = () => within(screen.getByRole("region", { name: "mochila" })).queryAllByRole("button");
const cell = (id: string) => document.querySelector(`[data-entry="${id}"]`) as HTMLButtonElement;
const detail = () => screen.getByRole("region", { name: "detalhe do item" });
const detailButton = (name: string) => within(detail()).getByRole("button", { name });
const strip = (id: string) => document.querySelector(`[data-strip="${id}"]`) as HTMLButtonElement;

// skills f2, f3; macbook, cafe and moletom equipped; shadow worn; hpMax 125.
const geared = (overrides: Partial<Player> = {}) =>
  player({
    skills: ["f2", "f3"],
    hp: 125,
    hpMax: 125,
    gear: ["macbook", "cafe", "moletom"],
    equipment: { setup: "macbook", bebida: "cafe", vestuario: "moletom", acessorio: null },
    skins: ["default", "shadow"],
    skin: "shadow",
    inventory: [
      { item: "null_shard", quantity: 3 },
      { item: "sp_potion", quantity: 2 },
      { item: "hp_potion", quantity: 1 },
      { item: "boost_deploy", quantity: 1 },
    ],
    ...overrides,
  });

describe("AvatarScene", () => {
  // C35
  it("preview and totals", () => {
    renderAvatar(geared());
    const hero = document.querySelector(".avatar-hero") as HTMLImageElement;
    expect(hero.getAttribute("src")).toBe("/hero.png");
    expect(hero.style.filter).toBe(filterOf("shadow"));
    expect(screen.getByText("DEV_01")).toBeInTheDocument();
    expect(document.querySelector(".avatar-skin-name")).toHaveTextContent("DEV SOMBRIO");
    const stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("HP máx 125")).toBeInTheDocument();
    // dmg: f3 10 + macbook 8; sp: f2 8 + cafe 12 + shadow 10
    expect(within(stats).getByText("dano +18%")).toBeInTheDocument();
    expect(within(stats).getByText("SP +30")).toBeInTheDocument();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
  });

  // C35 (owned but unequipped gear adds nothing)
  it("preview and totals (owned, not equipped)", () => {
    renderAvatar(geared({ gear: ["macbook", "monitor", "cafe", "moletom", "fone"] }));
    const stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("HP máx 125")).toBeInTheDocument();
    expect(within(stats).getByText("dano +18%")).toBeInTheDocument();
    expect(within(stats).getByText("SP +30")).toBeInTheDocument();
  });

  // C36
  it("paper doll slots", () => {
    renderAvatar(player({ gear: ["macbook"], equipment: { setup: "macbook", bebida: null, vestuario: null, acessorio: null } }));
    const side = (name: string) =>
      within(screen.getByRole("group", { name })).getAllByRole("button").map((b) => b.getAttribute("data-slot"));
    expect(side("slots à esquerda")).toEqual(["setup", "vestuario"]);
    expect(side("slots à direita")).toEqual(["acessorio", "bebida"]);
    const slot = (id: string) => document.querySelector(`[data-slot="${id}"]`) as HTMLButtonElement;
    expect(slot("setup").querySelector(".avatar-slot-glyph")).toHaveTextContent("[Mac]");
    expect(slot("setup").querySelector(".avatar-slot-label")).toHaveTextContent("MACBOOK PRO");
    for (const [id, name] of [["vestuario", "VESTUÁRIO"], ["acessorio", "ACESSÓRIO"], ["bebida", "BEBIDA"]]) {
      expect(slot(id).querySelector(".avatar-slot-glyph")?.textContent).toBe("[ ]");
      expect(slot(id).querySelector(".avatar-slot-label")?.textContent).toBe(name);
    }
  });

  // C37
  it("skin strip", async () => {
    const updated = geared({ skin: "neon", skins: ["default", "neon", "shadow"] });
    const f = mockFetch({ "POST /api/me/skins/neon/equip": json(200, { player: updated }) });
    const { setPlayer } = renderAvatar(geared({ skins: ["default", "neon", "shadow"] }));
    expect(within(screen.getByRole("group", { name: "SKINS" })).getAllByRole("button").map((b) => b.getAttribute("data-strip"))).toEqual([
      "default", "neon", "shadow", "golden",
    ]);
    expect(strip("golden")).toHaveAttribute("aria-disabled", "true");
    expect(strip("neon")).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(strip("golden"));
    expect(screen.getByRole("status")).toHaveTextContent("SKIN BLOQUEADA — COMPRE NA LOJA");
    expect(f.fn).not.toHaveBeenCalled();
    await userEvent.click(strip("neon"));
    expect(await screen.findByText("SKIN EQUIPADA")).toBeInTheDocument();
    expect(f.calls("POST /api/me/skins/neon/equip")).toBe(1);
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  // C38
  it("bag tabs", async () => {
    renderAvatar(geared({ equipment: { setup: "macbook", bebida: "cafe", vestuario: null, acessorio: null } }));
    const hint = () => document.querySelector(".avatar-bag-head .term")?.textContent;
    const tags = () => Object.fromEntries(cells().map((c) => [c.dataset.entry, c.querySelector(".avatar-cell-tag")?.textContent]));
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["EQUIP", "POÇÕES", "LOOT", "SKINS"]);

    expect(hint()).toBe("clique para equipar");
    expect(tags()).toEqual({ macbook: "EQUIP", cafe: "EQUIP", moletom: "roupa" });

    await userEvent.click(tab("POÇÕES"));
    expect(hint()).toBe("use no Bug Fight");
    expect(tags()).toEqual({ sp_potion: "x2", hp_potion: "x1", boost_deploy: "x1" });

    await userEvent.click(tab("LOOT"));
    expect(hint()).toBe("material de craft");
    expect(tags()).toEqual({ null_shard: "x3" });

    await userEvent.click(tab("SKINS"));
    expect(hint()).toBe("clique para vestir");
    expect(Object.keys(tags())).toEqual(["default", "shadow"]);
    expect(tags().shadow).toBe("EM USO");
    expect(tags().default).not.toBe("EM USO");
  });

  // C39
  it("bag detail actions", async () => {
    const updated = player({ devName: "UPDATED" });
    const routes = [
      "POST /api/me/gear/moletom/equip",
      "POST /api/me/gear/macbook/unequip",
      "POST /api/me/skins/default/equip",
      "POST /api/me/items/null_shard/discard",
    ];
    const f = mockFetch(Object.fromEntries(routes.map((r) => [r, json(200, { player: updated })])));
    const { setPlayer } = renderAvatar(geared({ equipment: { setup: "macbook", bebida: "cafe", vestuario: null, acessorio: null } }));

    await userEvent.click(cell("moletom"));
    await userEvent.click(detailButton("EQUIPAR"));
    expect(f.calls("POST /api/me/gear/moletom/equip")).toBe(1);

    await userEvent.click(cell("macbook"));
    await userEvent.click(detailButton("REMOVER"));
    expect(f.calls("POST /api/me/gear/macbook/unequip")).toBe(1);

    await userEvent.click(tab("SKINS"));
    await userEvent.click(cell("shadow"));
    expect(detailButton("EM USO")).toBeDisabled();
    await userEvent.click(cell("default"));
    await userEvent.click(detailButton("VESTIR"));
    expect(f.calls("POST /api/me/skins/default/equip")).toBe(1);

    await userEvent.click(tab("LOOT"));
    await userEvent.click(cell("null_shard"));
    expect(within(detail()).getByText("quantidade: 3")).toBeInTheDocument();
    await userEvent.click(detailButton("DESCARTAR 1"));
    expect(f.calls("POST /api/me/items/null_shard/discard")).toBe(1);

    expect(f.fn).toHaveBeenCalledTimes(4);
    expect(setPlayer).toHaveBeenCalledTimes(4);
    for (const call of setPlayer.mock.calls) expect(call[0]).toEqual(updated);
  });

  // C40
  it("empty bag", () => {
    renderAvatar(player({ gear: [] }));
    expect(tab("EQUIP")).toHaveAttribute("aria-selected", "true");
    expect(cells()).toHaveLength(0);
    expect(within(detail()).getByText("MOCHILA VAZIA")).toBeInTheDocument();
    expect(within(detail()).getByText("nada nesta aba ainda — derrote bugs e compre na Loja.")).toBeInTheDocument();
  });

  // C41
  it.each([
    ["409 with message", () => json(409, { error: { code: "not_owned", message: "você não possui este item. compre na Loja" } }), "você não possui este item. compre na Loja"],
    ["500 without body", () => new Response(null, { status: 500 }), "falha na conexão. tente de novo."],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "falha na conexão. tente de novo."],
  ])("avatar errors and pending (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/gear/moletom/equip": failure as () => Response });
    const { setPlayer } = renderAvatar(geared({ equipment: { setup: "macbook", bebida: null, vestuario: null, acessorio: null } }));
    await userEvent.click(cell("moletom"));
    await userEvent.click(detailButton("EQUIPAR"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(detailButton("EQUIPAR")).toBeEnabled();
  });

  it("avatar errors and pending (pending)", async () => {
    mockFetch({ "POST /api/me/items/null_shard/discard": () => new Promise<Response>(() => {}) });
    renderAvatar(geared());
    await userEvent.click(tab("LOOT"));
    await userEvent.click(detailButton("DESCARTAR 1"));
    expect(detailButton("DESCARTAR 1")).toBeDisabled();
    await userEvent.click(tab("EQUIP"));
    await userEvent.click(cell("macbook"));
    expect(detailButton("REMOVER")).toBeDisabled();
  });

  it("avatar errors and pending (pending, every button)", async () => {
    mockFetch({ "POST /api/me/items/null_shard/discard": () => new Promise<Response>(() => {}) });
    renderAvatar(geared({ equipment: { setup: "macbook", bebida: "cafe", vestuario: null, acessorio: null } }));
    await userEvent.click(tab("LOOT"));
    await userEvent.click(detailButton("DESCARTAR 1"));
    expect(detailButton("DESCARTAR 1")).toBeDisabled();
    await userEvent.click(tab("EQUIP"));
    await userEvent.click(cell("moletom"));
    expect(detailButton("EQUIPAR")).toBeDisabled();
    await userEvent.click(cell("macbook"));
    expect(detailButton("REMOVER")).toBeDisabled();
    await userEvent.click(tab("SKINS"));
    await userEvent.click(cell("default"));
    expect(detailButton("VESTIR")).toBeDisabled();
  });
});
