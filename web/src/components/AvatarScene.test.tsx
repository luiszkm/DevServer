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
    const p = geared();
    const hero = document.querySelector(".avatar-hero") as HTMLCanvasElement;
    // the worn skin's palette and the equipped macbook are on the drawing
    expect(hero.dataset.look).toBe(lookKey(p));
    expect(hero.dataset.look).toContain("/art/sprite/hero/laptop-macbook.png");
    expect(hero.dataset.look).toContain(`${CATALOG.avatar.options.find((o) => o.id === "tone_padrao")!.ramp![0]}>${CATALOG.skins.find((s) => s.id === "shadow")!.palette.tone[0]}`);
    expect(screen.getByText("DEV_01")).toBeInTheDocument();
    expect(document.querySelector(".avatar-skin-name")).toHaveTextContent("DEV SOMBRIO");
    const stats = screen.getByLabelText("atributos");
    expect(within(stats).getByText("HP máx 125")).toBeInTheDocument();
    // dmg: f3 10 + macbook 8; sp: f2 8 + cafe 12 + shadow 10
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
    renderAvatar(player({ rack: rack({ 0: "gpu", 1: "ram" }), gear: ["macbook"], equipment: { setup: "macbook", bebida: null, vestuario: null, acessorio: null } }));
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
    renderAvatar(player({ gear: ["macbook"], equipment: { setup: "macbook", bebida: null, vestuario: null, acessorio: null } }));
    const side = (name: string) =>
      within(screen.getByRole("group", { name })).getAllByRole("button").map((b) => b.getAttribute("data-slot"));
    expect(side("slots à esquerda")).toEqual(["setup", "vestuario"]);
    expect(side("slots à direita")).toEqual(["acessorio", "bebida"]);
    const slot = (id: string) => document.querySelector(`[data-slot="${id}"]`) as HTMLButtonElement;
    expect(slot("setup").querySelector(".avatar-slot-glyph img")?.getAttribute("src")).toBe("/art/icon/gear-macbook.png");
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
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["EQUIP", "POÇÕES", "LOOT", "SKINS", "VISUAL"]);

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

    const setup = slot("setup").querySelector("img")!;
    expect(setup.getAttribute("src")).toBe("/art/icon/gear-macbook.png");
    expect(setup.getAttribute("alt")).toBe("");
    expect(setup.getAttribute("width")).toBe("32");
    expect(slot("acessorio").querySelector("img")).toBeNull();
    expect(slot("acessorio").querySelector(".avatar-slot-glyph")?.textContent).toBe("[ ]");

    await userEvent.click(tab("SKINS"));
    const skin = cell("shadow").querySelector("canvas")!;
    expect(skin.dataset.look).toBe(lookKey({ ...geared(), skin: "shadow" }));
    expect(cell("shadow").querySelector("img")).toBeNull();
    await userEvent.click(cell("shadow"));
    expect(detail().querySelector(".avatar-detail-glyph")?.textContent).toBe("SKN");
    expect(detail().querySelector(".avatar-detail-glyph img")).toBeNull();

    fireEvent.error(setup);
    expect(slot("setup").querySelector("img")).toBeNull();
    expect(slot("setup").querySelector(".avatar-slot-glyph")).toHaveTextContent("[Mac]");
  });
});

