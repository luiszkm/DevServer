import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SkillsPage from "@/app/(game)/skills/page";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, COMMANDS, SKILL_TREES, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { SkillsScene } from "./SkillsScene";

function renderScene(p: Player = player(), catalog: Catalog = CATALOG, setPlayer = vi.fn()) {
  render(
    <GameContext.Provider value={{ player: p, catalog, setPlayer }}>
      <SkillsScene />
    </GameContext.Provider>,
  );
  return { setPlayer };
}

const node = (id: string) => document.querySelector(`[data-skill="${id}"]`) as HTMLElement;
const action = (id: string, a: string) => node(id).querySelector(`[data-action="${a}"]`) as HTMLButtonElement | null;
const allNodes = () => Array.from(document.querySelectorAll<HTMLElement>("[data-skill]"));
const states = () => Object.fromEntries(allNodes().map((n) => [n.dataset.skill, n.dataset.state]));
const slots = () => Array.from(document.querySelectorAll<HTMLElement>("[data-slot]"));
const tree = () => screen.getByRole("group", { name: /·/ });
const baseGroup = () => screen.getByRole("group", { name: "SKILLS BASE" });

/** A BACKEND player who unlocked `ids` (levels default 1) and equipped `loadout`. */
function backend(ids: string[], loadout: (string | null)[], extra: Partial<Player> = {}): Player {
  return player({
    skills: ids,
    skillLevels: Object.fromEntries(ids.map((id) => [id, 1])),
    loadout: [...loadout, null, null, null, null].slice(0, 4),
    ...extra,
  });
}

describe("SkillsScene base kit", () => {
  it("lists SKILLS BASE from catalog commands with no skill and no limit", () => {
    renderScene();
    const group = baseGroup();
    expect(group).toHaveTextContent("SKILLS BASE");
    const ids = Array.from(group.querySelectorAll<HTMLElement>("[data-command]")).map((e) => e.dataset.command);
    const kit = COMMANDS.filter((c) => !c.skill && !c.limit);
    expect(ids).toEqual(kit.map((c) => c.id));
    for (const c of kit) {
      const row = group.querySelector(`[data-command="${c.id}"]`)!;
      expect(row).toHaveTextContent(c.label);
      expect(row).toHaveTextContent(c.hint);
      expect(row).toHaveTextContent(c.cost ? `${c.cost} SP` : "grátis");
      expect(row.querySelector("[data-action]")).toBeNull();
    }
    expect(group.querySelector('[data-command="be1"]')).toBeNull();
    expect(group.querySelector('[data-command="ship"]')).toBeNull();
  });
});

