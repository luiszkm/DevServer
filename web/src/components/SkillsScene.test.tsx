import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SkillsPage from "@/app/(game)/skills/page";
import type { Catalog, Player } from "@/lib/types";
import { CATALOG, SKILL_TREES, json, mockFetch, player } from "@/test/helpers";
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

const node = (id: string) => document.querySelector(`[data-skill="${id}"]`) as HTMLButtonElement;
const allNodes = () => Array.from(document.querySelectorAll<HTMLButtonElement>("[data-skill]"));
const states = () => Object.fromEntries(allNodes().map((n) => [n.dataset.skill, n.dataset.state]));

describe("SkillsScene", () => {
  // C13
  it("renders trees in catalog order", () => {
    renderScene();
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["FRONTEND", "BACKEND", "INFRA"]);
    SKILL_TREES.forEach((tree, i) => {
      const buttons = within(groups[i]).getAllByRole("button");
      expect(buttons.map((b) => b.dataset.skill)).toEqual(tree.nodes.map((n) => n.id));
      tree.nodes.forEach((n, j) => {
        expect(buttons[j]).toHaveTextContent(n.glyph);
        expect(buttons[j]).toHaveTextContent(n.name);
        expect(buttons[j]).toHaveTextContent(n.description);
      });
    });
  });

  // C14
  it("marks node states", () => {
    renderScene(player({ skills: ["f1"] }));
    expect(states()).toEqual({ f1: "ATIVA", f2: "1 PT", f3: "BLOQ.", b1: "1 PT", b2: "BLOQ.", b3: "BLOQ.", i1: "1 PT", i2: "BLOQ.", i3: "BLOQ." });
    for (const n of allNodes()) expect(n).toHaveTextContent(n.dataset.state!);
  });

  // C15
  it("shows points", () => {
    renderScene(player({ skillPoints: 3 }));
    expect(screen.getByText("PONTOS: 3")).toBeInTheDocument();
  });

  // C16
  it.each([
    [["f1", "f2", "b1", "b2", "b3"], "bônus ativo: +20 HP · +18 SP · +12% dano"],
    [[], "bônus ativo: +0 HP · +0 SP · +0% dano"],
    [["i1", "i2", "i3", "f1", "f2", "f3"], "bônus ativo: +25 HP · +16 SP · +25% dano"],
  ])("sums active bonus (%j)", (skills, text) => {
    renderScene(player({ skills }));
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  // C17
  it("unlock calls api and reports", async () => {
    const updated = player({ skills: ["b1"], skillPoints: 0, hp: 110, hpMax: 110 });
    const f = mockFetch({ "POST /api/me/skills/b1/unlock": json(200, { player: updated }) });
    const { setPlayer } = renderScene();
    await userEvent.click(node("b1"));
    expect(await screen.findByRole("status")).toHaveTextContent("> API REST desbloqueada · +10 HP máximo permanente");
    expect(setPlayer).toHaveBeenCalledWith(updated);
    expect(f.calls("POST /api/me/skills/b1/unlock")).toBe(1);
  });

  // C18
  it.each([
    ["no_skill_points", () => json(409, { error: { code: "no_skill_points", message: "sem pontos de habilidade. suba de nível com deploys" } }), "sem pontos de habilidade. suba de nível com deploys"],
    ["no body", () => new Response(null, { status: 502 }), "erro ao desbloquear"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
  ])("unlock error shows message (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/skills/f1/unlock": failure as () => Response });
    const { setPlayer } = renderScene(player({ skillPoints: 0 }));
    const before = states();
    await userEvent.click(node("f1"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(states()).toEqual(before);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(node("f1")).toBeEnabled();
  });

  // C19
  it("disables nodes while unlocking", async () => {
    mockFetch({ "POST /api/me/skills/f1/unlock": () => new Promise<Response>(() => {}) });
    renderScene();
    await userEvent.click(node("f1"));
    expect(allNodes()).toHaveLength(9);
    for (const n of allNodes()) expect(n).toBeDisabled();
  });

  // C20
  it("only available nodes are clickable", async () => {
    const f = mockFetch({});
    renderScene(player({ skills: ["f1"] }));
    for (const id of ["f1", "f3", "b2", "i3"]) {
      expect(node(id)).toBeDisabled();
      await userEvent.click(node(id));
    }
    for (const id of ["f2", "b1", "i1"]) expect(node(id)).toBeEnabled();
    expect(f.fn).not.toHaveBeenCalled();
  });

  // C21
  it("lists active skills", () => {
    renderScene(player({ skills: ["b1", "f1"] }));
    expect(screen.getByLabelText("ativas em combate").textContent).toBe("</>MARKUP$_API");
  });

  it("lists active skills (none)", () => {
    renderScene(player({ skills: [] }));
    expect(within(screen.getByLabelText("ativas em combate")).getByText("nenhuma habilidade equipada")).toBeInTheDocument();
  });

  // C23
  it("tree comes from catalog", () => {
    const trees = SKILL_TREES.map((t) =>
      t.id === "frontend"
        ? { ...t, nodes: t.nodes.map((n) => (n.id === "f1" ? { ...n, name: "HTML PURO", bonus: { type: "hp" as const, amount: 99 } } : n)) }
        : t,
    );
    renderScene(player({ skills: ["f1"] }), { ...CATALOG, skillTrees: trees });
    expect(node("f1")).toHaveTextContent("HTML PURO");
    expect(screen.getByText("bônus ativo: +99 HP · +0 SP · +0% dano")).toBeInTheDocument();
  });

  // C24
  it("skills page renders the scene", () => {
    render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer: vi.fn() }}>
        <SkillsPage />
      </GameContext.Provider>,
    );
    expect(screen.getByText("ÁRVORE DE HABILIDADES")).toBeInTheDocument();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
  });
});