describe("AvatarScene visual editor", () => {
  const partButton = (id: string) => document.querySelector(`[data-part="${id}"]`) as HTMLButtonElement;
  const optionButton = (id: string) => document.querySelector(`[data-option="${id}"]`) as HTMLButtonElement;
  const optionIds = () => [...document.querySelectorAll<HTMLElement>("[data-option]")].map((b) => b.dataset.option);
  const hero = () => document.querySelector(".avatar-hero") as HTMLCanvasElement;
  const visual = (name: string) => within(screen.getByRole("region", { name: "detalhe do item" })).getByRole("button", { name });
  const status = () => screen.getByRole("status").textContent;
  const open = async () => userEvent.click(screen.getByRole("tab", { name: "VISUAL" }));

  it("lists every part and its pickable options, prices on the locked ones", async () => {
    renderAvatar();
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
    const { setPlayer } = renderAvatar();
    await open();
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
    const bought = player({ looks: ["hair_moicano"] });
    const f = mockFetch({ "POST /api/me/shop/looks/hair_moicano": json(200, { player: bought }) });
    const { setPlayer } = renderAvatar(player({ gems: 30 }));
    await open();
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
    renderAvatar(player({ gems: 29 }));
    await open();
    await userEvent.click(partButton("hair"));
    await userEvent.click(optionButton("hair_moicano"));
    expect(visual("GEMS INSUFICIENTES")).toBeDisabled();
  });

  it.each([
    ["gear", player({ gear: ["hoodie_trace"], equipment: { setup: null, bebida: null, vestuario: "hoodie_trace", acessorio: null } }), "top", "em uso: MOLETOM STACK TRACE — remova o item para usar a sua escolha."],
    ["skin", player({ skin: "neon", skins: ["default", "neon"] }), "tone", "a skin DEV NEON define esta cor."],
  ])("part set by %s says why", async (_name, p, part, note) => {
    renderAvatar(p);
    await open();
    await userEvent.click(partButton(part));
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it.each([
    ["api error", () => json(409, { error: { code: "not_owned", message: "você não possui este item" } }), "você não possui este item"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), CONNECTION_FAILED],
  ])("save failure keeps the picks (%s)", async (_name, failure, text) => {
    mockFetch({ "PUT /api/me/appearance": failure as () => Response });
    const { setPlayer } = renderAvatar();
    await open();
    await userEvent.click(optionButton("tone_negra"));
    await userEvent.click(visual("SALVAR"));
    expect(status()).toBe(text);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(visual("SALVAR")).toBeEnabled();
    expect(hero().dataset.look).toBe(lookKey(player({ appearance: { ...CATALOG.avatar.defaults, tone: "tone_negra" } })));
  });
});

describe("AvatarScene body", () => {
  const partIds = () => [...document.querySelectorAll<HTMLElement>("[data-part]")].map((b) => b.dataset.part);
  const bodyRow = () => screen.getByRole("group", { name: "corpo" });
  const open = async () => userEvent.click(screen.getByRole("tab", { name: "VISUAL" }));

  it("feminino hides the beard and offers the feminine hair styles", async () => {
    renderAvatar(player({ body: "feminino" }));
    await open();
    expect(partIds()).not.toContain("beard");
    expect(within(bodyRow()).getByText("CORPO: FEMININO")).toBeInTheDocument();
    await userEvent.click(document.querySelector('[data-part="hair"]') as HTMLButtonElement);
    const hair = [...document.querySelectorAll<HTMLElement>("[data-option]")].map((b) => b.dataset.option);
    expect(hair).toEqual(expect.arrayContaining(["hair_rabo", "hair_trancas", "hair_franja", "hair_longo"]));
    expect(document.querySelector(".avatar-hero")!.getAttribute("data-look")).toContain("/art/sprite/hero/body-f.png");
  });

  it("masculino shows the beard and not the feminine hair", async () => {
    renderAvatar();
    await open();
    expect(partIds()).toContain("beard");
    await userEvent.click(document.querySelector('[data-part="hair"]') as HTMLButtonElement);
    expect(document.querySelector('[data-option="hair_rabo"]')).toBeNull();
  });

  it("switching body needs a redesign token", async () => {
    renderAvatar(player({ inventory: [] }));
    await open();
    expect(within(bodyRow()).getByRole("button", { name: "TROCAR PARA FEMININO" })).toBeDisabled();
    expect(within(bodyRow()).getByText("precisa de 1 TOKEN DE REDESIGN — compre na Loja.")).toBeInTheDocument();
  });

  it("with a token, TROCAR posts the other body", async () => {
    const changed = player({ body: "feminino", inventory: [] });
    const f = mockFetch({ "POST /api/me/body": json(200, { player: changed }) });
    const { setPlayer } = renderAvatar(player({ inventory: [{ item: "redesign_token", quantity: 1 }] }));
    await open();
    expect(within(bodyRow()).getByText("tokens de redesign: 1")).toBeInTheDocument();
    await userEvent.click(within(bodyRow()).getByRole("button", { name: "TROCAR PARA FEMININO" }));
    expect(JSON.parse(f.fn.mock.calls[0][1]!.body as string)).toEqual({ body: "feminino" });
    expect(setPlayer).toHaveBeenCalledWith(changed);
    expect(screen.getByRole("status")).toHaveTextContent("CORPO TROCADO");
  });

  it("refused switch shows the api message", async () => {
    mockFetch({ "POST /api/me/body": json(409, { error: { code: "no_redesign_token", message: "compre um TOKEN DE REDESIGN na Loja" } }) });
    const { setPlayer } = renderAvatar(player({ inventory: [{ item: "redesign_token", quantity: 1 }] }));
    await open();
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