describe("SkillsScene tree", () => {
  it.each([
    ["FRONTEND", "FRONTEND · SUPORTE", "code", ["fe1", "fe2", "fe3"], ["BACKEND", "DEVOPS", "FULLSTACK"]],
    ["BACKEND", "BACKEND · ATAQUE", "server", ["be1", "be2", "be3", "be4", "be5", "be6", "be7"], ["FRONTEND", "DEVOPS", "FULLSTACK"]],
    ["DEVOPS", "DEVOPS · DEFESA", "shield", ["do1", "do2", "do3"], ["FRONTEND", "BACKEND", "FULLSTACK"]],
    ["FULLSTACK", "FULLSTACK · HÍBRIDO", "laptop", ["fs1", "fs2", "fs3"], ["FRONTEND", "BACKEND", "DEVOPS"]],
  ])("shows only the class tree in catalog order (%s)", (cls, title, icon, ids, hidden) => {
    renderScene(player({ class: cls }));
    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(tree()).toHaveTextContent(title);
    expect(tree().querySelector(".skills-tree-name img")?.getAttribute("src")).toBe(`/art/icon/ic-${icon}.png`);
    expect(allNodes().map((n) => n.dataset.skill)).toEqual(ids);
    ids.forEach((id, j) => {
      const def = SKILL_TREES.find((t) => t.class === cls)!.nodes[j];
      expect(node(id).querySelector(".skill-glyph img")?.getAttribute("src")).toBe(`/art/icon/skill-${id}.png`);
      expect(node(id)).toHaveTextContent(def.name);
      expect(node(id)).toHaveTextContent(def.description);
    });
    for (const name of hidden) expect(tree()).not.toHaveTextContent(name);
  });

  it("marks node states: level, cost of the next open node, locked", () => {
    renderScene(backend(["be1", "be2"], ["be1", "be2"], { skillLevels: { be1: 3, be2: 1 } }));
    expect(states()).toEqual({ be1: "Nv 3", be2: "Nv 1", be3: "1 PT", be4: "BLOQ.", be5: "BLOQ.", be6: "BLOQ.", be7: "BLOQ." });
    const locked = node("be4").querySelector(".skill-state")!;
    expect(locked.textContent).toBe("BLOQ.");
    expect(locked.firstElementChild?.getAttribute("src")).toBe("/art/icon/ic-lock.png");
    expect(node("be3").querySelector('img[src="/art/icon/ic-lock.png"]')).toBeNull();
  });

  it("offers each action only where it applies", () => {
    renderScene(backend(["be1", "be2"], ["be1"], { skillPoints: 5 }));
    expect(action("be1", "unequip")).toHaveTextContent("REMOVER");
    expect(action("be1", "equip")).toBeNull();
    expect(action("be2", "equip")).toHaveTextContent("EQUIPAR");
    expect(action("be3", "unlock")).toHaveTextContent("DESBLOQUEAR");
    expect(action("be3", "upgrade")).toBeNull();
    expect(action("be3", "equip")).toBeNull();
    for (const a of ["unlock", "equip", "unequip", "upgrade"]) expect(action("be4", a)).toBeNull();
  });

  it("disables unlock without the points for it", () => {
    renderScene(backend([], [], { skillPoints: 0 }));
    expect(action("be1", "unlock")).toBeDisabled();
    cleanup();
    renderScene(backend([], [], { skillPoints: 1 }));
    expect(action("be1", "unlock")).toBeEnabled();
  });

  it.each([
    ["level 1 with 1 point", 1, 1, "UPAR · 2 PT", false],
    ["level 1 with 2 points", 1, 2, "UPAR · 2 PT", true],
    ["level 2 with 2 points", 2, 2, "UPAR · 3 PT", false],
    ["level 2 with 3 points", 2, 3, "UPAR · 3 PT", true],
    ["level 3 with 99 points", 3, 99, "NV MÁX.", false],
  ])("upgrade button (%s)", (_n, level, points, label, enabled) => {
    renderScene(backend(["be1"], ["be1"], { skillLevels: { be1: level }, skillPoints: points }));
    expect(action("be1", "upgrade")).toHaveTextContent(label);
    if (enabled) expect(action("be1", "upgrade")).toBeEnabled();
    else expect(action("be1", "upgrade")).toBeDisabled();
  });

  it("disables EQUIPAR while the loadout is full, never REMOVER", () => {
    renderScene(backend(["be1", "be2", "be3", "be4", "be5"], ["be1", "be2", "be3", "be4"]));
    expect(action("be5", "equip")).toBeDisabled();
    for (const id of ["be1", "be2", "be3", "be4"]) expect(action(id, "unequip")).toBeEnabled();
    cleanup();
    renderScene(backend(["be1", "be2", "be3", "be4", "be5"], ["be1", null, "be3", "be4"]));
    expect(action("be5", "equip")).toBeEnabled();
  });

  it("tree comes from catalog", () => {
    const trees = SKILL_TREES.map((t) =>
      t.id === "backend" ? { ...t, name: "SERVIDOR", role: "DANO", nodes: t.nodes.map((n) => (n.id === "be1" ? { ...n, name: "ROTA" } : n)) } : t,
    );
    renderScene(player(), { ...CATALOG, skillTrees: trees });
    expect(tree()).toHaveTextContent("SERVIDOR · DANO");
    expect(node("be1")).toHaveTextContent("ROTA");
  });
});

