import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AvatarPage from "@/app/(game)/avatar/page";
import { availableFor, resolveLook } from "@/lib/avatar";
import { CONNECTION_FAILED } from "@/lib/gear";
import type { Player } from "@/lib/types";
import { CATALOG, json, mockFetch, player, rack } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderAvatar(p: Player = player(), setPlayer = vi.fn()) {
  render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer }}>
      <AvatarPage />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const lookKey = (p: Player) => resolveLook(p, CATALOG).key;
const tab = (name: string) => screen.getByRole("tab", { name });
const cells = () => within(screen.getByRole("region", { name: "mochila" })).queryAllByRole("button");
const cell = (id: string) => document.querySelector(`[data-entry="${id}"]`) as HTMLButtonElement;
const detail = () => screen.getByRole("region", { name: "detalhe do item" });
const detailButton = (name: string) => within(detail()).getByRole("button", { name });

// skills fe1, be2 equipped; macbook, cafe and moletom equipped; shadow worn; hpMax 125.
const geared = (overrides: Partial<Player> = {}) =>
  player({
    skills: ["fe1", "be2"],
    skillLevels: { fe1: 1, be2: 1 },
    loadout: ["fe1", "be2", null, null],
    hp: 125,
    hpMax: 125,
    gear: ["macbook", "cafe", "moletom"],
    equipment: { bebida: "cafe", torso: "moletom", acessorio: "macbook" },
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
    const p = geared();
    const hero = document.querySelector(".avatar-hero") as HTMLCanvasElement;
    // the worn skin's palette and the equipped macbook are on the drawing
    expect(hero.dataset.look).toBe(lookKey(p));
    expect(hero.dataset.look).toContain("/art/sprite/hero/laptop-basico.png");
    expect(hero.dataset.look).toContain(`${CATALOG.avatar.options.find((o) => o.id === "tone_padrao")!.ramp![0]}>${CATALOG.skins.find((s) => s.id === "shadow")!.palette.tone[0]}`);
    expect(screen.getByText("DEV_01")).toBeInTheDocument();
    expect(document.querySelector(".avatar-skin-name")).toHaveTextContent("DEV SOMBRIO");
    const stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("HP máx 125")).toBeInTheDocument();
    // dmg: be2 10 + macbook 8; sp: fe1 8 + cafe 12 + shadow 10
    expect(within(stats).getByText("dano +18%")).toBeInTheDocument();
    expect(within(stats).getByText("SP +30")).toBeInTheDocument();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
  });

  // C41 (server-room)
  it("rack bonuses", () => {
    renderAvatar(player({ rack: rack({ 0: "gpu", 1: "ram" }) }));
    let stats = screen.getByLabelText("atributos");
    // gpu: POWER 60 -> +4% dano; ram: RAM 45 -> +6 SP
    expect(within(stats).getByText("dano +4%")).toBeInTheDocument();
    expect(within(stats).getByText("SP +6")).toBeInTheDocument();
    cleanup();
    renderAvatar(player({ rack: rack({ 0: "gpu", 1: "ram" }), gear: ["macbook"], equipment: { acessorio: "macbook", bebida: null, torso: null } }));
    stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("dano +12%")).toBeInTheDocument();
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
    renderAvatar(player({ gear: ["macbook"], equipment: { acessorio: "macbook", bebida: null, torso: null } }));
    const slots = within(screen.getByRole("group", { name: "slots" })).getAllByRole("button").map((b) => b.getAttribute("data-slot"));
    expect(slots).toEqual(CATALOG.gearSlots.map((s) => s.id));
    const slot = (id: string) => document.querySelector(`[data-slot="${id}"]`) as HTMLButtonElement;
    expect(slot("acessorio").querySelector(".avatar-slot-glyph img")?.getAttribute("src")).toBe("/art/icon/gear-macbook.png");
    expect(slot("acessorio").querySelector(".avatar-slot-label")).toHaveTextContent("MACBOOK PRO");
    for (const [id, name] of [
      ["cabeca", "CABEÇA"], ["oculos", "ÓCULOS"], ["brinco", "BRINCO"], ["colar", "COLAR"], ["torso", "TORSO"], ["cinto", "CINTO"],
      ["pernas", "PERNAS"], ["pe", "PÉ"], ["maos", "MÃOS"], ["bebida", "BEBIDA"],
    ]) {
      expect(slot(id).querySelector(".avatar-slot-glyph")?.textContent).toBe("[ ]");
      expect(slot(id).querySelector(".avatar-slot-label")?.textContent).toBe(name);
    }
  });

  // C37: unowned skins are not in the bag; an owned one equips from the SKINS tab.
  it("skin strip", async () => {
    const updated = geared({ skin: "neon", skins: ["default", "neon", "shadow"] });
    const f = mockFetch({ "POST /api/me/skins/neon/equip": json(200, { player: updated }) });
    const { setPlayer } = renderAvatar(geared({ skins: ["default", "neon", "shadow"] }));
    await userEvent.click(tab("SKINS"));
    expect(cells().map((b) => b.getAttribute("data-entry"))).toEqual(["default", "neon", "shadow"]);
    expect(cell("golden")).toBeNull();
    await userEvent.click(cell("neon"));
    await userEvent.click(detailButton("VESTIR"));
    expect(await screen.findByText("SKIN EQUIPADA")).toBeInTheDocument();
    expect(f.calls("POST /api/me/skins/neon/equip")).toBe(1);
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  // C38
  it("bag tabs", async () => {
    renderAvatar(geared({ equipment: { acessorio: "macbook", bebida: "cafe", torso: null } }));
    const hint = () => document.querySelector(".avatar-bag-head .term")?.textContent;
    const tags = () => Object.fromEntries(cells().map((c) => [c.dataset.entry, c.querySelector(".avatar-cell-tag")?.textContent]));
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["EQUIP", "POÇÕES", "LOOT", "SKINS"]);

    expect(hint()).toBe("clique para equipar");
    expect(tags()).toEqual({ macbook: "EQUIP", cafe: "EQUIP", moletom: "torso" });

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
    const { setPlayer } = renderAvatar(geared({ equipment: { acessorio: "macbook", bebida: "cafe", torso: null } }));

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

  it("slot tags for every gear slot", () => {
    const pieces = ["bone", "oculos_luz", "brinco_bit", "cracha", "cinto_util", "calca_cargo", "tenis_sprint", "luvas_dev"];
    renderAvatar(player({ gear: pieces }));
    const tags = Object.fromEntries(cells().map((c) => [c.dataset.entry, c.querySelector(".avatar-cell-tag")?.textContent]));
    expect(tags).toEqual({
      bone: "cabeça", oculos_luz: "óculos", brinco_bit: "brinco", cracha: "colar",
      cinto_util: "cinto", calca_cargo: "pernas", tenis_sprint: "pé", luvas_dev: "mãos",
    });
  });

  it("USAR on an XP item spends it on the server", async () => {
    const updated = player({ devName: "UPDATED", xp: 150, inventory: [] });
    const f = mockFetch({ "POST /api/me/items/xp_potion/use": json(200, { player: updated }) });
    const { setPlayer } = renderAvatar(geared({ inventory: [{ item: "sp_potion", quantity: 2 }, { item: "xp_potion", quantity: 1 }] }));
    await userEvent.click(tab("POÇÕES"));
    await userEvent.click(cell("sp_potion"));
    expect(within(detail()).queryByRole("button", { name: "USAR" })).toBeNull();
    await userEvent.click(cell("xp_potion"));
    expect(within(detail()).getByText("quantidade: 1")).toBeInTheDocument();
    await userEvent.click(detailButton("USAR"));
    expect(await screen.findByRole("status")).toHaveTextContent("+150 XP");
    expect(f.calls("POST /api/me/items/xp_potion/use")).toBe(1);
    expect(f.fn).toHaveBeenCalledTimes(1);
    expect(setPlayer).toHaveBeenCalledWith(updated);
  });

  it("USAR on an XP item shows the api error", async () => {
    mockFetch({ "POST /api/me/items/xp_elixir/use": json(409, { error: { code: "no_item", message: "você não tem este item" } }) });
    const { setPlayer } = renderAvatar(geared({ inventory: [{ item: "xp_elixir", quantity: 1 }] }));
    await userEvent.click(tab("POÇÕES"));
    await userEvent.click(detailButton("USAR"));
    expect(await screen.findByRole("status")).toHaveTextContent("você não tem este item");
    expect(setPlayer).not.toHaveBeenCalled();
    expect(detailButton("USAR")).toBeEnabled();
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
    const { setPlayer } = renderAvatar(geared({ equipment: { acessorio: "macbook", bebida: null, torso: null } }));
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
    renderAvatar(geared({ equipment: { acessorio: "macbook", bebida: "cafe", torso: null } }));
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

  // game-art C11
  it("item art", async () => {
    renderAvatar(geared());
    const cases: [string, string, string, string][] = [
      ["POÇÕES", "sp_potion", "POÇÃO DE CACHE", "++"],
      ["POÇÕES", "hp_potion", "POÇÃO DE MEMÓRIA", "HP+"],
      ["POÇÕES", "boost_deploy", "ACELERADOR DE DEPLOY", ">>"],
      ["LOOT", "null_shard", "FRAGMENTO NULL", "0x0"],
    ];
    for (const [bag, id, name, glyph] of cases) {
      await userEvent.click(tab(bag));
      const img = cell(id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/item-${id}.png`);
      expect(img.getAttribute("alt")).toBe(name);
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(cell(id).textContent).not.toContain(glyph);

      await userEvent.click(cell(id));
      const head = detail().querySelector(".avatar-detail-head img")!;
      expect(head.getAttribute("src")).toBe(`/art/icon/item-${id}.png`);
      expect(head.getAttribute("alt")).toBe("");
      expect(head.getAttribute("width")).toBe("32");
    }
    await userEvent.click(tab("POÇÕES"));
    fireEvent.error(cell("sp_potion").querySelector("img")!);
    expect(cell("sp_potion").querySelector("img")).toBeNull();
    expect(cell("sp_potion")).toHaveTextContent("++");
  });

  // game-art C17
  it("gear art", async () => {
    renderAvatar(geared());
    const slot = (id: string) => document.querySelector(`[data-slot="${id}"]`) as HTMLButtonElement;
    await userEvent.click(tab("EQUIP"));
    for (const [id, name, glyph] of [["macbook", "MACBOOK PRO", "[Mac]"], ["cafe", "CAFÉ EXPRESSO", "{C}"], ["moletom", "MOLETOM CONFORTÁVEL", "[[]]"]]) {
      const img = cell(id).querySelector("img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/gear-${id}.png`);
      expect(img.getAttribute("alt")).toBe(name);
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
      expect(cell(id).textContent).not.toContain(glyph);

      await userEvent.click(cell(id));
      const head = detail().querySelector(".avatar-detail-head img")!;
      expect(head.getAttribute("src")).toBe(`/art/icon/gear-${id}.png`);
      expect(head.getAttribute("alt")).toBe("");
      expect(head.getAttribute("width")).toBe("32");
    }

    const notebook = slot("acessorio").querySelector("img")!;
    expect(notebook.getAttribute("src")).toBe("/art/icon/gear-macbook.png");
    expect(notebook.getAttribute("alt")).toBe("");
    expect(notebook.getAttribute("width")).toBe("32");

    await userEvent.click(tab("SKINS"));
    const skin = cell("shadow").querySelector("canvas")!;
    expect(skin.dataset.look).toBe(lookKey({ ...geared(), skin: "shadow" }));
    expect(cell("shadow").querySelector("img")).toBeNull();
    await userEvent.click(cell("shadow"));
    expect(detail().querySelector(".avatar-detail-glyph")?.textContent).toBe("SKN");
    expect(detail().querySelector(".avatar-detail-glyph img")).toBeNull();

    // the notebook slot's label also carries ic-gear (assets-apply C13): the fallback is about the gear's own box
    fireEvent.error(notebook);
    expect(slot("acessorio").querySelector(".avatar-slot-glyph img")).toBeNull();
    expect(slot("acessorio").querySelector(".avatar-slot-glyph")).toHaveTextContent("[Mac]");
  });
});

describe("AvatarScene visual editor", () => {
  const partButton = (id: string) => document.querySelector(`[data-part="${id}"]`) as HTMLButtonElement;
  const optionButton = (id: string) => document.querySelector(`[data-option="${id}"]`) as HTMLButtonElement;
  const optionIds = () => [...document.querySelectorAll<HTMLElement>("[data-option]")].map((b) => b.dataset.option);
  const hero = () => document.querySelector(".avatar-hero") as HTMLCanvasElement;
  const visual = (name: string) => within(screen.getByRole("region", { name: "detalhe do item" })).getByRole("button", { name });
  const status = () => screen.getByRole("status").textContent;
  const withToken = (overrides: Partial<Player> = {}) =>
    player({ inventory: [{ item: "redesign_token", quantity: 1 }], ...overrides });
  const open = async (p: Player = withToken(), setPlayer = vi.fn()) => {
    renderAvatar(p, setPlayer);
    await userEvent.click(tab("POÇÕES"));
    await userEvent.click(cell("redesign_token"));
    await userEvent.click(detailButton("USAR"));
    return { setPlayer };
  };

  it("lists every part and its pickable options, prices on the locked ones", async () => {
    await open();
    expect([...document.querySelectorAll<HTMLElement>("[data-part]")].map((b) => b.textContent)).toEqual(
      CATALOG.avatar.parts.map((p) => p.name),
    );
    expect(optionIds()).toEqual(["tone_clara", "tone_padrao", "tone_morena", "tone_parda", "tone_negra", "tone_retinta"]);
    expect(optionButton("tone_padrao")).toHaveAttribute("aria-pressed", "true");
    expect(optionButton("tone_negra").querySelectorAll(".avatar-swatch > span")).toHaveLength(4);

    await userEvent.click(partButton("hair"));
    const hair = CATALOG.avatar.options.filter((o) => o.part === "hair" && availableFor(o, "masculino")).map((o) => o.id);
    expect(hair).not.toContain("hair_rabo");
    expect(optionIds()).toEqual(hair);
    expect(optionButton("hair_moicano")).toHaveAttribute("data-locked", "true");
    expect(optionButton("hair_moicano")).toHaveTextContent("30g");
    expect(optionButton("hair_curto")).toHaveAttribute("data-locked", "false");
    // each style card previews the hero with that style on
    expect(optionButton("hair_curto").querySelector("canvas")!.dataset.look).toContain("/art/sprite/hero/hair-curto.png");

    await userEvent.click(partButton("top"));
    expect(optionIds()).not.toContain("top_hoodie_trace");
    expect(optionIds()).not.toContain("top_moletom_gear");
  });

  it("a pick previews at once, SALVAR sends only the picks, DESFAZER drops them", async () => {
    const saved = player({ devName: "SAVED" });
    const f = mockFetch({ "PUT /api/me/appearance": json(200, { player: saved }) });
    const { setPlayer } = await open();
    const before = hero().dataset.look;
    expect(visual("SALVAR")).toBeDisabled();
    expect(visual("DESFAZER")).toBeDisabled();

    await userEvent.click(optionButton("tone_negra"));
    expect(hero().dataset.look).toBe(lookKey(player({ appearance: { ...CATALOG.avatar.defaults, tone: "tone_negra" } })));
    expect(f.fn).not.toHaveBeenCalled();
    await userEvent.click(visual("DESFAZER"));
    expect(hero().dataset.look).toBe(before);

    await userEvent.click(optionButton("tone_negra"));
    await userEvent.click(partButton("hairColor"));
    await userEvent.click(optionButton("hair_ruivo"));
    await userEvent.click(visual("SALVAR"));
    const [, init] = f.fn.mock.calls[0];
    expect(init!.method).toBe("PUT");
    expect(JSON.parse(init!.body as string)).toEqual({ appearance: { tone: "tone_negra", hairColor: "hair_ruivo" } });
    expect(setPlayer).toHaveBeenCalledWith(saved);
    expect(status()).toBe("VISUAL SALVO");
    expect(visual("SALVAR")).toBeDisabled();
  });

  it("a locked pick blocks SALVAR until bought", async () => {
    const bought = player({ looks: ["hair_moicano"], inventory: [{ item: "redesign_token", quantity: 1 }] });
    const f = mockFetch({ "POST /api/me/shop/looks/hair_moicano": json(200, { player: bought }) });
    const { setPlayer } = await open(withToken({ gems: 30 }));
    await userEvent.click(partButton("hair"));
    await userEvent.click(optionButton("hair_moicano"));
    expect(hero().dataset.look).toContain("/art/sprite/hero/hair-moicano.png");
    expect(visual("SALVAR")).toBeDisabled();
    expect(screen.getByText("compre MOICANO para salvar.")).toBeInTheDocument();
    await userEvent.click(visual("COMPRAR · 30 GEMS"));
    expect(f.calls("POST /api/me/shop/looks/hair_moicano")).toBe(1);
    expect(setPlayer).toHaveBeenCalledWith(bought);
    expect(status()).toBe("MOICANO COMPRADO");
  });

  it("can't afford: the buy button says so and stays off", async () => {
    await open(withToken({ gems: 29 }));
    await userEvent.click(partButton("hair"));
    await userEvent.click(optionButton("hair_moicano"));
    expect(visual("GEMS INSUFICIENTES")).toBeDisabled();
  });

  it.each([
    [
      "gear",
      withToken({ gear: ["hoodie_trace"], equipment: { notebook: null, bebida: null, torso: "hoodie_trace", acessorio: null } }),
      "top",
      "em uso: MOLETOM STACK TRACE — remova o item para usar a sua escolha.",
    ],
    ["skin", withToken({ skin: "neon", skins: ["default", "neon"] }), "tone", "a skin DEV NEON define esta cor."],
  ])("part set by %s says why", async (_name, p, part, note) => {
    await open(p);
    await userEvent.click(partButton(part));
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it.each([
    ["api error", () => json(409, { error: { code: "not_owned", message: "você não possui este item" } }), "você não possui este item"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), CONNECTION_FAILED],
  ])("save failure keeps the picks (%s)", async (_name, failure, text) => {
    mockFetch({ "PUT /api/me/appearance": failure as () => Response });
    const { setPlayer } = await open();
    await userEvent.click(optionButton("tone_negra"));
    await userEvent.click(visual("SALVAR"));
    expect(status()).toBe(text);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(visual("SALVAR")).toBeEnabled();
    expect(hero().dataset.look).toBe(lookKey(player({ appearance: { ...CATALOG.avatar.defaults, tone: "tone_negra" } })));
  });

  it("USAR on the redesign token opens the editor", async () => {
    renderAvatar(withToken());
    expect(screen.queryByRole("region", { name: "editor visual" })).not.toBeInTheDocument();
    await userEvent.click(tab("POÇÕES"));
    await userEvent.click(cell("redesign_token"));
    await userEvent.click(detailButton("USAR"));
    expect(screen.getByRole("region", { name: "editor visual" })).toBeInTheDocument();
    expect(document.querySelector(".avatar-bag-head .term")).toHaveTextContent("monte o seu dev");
  });
});

describe("AvatarScene body", () => {
  const partIds = () => [...document.querySelectorAll<HTMLElement>("[data-part]")].map((b) => b.dataset.part);
  const bodyRow = () => screen.getByRole("group", { name: "corpo" });
  const withToken = (overrides: Partial<Player> = {}) =>
    player({ inventory: [{ item: "redesign_token", quantity: 1 }], ...overrides });
  const open = async (p: Player = withToken(), setPlayer = vi.fn()) => {
    renderAvatar(p, setPlayer);
    await userEvent.click(tab("POÇÕES"));
    await userEvent.click(cell("redesign_token"));
    await userEvent.click(detailButton("USAR"));
    return { setPlayer };
  };

  it("laptop part is set by the notebook", async () => {
    const zeros = { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 };
    await open(withToken({ notebook: { level: 7, rarity: "epico", upgrades: zeros } }));
    await userEvent.click(document.querySelector('[data-part="laptop"]') as HTMLButtonElement);
    expect(screen.getByText("definido pelo notebook")).toBeInTheDocument();
    for (const id of ["laptop_raro", "laptop_epico", "laptop_lendario"]) {
      expect(document.querySelector(`[data-option="${id}"]`)).toBeNull();
    }
    cleanup();
    await open(withToken({ notebook: { level: 3, rarity: "basico", upgrades: zeros } }));
    await userEvent.click(document.querySelector('[data-part="laptop"]') as HTMLButtonElement);
    expect(screen.queryByText("definido pelo notebook")).not.toBeInTheDocument();
  });

  it("ficha totals include the notebook", () => {
    renderAvatar(player({
      notebook: { level: 4, rarity: "raro", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 1, rede_5g: 0 } },
    }));
    const stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("dano +3%")).toBeInTheDocument();
    expect(within(stats).getByText("SP +5")).toBeInTheDocument();
  });

  it("slots follow the catalog without notebook", () => {
    renderAvatar(player({ gear: ["macbook"], equipment: { acessorio: "macbook" } }));
    const slots = within(screen.getByRole("group", { name: "slots" })).getAllByRole("button").map((b) => b.getAttribute("data-slot"));
    expect(slots).toEqual(CATALOG.gearSlots.map((s) => s.id));
    expect(slots).not.toContain("notebook");
    expect(document.querySelector('[data-slot="acessorio"] .avatar-slot-label')).toHaveTextContent("MACBOOK PRO");
  });

  it("feminino hides the beard and offers the feminine hair styles", async () => {
    await open(withToken({ body: "feminino" }));
    expect(partIds()).not.toContain("beard");
    expect(within(bodyRow()).getByText("CORPO: FEMININO")).toBeInTheDocument();
    await userEvent.click(document.querySelector('[data-part="hair"]') as HTMLButtonElement);
    const hair = [...document.querySelectorAll<HTMLElement>("[data-option]")].map((b) => b.dataset.option);
    expect(hair).toEqual(expect.arrayContaining(["hair_rabo", "hair_trancas", "hair_franja", "hair_longo"]));
    expect(document.querySelector(".avatar-hero")!.getAttribute("data-look")).toContain("/art/sprite/hero/body-f.png");
  });

  it("masculino shows the beard and not the feminine hair", async () => {
    await open();
    expect(partIds()).toContain("beard");
    await userEvent.click(document.querySelector('[data-part="hair"]') as HTMLButtonElement);
    expect(document.querySelector('[data-option="hair_rabo"]')).toBeNull();
  });

  it("with a token, TROCAR posts the other body", async () => {
    const changed = player({ body: "feminino", inventory: [] });
    const f = mockFetch({ "POST /api/me/body": json(200, { player: changed }) });
    const { setPlayer } = await open();
    expect(within(bodyRow()).getByText("tokens de redesign: 1")).toBeInTheDocument();
    await userEvent.click(within(bodyRow()).getByRole("button", { name: "TROCAR PARA FEMININO" }));
    expect(JSON.parse(f.fn.mock.calls[0][1]!.body as string)).toEqual({ body: "feminino" });
    expect(setPlayer).toHaveBeenCalledWith(changed);
    expect(screen.getByRole("status")).toHaveTextContent("CORPO TROCADO");
  });

  it("refused switch shows the api message", async () => {
    mockFetch({ "POST /api/me/body": json(409, { error: { code: "no_redesign_token", message: "compre um TOKEN DE REDESIGN na Loja" } }) });
    const { setPlayer } = await open();
    await userEvent.click(within(bodyRow()).getByRole("button", { name: "TROCAR PARA FEMININO" }));
    expect(screen.getByRole("status")).toHaveTextContent("compre um TOKEN DE REDESIGN na Loja");
    expect(setPlayer).not.toHaveBeenCalled();
  });
});

describe("AvatarScene scene", () => {
  // assets C39
  it("scene background", () => {
    renderAvatar();
  const section = document.querySelector("section.scene") as HTMLElement;
    expect(section.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/scene-floresta.png)");
  });
});

describe("AvatarScene hero anim", () => {
  // assets C48
  it("hero anim: the preview idles", () => {
    renderAvatar();
    const hero = document.querySelector(".avatar-preview canvas") as HTMLCanvasElement;
    expect(hero.dataset.anim).toBe("idle");
  });
});

describe("AvatarScene applied assets", () => {
  // assets-apply C11
  it("wood header", () => {
    renderAvatar();
    expect(document.querySelector(".avatar-bag-head")).toHaveClass("panel-wood");
  });

  // assets-apply C13
  it("notebook card links to the notebook", () => {
    renderAvatar(player({ notebook: { level: 7, rarity: "epico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }));
    const link = screen.getByRole("link", { name: /NOTEBOOK/ });
    expect(link).toHaveAttribute("href", "/notebook");
    expect(link.querySelector("img")?.getAttribute("src")).toBe("/art/sprite/notebook-epico.png");
    expect(link).toHaveTextContent("ÉPICO");
    expect(link).toHaveTextContent("NV 7");
    expect(document.querySelector('[data-slot="notebook"]')).toBeNull();
  });

  // assets-apply C15: the detail rarity carries the medal
  it.each([
    ["EQUIP", "cafe", "medal-bronze"], ["EQUIP", "macbook", "medal-ouro"], ["EQUIP", "monitor", "medal-rubi"], ["SKINS", "default", null],
  ])("rarity medal (%s %s)", async (bag, id, medal) => {
    renderAvatar(player({ gear: ["cafe", "macbook", "monitor"], equipment: {}, skins: ["default"] }));
    await userEvent.click(tab(bag));
    await userEvent.click(cell(id));
    const rarity = detail().querySelector(".avatar-detail-rarity")!;
    const img = rarity.querySelector("img");
    if (medal) {
      expect(img!.getAttribute("src")).toBe(`/art/icon/${medal}.png`);
      expect(rarity.firstChild).toBe(img);
    } else expect(img).toBeNull();
  });
});
