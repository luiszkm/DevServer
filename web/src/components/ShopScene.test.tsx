import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ShopPage from "@/app/(game)/loja/page";
import type { Player } from "@/lib/types";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderShop(p: Player = player(), setPlayer = vi.fn()) {
  render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer }}>
      <ShopPage />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const section = (name: string) => screen.getByRole("region", { name });
const card = (id: string) => document.querySelector(`[data-card="${id}"]`) as HTMLButtonElement;
const detail = () => screen.getByRole("region", { name: "detalhe" });
const detailButton = (name: string) => within(detail()).getByRole("button", { name });
const cardNames = (region: string) =>
  within(section(region)).getAllByRole("button").map((b) => b.querySelector(".shop-card-name")?.textContent);

// macbook equipped, moletom owned, neon worn, shadow owned.
const dressed = () =>
  player({
    gems: 20,
    coins: 100,
    gear: ["macbook", "moletom"],
    equipment: { setup: "macbook", bebida: null, vestuario: null, acessorio: null },
    skins: ["default", "neon", "shadow"],
    skin: "neon",
  });

describe("ShopScene", () => {
  // C28
  it("shows the three sections", () => {
    renderShop(player({ gems: 20, inventory: [{ item: "sp_potion", quantity: 2 }] }));
    expect(screen.getByText("LOJA DEVSERVER")).toBeInTheDocument();
    expect(screen.getByText("GEMS: 20")).toBeInTheDocument();
    expect(cardNames("POÇÕES")).toEqual(["POÇÃO DE CACHE", "POÇÃO DE MEMÓRIA", "ACELERADOR DE DEPLOY"]);
    expect(card("sp_potion")).toHaveTextContent("possui: 2");
    expect(card("sp_potion")).toHaveTextContent("15g");
    expect(card("hp_potion")).toHaveTextContent("possui: 0");
    expect(card("hp_potion")).toHaveTextContent("12g");
    expect(card("boost_deploy")).toHaveTextContent("possui: 0");
    expect(card("boost_deploy")).toHaveTextContent("35g");
    expect(cardNames("EQUIPAMENTOS DO DEV")).toEqual([
      "MACBOOK PRO", "MONITOR ULTRAWIDE", "CAFÉ EXPRESSO", "MOLETOM CONFORTÁVEL", "CADEIRA ERGONÔMICA", "FONE COM CANCELAMENTO",
    ]);
    expect(cardNames("SKINS DO AVATAR")).toEqual(["DEV PADRÃO", "DEV NEON", "DEV SOMBRIO", "DEV DOURADO"]);
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
  });

  // C29
  it("cards show bonus and status", () => {
    renderShop(dressed());
    const want: [string, string, string][] = [
      ["macbook", "+8% DMG", "EQUIPADO"],
      ["moletom", "+15 HP", "NO INVENTÁRIO"],
      ["monitor", "+20 SP", "200g"],
      ["cafe", "+12 SP", "50c"],
      ["default", "sem bônus", "NO GUARDA-ROUPA"],
      ["neon", "+5% DMG", "EQUIPADA"],
      ["shadow", "+10 SP", "NO GUARDA-ROUPA"],
      ["golden", "+20 HP", "150g"],
    ];
    for (const [id, bonus, status] of want) {
      expect(card(id).querySelector(".shop-bonus")).toHaveTextContent(bonus);
      expect(card(id).querySelector(".shop-status")).toHaveTextContent(status);
    }
  });

  // C30
  it("detail button per state", async () => {
    renderShop(dressed());
    // potion
    await userEvent.click(card("sp_potion"));
    expect(detail()).toHaveTextContent("POÇÃO DE CACHE");
    expect(detail()).toHaveTextContent("COMUM");
    expect(detailButton("COMPRAR")).toBeEnabled();

    await userEvent.click(card("macbook"));
    expect(detail()).toHaveTextContent("MACBOOK PRO");
    expect(within(detail()).getByText("RARO · CONFIGURAÇÃO")).toBeInTheDocument();
    expect(within(detail()).getByText("bônus: +8% de dano")).toBeInTheDocument();
    expect(within(detail()).getByText("custo: já possui")).toBeInTheDocument();
    expect(detailButton("EQUIPADO")).toBeDisabled();
    expect(detailButton("REMOVER EQUIPAMENTO")).toBeEnabled();

    await userEvent.click(card("monitor"));
    expect(within(detail()).getByText("custo: 200 GEMS")).toBeInTheDocument();
    expect(within(detail()).queryByRole("button", { name: "REMOVER EQUIPAMENTO" })).not.toBeInTheDocument();
    // 20 gems cannot pay 200: the purchase label is covered by the rich player below.

    await userEvent.click(card("moletom"));
    expect(detailButton("EQUIPAR")).toBeEnabled();
    expect(within(detail()).queryByRole("button", { name: "REMOVER EQUIPAMENTO" })).not.toBeInTheDocument();

    await userEvent.click(card("shadow"));
    expect(detailButton("EQUIPAR")).toBeEnabled();

    await userEvent.click(card("neon"));
    expect(detailButton("EQUIPADA")).toBeDisabled();
  });

  // C30 (purchase labels need a player who can pay)
  it("detail button per state (can pay)", async () => {
    renderShop({ ...dressed(), gems: 500 });
    await userEvent.click(card("macbook"));
    expect(within(detail()).getByText("RARO · CONFIGURAÇÃO")).toBeInTheDocument();
    await userEvent.click(card("monitor"));
    expect(detailButton("COMPRAR E EQUIPAR")).toBeEnabled();
    await userEvent.click(card("fone"));
    expect(within(detail()).getByText("custo: 90 GEMS")).toBeInTheDocument();
    await userEvent.click(card("golden"));
    expect(within(detail()).getByText("custo: 150 GEMS")).toBeInTheDocument();
    expect(within(detail()).getByText("bônus: +20 HP")).toBeInTheDocument();
    expect(detailButton("COMPRAR E EQUIPAR")).toBeEnabled();
  });

  // C30 (price instead of "já possui")
  it("detail button per state (not owned)", async () => {
    renderShop(player({ gems: 500 }));
    await userEvent.click(card("macbook"));
    expect(within(detail()).getByText("RARO · CONFIGURAÇÃO")).toBeInTheDocument();
    expect(within(detail()).getByText("bônus: +8% de dano")).toBeInTheDocument();
    expect(within(detail()).getByText("custo: 120 GEMS")).toBeInTheDocument();
    expect(detailButton("COMPRAR E EQUIPAR")).toBeEnabled();
  });

  // C31
  it.each([
    [14, 100, "sp_potion", "GEMS INSUFICIENTES", false],
    [15, 100, "sp_potion", "COMPRAR", true],
    [20, 49, "cafe", "COINS INSUFICIENTES", false],
    [20, 50, "cafe", "COMPRAR E EQUIPAR", true],
    [119, 100, "macbook", "GEMS INSUFICIENTES", false],
    [120, 100, "macbook", "COMPRAR E EQUIPAR", true],
    [59, 100, "neon", "GEMS INSUFICIENTES", false],
    [60, 100, "neon", "COMPRAR E EQUIPAR", true],
  ])("insufficient balance (%i gems, %i coins, %s)", async (gems, coins, id, label, enabled) => {
    renderShop(player({ gems, coins }));
    await userEvent.click(card(id));
    const b = detailButton(label);
    if (enabled) expect(b).toBeEnabled();
    else expect(b).toBeDisabled();
  });

  // C32
  it.each([
    ["sp_potion", "COMPRAR", "POST /api/me/shop/items/sp_potion", "+1 POÇÃO DE CACHE"],
    ["monitor", "COMPRAR E EQUIPAR", "POST /api/me/shop/gear/monitor", "ITEM COMPRADO E EQUIPADO"],
    ["golden", "COMPRAR E EQUIPAR", "POST /api/me/shop/skins/golden", "SKIN COMPRADA E EQUIPADA"],
    ["moletom", "EQUIPAR", "POST /api/me/gear/moletom/equip", "ITEM EQUIPADO"],
    ["shadow", "EQUIPAR", "POST /api/me/skins/shadow/equip", "SKIN EQUIPADA"],
    ["macbook", "REMOVER EQUIPAMENTO", "POST /api/me/gear/macbook/unequip", "ITEM REMOVIDO"],
  ])("actions call their route (%s %s)", async (id, label, route, toast) => {
    const updated = player({ devName: "UPDATED", gems: 1 });
    const f = mockFetch({ [route]: json(200, { player: updated }) });
    const { setPlayer } = renderShop({ ...dressed(), gems: 500 });
    await userEvent.click(card(id));
    await userEvent.click(detailButton(label));
    expect(await screen.findByRole("status")).toHaveTextContent(toast);
    expect(f.calls(route)).toBe(1);
    expect(f.fn).toHaveBeenCalledTimes(1);
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  // C33
  it.each([
    ["409 with message", () => json(409, { error: { code: "not_enough_gems", message: "gems insuficientes" } }), "gems insuficientes"],
    ["500 without body", () => new Response(null, { status: 500 }), "falha na conexão. tente de novo."],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "falha na conexão. tente de novo."],
  ])("action errors (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/shop/items/sp_potion": failure as () => Response });
    const { setPlayer } = renderShop(player({ gems: 20 }));
    await userEvent.click(card("sp_potion"));
    await userEvent.click(detailButton("COMPRAR"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(screen.getByText("LOJA DEVSERVER")).toBeInTheDocument();
    expect(detailButton("COMPRAR")).toBeEnabled();
  });

  // C34
  it("pending disables panel", async () => {
    mockFetch({ "POST /api/me/shop/items/sp_potion": () => new Promise<Response>(() => {}) });
    renderShop(dressed());
    await userEvent.click(card("sp_potion"));
    await userEvent.click(detailButton("COMPRAR"));
    expect(detailButton("COMPRAR")).toBeDisabled();
    await userEvent.click(card("macbook"));
    const buttons = within(detail()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["REMOVER EQUIPAMENTO", "EQUIPADO"]);
    for (const b of buttons) expect(b).toBeDisabled();
    await userEvent.click(card("moletom"));
    expect(detailButton("EQUIPAR")).toBeDisabled();
  });

  // C34 (every panel button, with a balance that could pay)
  it("pending disables panel (every button)", async () => {
    mockFetch({ "POST /api/me/shop/items/sp_potion": () => new Promise<Response>(() => {}) });
    renderShop({ ...dressed(), gems: 500, coins: 500 });
    await userEvent.click(card("sp_potion"));
    await userEvent.click(detailButton("COMPRAR"));
    expect(detailButton("COMPRAR")).toBeDisabled();
    await userEvent.click(card("macbook"));
    expect(detailButton("REMOVER EQUIPAMENTO")).toBeDisabled();
    await userEvent.click(card("monitor"));
    expect(detailButton("COMPRAR E EQUIPAR")).toBeDisabled();
    await userEvent.click(card("cafe"));
    expect(detailButton("COMPRAR E EQUIPAR")).toBeDisabled();
    await userEvent.click(card("moletom"));
    expect(detailButton("EQUIPAR")).toBeDisabled();
    await userEvent.click(card("golden"));
    expect(detailButton("COMPRAR E EQUIPAR")).toBeDisabled();
    await userEvent.click(card("shadow"));
    expect(detailButton("EQUIPAR")).toBeDisabled();
  });
});
