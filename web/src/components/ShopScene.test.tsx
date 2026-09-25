import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ShopPage from "@/app/(game)/loja/page";
import type { Player } from "@/lib/types";
import { CATALOG, GEAR, ITEMS, RECIPES, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderShop(p: Player = player(), setPlayer = vi.fn(), catalog = CATALOG) {
  render(
    <GameContext.Provider value={{ player: p, catalog, setPlayer }}>
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
      "CANECA DE LOGS", "MOLETOM STACK TRACE", "TECLADO RACE CONDITION",
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

  // game-art C10
  it("item art", async () => {
    renderShop();
    for (const it of ITEMS.filter((i) => i.price)) {
      const img = card(it.id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/item-${it.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(card(it.id).textContent).not.toContain(it.glyph);

      await userEvent.click(card(it.id));
      const big = detail().querySelector("img")!;
      expect(big.getAttribute("src")).toBe(`/art/icon/item-${it.id}.png`);
      expect(big.getAttribute("alt")).toBe("");
      expect(big.getAttribute("width")).toBe("64");
    }
    fireEvent.error(card("hp_potion").querySelector("img")!);
    expect(card("hp_potion").querySelector("img")).toBeNull();
    expect(card("hp_potion").querySelector(".shop-glyph")).toHaveTextContent("HP+");
  });

  // game-art C16
  it("gear art", async () => {
    renderShop();
    for (const g of GEAR) {
      const img = card(g.id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/gear-${g.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(card(g.id).textContent).not.toContain(g.glyph);

      await userEvent.click(card(g.id));
      const big = detail().querySelector("img")!;
      expect(big.getAttribute("src")).toBe(`/art/icon/gear-${g.id}.png`);
      expect(big.getAttribute("alt")).toBe("");
      expect(big.getAttribute("width")).toBe("64");
    }
    fireEvent.error(card("macbook").querySelector("img")!);
    expect(card("macbook").querySelector("img")).toBeNull();
    expect(card("macbook").querySelector(".shop-glyph")).toHaveTextContent("[Mac]");
  });
});

const recipe = (id: string) => document.querySelector(`[data-recipe="${id}"]`) as HTMLButtonElement;
const inv = (...pairs: [string, number][]) => pairs.map(([item, quantity]) => ({ item, quantity }));
const TECLADO_MATS = inv(["race_core", 2], ["memory_crystal", 1], ["wild_trace", 3]);

describe("ShopScene forge", () => {
  // forge C19
  it("forge section", () => {
    renderShop();
    const forge = section("FORJA");
    expect(section("SKINS DO AVATAR").compareDocumentPosition(forge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(forge).getByText("FORJA", { selector: ".shop-section-title" })).toBeInTheDocument();
    expect(cardNames("FORJA")).toEqual([
      "POÇÃO DE CACHE", "POÇÃO DE MEMÓRIA", "ACELERADOR DE DEPLOY", "CANECA DE LOGS", "MOLETOM STACK TRACE", "TECLADO RACE CONDITION",
    ]);
    const art: [string, string][] = [
      ["forja_cache", "/art/icon/item-sp_potion.png"],
      ["forja_memoria", "/art/icon/item-hp_potion.png"],
      ["forja_acelerador", "/art/icon/item-boost_deploy.png"],
      ["forja_caneca", "/art/icon/gear-caneca_log.png"],
      ["forja_hoodie", "/art/icon/gear-hoodie_trace.png"],
      ["forja_teclado", "/art/icon/gear-teclado_race.png"],
    ];
    for (const [id, src] of art) {
      expect(within(forge).getByRole("button", { name: new RegExp(recipe(id).querySelector(".shop-card-name")!.textContent!) })).toBe(recipe(id));
      expect(recipe(id).querySelector("img")!.getAttribute("src")).toBe(src);
    }
  });

  // forge C20
  it.each([
    ["gear owned, with materials", player({ coins: 500, gear: ["teclado_race"], inventory: TECLADO_MATS }), "forja_teclado", "JÁ POSSUI"],
    ["materials and balance", player({ coins: 150, inventory: TECLADO_MATS }), "forja_teclado", "PRONTO"],
    ["materials, no price", player({ coins: 0, inventory: inv(["null_shard", 2]) }), "forja_cache", "PRONTO"],
    ["one material short", player({ coins: 500, inventory: inv(["race_core", 2], ["wild_trace", 3]) }), "forja_teclado", "FALTAM MATERIAIS"],
    ["materials without balance", player({ coins: 149, inventory: TECLADO_MATS }), "forja_teclado", "FALTAM MATERIAIS"],
  ])("forge card status (%s)", (_name, p, id, status) => {
    renderShop(p);
    expect(recipe(id).querySelector(".shop-status")).toHaveTextContent(new RegExp(`^${status}$`));
  });

  // forge C20 (a new dev has no drops)
  it("forge card status (new dev)", () => {
    renderShop(player());
    for (const r of RECIPES) expect(recipe(r.id).querySelector(".shop-status")).toHaveTextContent(/^FALTAM MATERIAIS$/);
  });

  // forge C21
  it("forge detail", async () => {
    renderShop(player({ coins: 500, inventory: inv(["race_core", 1], ["wild_trace", 3]) }));
    await userEvent.click(recipe("forja_teclado"));
    expect(within(detail()).getByText("LENDÁRIO")).toBeInTheDocument();
    expect(within(detail()).getByText("TECLADO RACE CONDITION")).toBeInTheDocument();
    expect(within(detail()).getByText("As teclas chegam antes de você apertar.")).toBeInTheDocument();
    expect(within(detail()).getByText("bônus: +12% de dano")).toBeInTheDocument();
    const lines = within(within(detail()).getByRole("list", { name: "materiais" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines).toEqual(["NÚCLEO DE CONCORRÊNCIA 1/2", "CRISTAL DE MEMÓRIA 0/1", "STACK TRACE SELVAGEM 3/3"]);
    expect(within(detail()).getByText("custo: 150 COINS")).toBeInTheDocument();
    expect(detail().querySelector("img")!.getAttribute("src")).toBe("/art/icon/gear-teclado_race.png");

    await userEvent.click(recipe("forja_cache"));
    expect(within(detail()).getByText("POÇÃO DE CACHE")).toBeInTheDocument();
    const cache = within(within(detail()).getByRole("list", { name: "materiais" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(cache).toEqual(["FRAGMENTO NULL 0/2"]);
    expect(detail().textContent).not.toContain("custo:");
    expect(detail().textContent).not.toContain("bônus:");
  });

  // forge C22
  it.each([
    ["item can forge", player({ inventory: inv(["null_shard", 2]) }), "forja_cache", "FORJAR", true],
    ["gear can forge", player({ coins: 150, inventory: TECLADO_MATS }), "forja_teclado", "FORJAR E EQUIPAR", true],
    ["gear owned", player({ coins: 150, gear: ["teclado_race"], inventory: TECLADO_MATS }), "forja_teclado", "JÁ POSSUI", false],
    ["no material, no balance", player({ coins: 0, inventory: [] }), "forja_teclado", "FALTAM MATERIAIS", false],
    ["materials, 19 coins", player({ coins: 19, inventory: inv(["corrupt_dep", 1], ["wild_trace", 1]) }), "forja_acelerador", "COINS INSUFICIENTES", false],
  ])("forge button (%s)", async (_name, p, id, label, enabled) => {
    renderShop(p);
    await userEvent.click(recipe(id));
    const buttons = within(detail()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([label]);
    if (enabled) expect(buttons[0]).toBeEnabled();
    else expect(buttons[0]).toBeDisabled();
  });

  // forge C32 (added after verification round 1): JÁ POSSUI wins over missing materials and balance
  it.each([
    ["owned, no materials, no balance", player({ coins: 0, gear: ["teclado_race"], inventory: [] })],
    ["owned, materials, 149 coins", player({ coins: 149, gear: ["teclado_race"], inventory: TECLADO_MATS })],
  ])("forge owned priority (%s)", async (_name, p) => {
    renderShop(p);
    expect(recipe("forja_teclado").querySelector(".shop-status")).toHaveTextContent(/^JÁ POSSUI$/);
    await userEvent.click(recipe("forja_teclado"));
    const buttons = within(detail()).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["JÁ POSSUI"]);
    expect(buttons[0]).toBeDisabled();
  });

  // forge C22 (gems price)
  it("forge button (gems price)", async () => {
    const gemsCatalog = {
      ...CATALOG,
      recipes: RECIPES.map((r) => (r.id === "forja_acelerador" ? { ...r, price: { currency: "gems" as const, amount: 5 } } : r)),
    };
    renderShop(player({ gems: 4, coins: 999, inventory: inv(["corrupt_dep", 1], ["wild_trace", 1]) }), vi.fn(), gemsCatalog);
    await userEvent.click(recipe("forja_acelerador"));
    expect(detailButton("GEMS INSUFICIENTES")).toBeDisabled();
    expect(within(detail()).getByText("custo: 5 GEMS")).toBeInTheDocument();
  });

  // forge C23
  it.each([
    ["forja_cache", player({ inventory: inv(["null_shard", 2]) }), "FORJAR", "+1 POÇÃO DE CACHE"],
    ["forja_caneca", player({ coins: 40, inventory: inv(["log_essence", 3], ["null_shard", 2]) }), "FORJAR E EQUIPAR", "ITEM FORJADO E EQUIPADO"],
  ])("forge success (%s)", async (id, p, label, toast) => {
    const updated = player({ devName: "UPDATED" });
    const route = `POST /api/me/forge/${id}`;
    const f = mockFetch({ [route]: json(200, { player: updated }) });
    const { setPlayer } = renderShop(p);
    await userEvent.click(recipe(id));
    await userEvent.click(detailButton(label));
    expect(await screen.findByRole("status")).toHaveTextContent(new RegExp(`^${toast.replace("+", "\\+")}$`));
    expect(f.calls(route)).toBe(1);
    expect(f.fn).toHaveBeenCalledTimes(1);
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  // forge C24
  it.each([
    ["409 with message", () => json(409, { error: { code: "not_enough_materials", message: "materiais insuficientes" } }), "materiais insuficientes"],
    ["500 without body", () => new Response(null, { status: 500 }), "falha na conexão. tente de novo."],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "falha na conexão. tente de novo."],
  ])("forge errors (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/forge/forja_cache": failure as () => Response });
    const { setPlayer } = renderShop(player({ inventory: inv(["null_shard", 2]) }));
    await userEvent.click(recipe("forja_cache"));
    await userEvent.click(detailButton("FORJAR"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(setPlayer).not.toHaveBeenCalled();
  });

  // forge C25
  it("forge pending", async () => {
    const f = mockFetch({ "POST /api/me/forge/forja_cache": () => new Promise<Response>(() => {}) });
    renderShop(player({ inventory: inv(["null_shard", 4]) }));
    await userEvent.click(recipe("forja_cache"));
    await userEvent.click(detailButton("FORJAR"));
    expect(detailButton("FORJAR")).toBeDisabled();
    await userEvent.click(detailButton("FORJAR"));
    expect(f.fn).toHaveBeenCalledTimes(1);
  });

  // forge C26
  it("craft-only gear", async () => {
    const f = mockFetch({ "POST /api/me/gear/teclado_race/equip": json(200, { player: player() }) });
    renderShop(player({ gems: 9999, coins: 9999 }));
    expect(card("teclado_race").querySelector(".shop-status")).toHaveTextContent(/^FORJA$/);
    await userEvent.click(card("teclado_race"));
    expect(within(detail()).getByText("custo: só na forja")).toBeInTheDocument();
    expect(detailButton("SÓ NA FORJA")).toBeDisabled();
    await userEvent.click(detailButton("SÓ NA FORJA"));
    expect(f.fn).not.toHaveBeenCalled();
  });

  // forge C26 (owned)
  it("craft-only gear (owned)", async () => {
    const f = mockFetch({ "POST /api/me/gear/teclado_race/equip": json(200, { player: player() }) });
    renderShop(player({ gear: ["teclado_race"] }));
    expect(card("teclado_race").querySelector(".shop-status")).toHaveTextContent(/^NO INVENTÁRIO$/);
    await userEvent.click(card("teclado_race"));
    await userEvent.click(detailButton("EQUIPAR"));
    expect(await screen.findByRole("status")).toHaveTextContent("ITEM EQUIPADO");
    expect(f.calls("POST /api/me/gear/teclado_race/equip")).toBe(1);
  });
});

describe("ShopScene avatar styles", () => {
  const priced = CATALOG.avatar.options.filter((o) => o.price);

  it("lists every priced avatar option with its status", () => {
    const p = player({ looks: ["hair_moicano", "hair_azul"], appearance: { ...CATALOG.avatar.defaults, hair: "hair_moicano" } });
    renderShop(p);
    expect(cardNames("ESTILOS DO AVATAR")).toEqual(priced.map((o) => o.name));
    const status = (id: string) => card(id).querySelector(".shop-status")?.textContent;
    expect(status("hair_moicano")).toBe("EM USO");
    expect(status("hair_azul")).toBe("NO GUARDA-ROUPA");
    expect(status("hair_topete")).toBe("30g");
    expect(status("top_jaqueta")).toBe("150c");
    // the card shows the player's own hero wearing the option
    expect(card("hair_topete").querySelector("canvas")!.dataset.look).toContain("/art/sprite/hero/hair-topete.png");
  });

  it.each([
    [player({ gems: 30 }), "hair_topete", "COMPRAR E USAR", "POST /api/me/shop/looks/hair_topete", "TOPETE COMPRADO"],
    [player({ looks: ["hair_topete"] }), "hair_topete", "USAR", "PUT /api/me/appearance", "VISUAL SALVO"],
  ])("style actions (%#)", async (p, id, label, route, toast) => {
    const updated = player({ devName: "UPDATED" });
    const f = mockFetch({ [route]: json(200, { player: updated }) });
    const { setPlayer } = renderShop(p);
    await userEvent.click(card(id));
    await userEvent.click(detailButton(label));
    expect(await screen.findByRole("status")).toHaveTextContent(toast);
    expect(f.calls(route)).toBe(1);
    if (route.startsWith("PUT")) expect(JSON.parse(f.fn.mock.calls[0][1]!.body as string)).toEqual({ appearance: { hair: "hair_topete" } });
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  it.each([
    [player({ gems: 29 }), "GEMS INSUFICIENTES"],
    [player({ looks: ["hair_topete"], appearance: { ...CATALOG.avatar.defaults, hair: "hair_topete" } }), "EM USO"],
  ])("style button off (%#)", async (p, label) => {
    renderShop(p);
    await userEvent.click(card("hair_topete"));
    expect(detailButton(label)).toBeDisabled();
  });
});