describe("SkillsScene loadout", () => {
  it("renders the 4 slots in loadout order, empty ones as VAZIO", () => {
    renderScene(backend(["be1", "be2", "be3"], [null, "be3", null, "be1"], { skillLevels: { be1: 2, be2: 1, be3: 1 } }));
    const s = slots();
    expect(s.map((e) => e.dataset.filled)).toEqual(["false", "true", "false", "true"]);
    expect(s[0]).toHaveTextContent("VAZIO");
    expect(s[1]).toHaveTextContent("DEADLOCK");
    expect(s[1]).toHaveTextContent("Nv 1 · +12% dano");
    expect(s[3]).toHaveTextContent("ENDPOINT");
    expect(s[3]).toHaveTextContent("Nv 2 · +12% dano");
    expect(s[3].querySelector("img")?.getAttribute("src")).toBe("/art/icon/skill-be1.png");
    expect(screen.getByText("LOADOUT 2/4")).toBeInTheDocument();
  });

  it("shows the class special after the 4 slots with the power bar", () => {
    renderScene(player({ power: 40 }));
    const special = document.querySelector("[data-special]") as HTMLElement;
    expect(special.dataset.special).toBe("ship");
    expect(special).toHaveTextContent("ESPECIAL");
    expect(special).toHaveTextContent("SHIP IT");
    expect(special).toHaveTextContent("o deploy que resolve · 80 dano");
    expect(special).toHaveTextContent("PODER 40/100");
    expect((special.querySelector(".skill-power-bar > div") as HTMLElement).style.width).toBe("40%");
    expect(special.dataset.ready).toBe("false");
    expect(slots()[3].compareDocumentPosition(special) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    renderScene(player({ class: "FRONTEND", power: 100 }));
    const front = document.querySelector("[data-special]") as HTMLElement;
    expect(front.dataset.special).toBe("hot_reload");
    expect(front.dataset.ready).toBe("true");
    expect(front).toHaveTextContent("PODER 100/100");
  });

  it("has no special slot for a class without a limit command", () => {
    renderScene(player({ class: "DEVOPS" }));
    expect(document.querySelector("[data-special]")).toBeNull();
  });

  it("sums the bonus over the loadout at each level, not over every unlocked skill", () => {
    renderScene(backend(["be1", "be2", "be4", "be7"], ["be1", "be4", "be7", null], { skillLevels: { be1: 3, be2: 1, be4: 2, be7: 1 }, skillPoints: 3 }));
    expect(screen.getByText("bônus ativo: +10 HP · +12 SP · +16% dano")).toBeInTheDocument();
    expect(screen.getByText("PONTOS: 3")).toBeInTheDocument();
    cleanup();
    renderScene(backend([], []));
    expect(screen.getByText("bônus ativo: +0 HP · +0 SP · +0% dano")).toBeInTheDocument();
  });

  it("clicking a filled slot removes that skill", async () => {
    const updated = backend(["be1"], []);
    const f = mockFetch({ "POST /api/me/skills/be1/unequip": json(200, { player: updated }) });
    const { setPlayer } = renderScene(backend(["be1"], ["be1"]));
    await userEvent.click(screen.getByRole("button", { name: "remover ENDPOINT" }));
    expect(await screen.findByRole("status")).toHaveTextContent("> ENDPOINT removida do loadout");
    expect(setPlayer).toHaveBeenCalledWith(updated);
    expect(f.calls("POST /api/me/skills/be1/unequip")).toBe(1);
  });
});

describe("SkillsScene actions", () => {
  it.each([
    ["unlock equipped", "be1", "unlock", backend([], []), backend(["be1"], ["be1"], { skillPoints: 0 }), "> ENDPOINT desbloqueada e equipada"],
    ["unlock with full loadout", "be5", "unlock", backend(["be1", "be2", "be3", "be4"], ["be1", "be2", "be3", "be4"]), backend(["be1", "be2", "be3", "be4", "be5"], ["be1", "be2", "be3", "be4"]), "> MIGRATION desbloqueada · loadout cheio"],
    ["equip", "be2", "equip", backend(["be1", "be2"], ["be1"]), backend(["be1", "be2"], ["be1", "be2"]), "> QUERY PESADA equipada"],
    ["unequip", "be1", "unequip", backend(["be1"], ["be1"]), backend(["be1"], []), "> ENDPOINT removida do loadout"],
    ["upgrade", "be1", "upgrade", backend(["be1"], ["be1"], { skillPoints: 2 }), backend(["be1"], ["be1"], { skillLevels: { be1: 2 }, skillPoints: 0 }), "> ENDPOINT subiu para Nv 2 · +12% dano"],
  ])("%s calls the api, passes the player and reports", async (_n, id, a, before, after, text) => {
    const f = mockFetch({ [`POST /api/me/skills/${id}/${a}`]: json(200, { player: after }) });
    const { setPlayer } = renderScene(before);
    await userEvent.click(action(id, a)!);
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(setPlayer).toHaveBeenCalledWith(after);
    expect(f.calls(`POST /api/me/skills/${id}/${a}`)).toBe(1);
  });

  it.each([
    ["unlock", "be1", backend([], []), "sem pontos", "erro ao desbloquear"],
    ["equip", "be2", backend(["be1", "be2"], ["be1"]), "loadout cheio. remova uma habilidade antes", "erro ao equipar"],
    ["unequip", "be1", backend(["be1"], ["be1"]), "desbloqueie a habilidade primeiro", "erro ao remover"],
    ["upgrade", "be1", backend(["be1"], ["be1"], { skillPoints: 2 }), "habilidade já está no nível máximo", "erro ao upar"],
  ])("%s error shows the api message, the fallback, or the offline text", async (a, id, p, apiMessage, fallback) => {
    for (const [failure, text] of [
      [() => json(409, { error: { code: "x", message: apiMessage } }), apiMessage],
      [() => new Response(null, { status: 502 }), fallback],
      [() => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
    ] as const) {
      mockFetch({ [`POST /api/me/skills/${id}/${a}`]: failure as () => Response });
      const { setPlayer } = renderScene(p);
      const before = states();
      await userEvent.click(action(id, a)!);
      expect(await screen.findByRole("status")).toHaveTextContent(`> ${text}`);
      expect(states()).toEqual(before);
      expect(setPlayer).not.toHaveBeenCalled();
      expect(action(id, a)).toBeEnabled();
      cleanup();
    }
  });

  it("disables every action and slot while a request runs", async () => {
    mockFetch({ "POST /api/me/skills/be2/equip": () => new Promise<Response>(() => {}) });
    renderScene(backend(["be1", "be2", "be3"], ["be1"], { skillPoints: 9 }));
    await userEvent.click(action("be2", "equip")!);
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-action], [data-slot][data-filled='true']"));
    expect(buttons.length).toBeGreaterThan(4);
    for (const b of buttons) expect(b).toBeDisabled();
  });

  it("asks to spend on the class tree", () => {
    renderScene(backend([], []));
    expect(screen.getByRole("status")).toHaveTextContent("> gaste pontos na trilha da sua classe.");
  });
});

describe("SkillsScene detail", () => {
  it("shows the first node, then the one clicked, with its levels and command", async () => {
    renderScene(backend(["be1", "be2"], ["be1"], { skillLevels: { be1: 2, be2: 1 } }));
    const panel = () => screen.getByLabelText("detalhe da habilidade");
    expect(panel()).toHaveTextContent("ENDPOINT");
    expect(panel()).toHaveTextContent("$_ ENDPOINT · golpe forte · 18-24 dano · 12 SP");
    const rows = () => Array.from(panel().querySelectorAll<HTMLElement>(".skills-level"));
    expect(rows().map((r) => r.textContent)).toEqual([
      "Nv 1+8% dano · golpe 100% · 1 PT",
      "Nv 2+12% dano · golpe 125% · 2 PT",
      "Nv 3+16% dano · golpe 150% · 3 PT",
    ]);
    expect(rows().map((r) => r.dataset.current)).toEqual(["false", "true", "false"]);
    expect(rows().map((r) => r.dataset.reached)).toEqual(["true", "true", "false"]);
    expect(node("be1").dataset.selected).toBe("true");

    await userEvent.click(screen.getByRole("button", { name: "ver CACHE HIT" }));
    expect(panel()).toHaveTextContent("CACHE HIT");
    expect(rows()[0]).toHaveTextContent("+8 SP");
    expect(rows().map((r) => r.dataset.reached)).toEqual(["false", "false", "false"]);
    expect(node("be4").dataset.selected).toBe("true");
    expect(node("be1").dataset.selected).toBe("false");
  });
});

describe("SkillsScene page and art", () => {
  // C24
  it("skills page renders the scene", () => {
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer: vi.fn() }}>
        <SkillsPage />
      </GameContext.Provider>,
    );
    expect(screen.getByText("ÁRVORE DE HABILIDADES")).toBeInTheDocument();
  });

  // game-art C18
  it("skill art with glyph fallback", () => {
    renderScene(backend(["be1", "be2"], ["be1", "be2"]));
    for (const n of SKILL_TREES.find((t) => t.class === "BACKEND")!.nodes) {
      const img = node(n.id).querySelector(".skill-glyph img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/skill-${n.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
    }
    fireEvent.error(node("be2").querySelector(".skill-glyph img")!);
    expect(node("be2").querySelector(".skill-glyph img")).toBeNull();
    expect(node("be2").querySelector(".skill-glyph")).toHaveTextContent("[]");
  });

  // assets C39, assets-apply C11, C13
  it.each([
    ["FRONTEND", "code"],
    ["BACKEND", "server"],
    ["DEVOPS", "shield"],
    ["FULLSTACK", "laptop"],
  ])("scene chrome and tree icon (%s)", (cls, icon) => {
    renderScene(player({ class: cls }));
    const section = document.querySelector("section.scene") as HTMLElement;
    expect(section.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/scene-noite.png)");
    expect(document.querySelector(".skills-head")).toHaveClass("panel-wood");
    const title = document.querySelector(".skills-tree-name")!;
    expect(title.firstElementChild?.getAttribute("src")).toBe(`/art/icon/ic-${icon}.png`);
    expect(title.firstChild).toBe(title.firstElementChild);
  });

  // assets-apply C20
  it.each([
    ["unlock", "be1", backend([], []), backend(["be1"], ["be1"], { skillPoints: 0 })],
    ["upgrade", "be1", backend(["be1"], ["be1"], { skillPoints: 2 }), backend(["be1"], ["be1"], { skillLevels: { be1: 2 } })],
  ])("sparkle on the node after a 200 %s", async (a, id, before, after) => {
    mockFetch({ [`POST /api/me/skills/${id}/${a}`]: json(200, { player: after }) });
    renderScene(before);
    await userEvent.click(action(id, a)!);
    await screen.findByText(/ENDPOINT/, { selector: "[role=status]" });
    const fx = node(id).querySelector('[data-fx="sparkle"]') as HTMLElement;
    expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/sparkle.png)");
    expect(document.querySelectorAll('[data-fx="sparkle"]')).toHaveLength(1);
  });

  it("no sparkle on equip or on a 409", async () => {
    mockFetch({
      "POST /api/me/skills/be2/equip": json(200, { player: backend(["be1", "be2"], ["be1", "be2"]) }),
      "POST /api/me/skills/be1/upgrade": json(409, { error: { code: "no_skill_points", message: "sem pontos" } }),
    });
    renderScene(backend(["be1", "be2"], ["be1"], { skillPoints: 2 }));
    await userEvent.click(action("be2", "equip")!);
    await screen.findByText(/QUERY PESADA equipada/);
    expect(document.querySelector('[data-fx="sparkle"]')).toBeNull();
    await userEvent.click(action("be1", "upgrade")!);
    await screen.findByText(/sem pontos/);
    expect(document.querySelector('[data-fx="sparkle"]')).toBeNull();
  });
});
