import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  it.each([
    ["FRONTEND", "FRONTEND · SUPORTE", "code", ["fe1", "fe2", "fe3"], ["BACKEND", "DEVOPS", "FULLSTACK"]],
    ["BACKEND", "BACKEND · ATAQUE", "server", ["be1", "be2", "be3"], ["FRONTEND", "DEVOPS", "FULLSTACK"]],
    ["DEVOPS", "DEVOPS · DEFESA", "shield", ["do1", "do2", "do3"], ["FRONTEND", "BACKEND", "FULLSTACK"]],
    ["FULLSTACK", "FULLSTACK · HÍBRIDO", "laptop", ["fs1", "fs2", "fs3"], ["FRONTEND", "BACKEND", "DEVOPS"]],
  ])("shows only the class tree (%s)", (cls, title, icon, ids, hidden) => {
    renderScene(player({ class: cls }));
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveTextContent(title);
    expect(groups[0].querySelector(".skills-tree-name img")?.getAttribute("src")).toBe(`/art/icon/ic-${icon}.png`);
    const buttons = within(groups[0]).getAllByRole("button");
    expect(buttons.map((b) => b.dataset.skill)).toEqual(ids);
    ids.forEach((id, j) => {
      const nodeDef = SKILL_TREES.find((t) => t.class === cls)!.nodes[j];
      expect(buttons[j].querySelector("img")?.getAttribute("src")).toBe(`/art/icon/skill-${id}.png`);
      expect(buttons[j]).toHaveTextContent(nodeDef.name);
      expect(buttons[j]).toHaveTextContent(nodeDef.description);
    });
    for (const name of hidden) expect(screen.queryByText(name, { exact: false })).not.toBeInTheDocument();
  });

  it("marks node states", async () => {
    const f = mockFetch({});
    renderScene(player({ class: "FRONTEND", skills: ["fe1"] }));
    expect(states()).toEqual({ fe1: "ATIVA", fe2: "1 PT", fe3: "BLOQ." });
    expect(node("fe3").querySelector('img[src="/art/icon/ic-lock.png"]')).not.toBeNull();
    for (const id of ["fe1", "fe3"]) {
      expect(node(id)).toBeDisabled();
      await userEvent.click(node(id));
    }
    expect(node("fe2")).toBeEnabled();
    expect(f.fn).not.toHaveBeenCalled();
  });

  it("shows points and bonus", () => {
    renderScene(player({ class: "FRONTEND", skillPoints: 3, skills: ["fe1", "fe2"] }));
    expect(screen.getByText("PONTOS: 3")).toBeInTheDocument();
    expect(screen.getByText("bônus ativo: +10 HP · +8 SP · +0% dano")).toBeInTheDocument();
    cleanup();
    renderScene(player({ class: "FRONTEND", skills: [] }));
    expect(screen.getByText("bônus ativo: +0 HP · +0 SP · +0% dano")).toBeInTheDocument();
  });

  it("unlock calls api and reports", async () => {
    const updated = player({ skills: ["be1"], skillPoints: 0 });
    const f = mockFetch({ "POST /api/me/skills/be1/unlock": json(200, { player: updated }) });
    const { setPlayer } = renderScene();
    await userEvent.click(node("be1"));
    expect(await screen.findByRole("status")).toHaveTextContent("> ENDPOINT desbloqueada · +8% de dano em todos os ataques");
    expect(setPlayer).toHaveBeenCalledWith(updated);
    expect(f.calls("POST /api/me/skills/be1/unlock")).toBe(1);
  });

  it.each([
    ["wrong class", () => json(409, { error: { code: "skill_wrong_class", message: "essa habilidade é de outra classe" } }), "essa habilidade é de outra classe"],
    ["no body", () => new Response(null, { status: 502 }), "erro ao desbloquear"],
    ["network", () => Promise.reject(new TypeError("Failed to fetch")), "SERVIDOR FORA DO AR"],
  ])("unlock error shows message (%s)", async (_name, failure, text) => {
    mockFetch({ "POST /api/me/skills/be1/unlock": failure as () => Response });
    const { setPlayer } = renderScene();
    const before = states();
    await userEvent.click(node("be1"));
    expect(await screen.findByRole("status")).toHaveTextContent(text);
    expect(states()).toEqual(before);
    expect(setPlayer).not.toHaveBeenCalled();
    expect(node("be1")).toBeEnabled();
  });

  it("disables nodes while unlocking", async () => {
    mockFetch({ "POST /api/me/skills/be1/unlock": () => new Promise<Response>(() => {}) });
    renderScene();
    await userEvent.click(node("be1"));
    expect(allNodes()).toHaveLength(3);
    for (const n of allNodes()) expect(n).toBeDisabled();
  });

  it("lists active skills", () => {
    renderScene(player({ skills: ["be2", "be1"] }));
    const foot = screen.getByLabelText("ativas em combate");
    expect(Array.from(foot.querySelectorAll("img")).map((i) => i.getAttribute("src"))).toEqual(["/art/icon/skill-be1.png", "/art/icon/skill-be2.png"]);
    expect(foot.textContent).toContain("ENDPOINT");
    expect(foot.textContent).toContain("QUERY");
  });

  it("lists active skills (none)", () => {
    renderScene(player({ skills: [] }));
    expect(within(screen.getByLabelText("ativas em combate")).getByText("nenhuma habilidade equipada")).toBeInTheDocument();
  });

  it("asks to spend on the class tree", () => {
    renderScene(player({ skills: [] }));
    expect(screen.getByRole("status")).toHaveTextContent("> gaste pontos na trilha da sua classe.");
  });

  it("tree comes from catalog", () => {
    const trees = SKILL_TREES.map((t) =>
      t.id === "backend"
        ? { ...t, name: "SERVIDOR", role: "DANO", nodes: t.nodes.map((n) => (n.id === "be1" ? { ...n, name: "ROTA" } : n)) }
        : t,
    );
    renderScene(player({ skills: ["be1"] }), { ...CATALOG, skillTrees: trees });
    expect(screen.getByRole("group")).toHaveTextContent("SERVIDOR · DANO");
    expect(node("be1")).toHaveTextContent("ROTA");
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

  // game-art C18
  it("skill art", () => {
    renderScene(player({ skills: ["be1", "be2"] }));
    const nodes = SKILL_TREES.find((t) => t.class === "BACKEND")!.nodes;
    expect(nodes).toHaveLength(3);
    for (const n of nodes) {
      const img = node(n.id).querySelector(".skill-glyph img")!;
      expect(img.getAttribute("src")).toBe(`/art/icon/skill-${n.id}.png`);
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("width")).toBe("32");
      expect(img).toHaveClass("pixelated");
    }
    const chips = Array.from(screen.getByLabelText("ativas em combate").querySelectorAll("img"));
    expect(chips.map((i) => i.getAttribute("src"))).toEqual(["/art/icon/skill-be1.png", "/art/icon/skill-be2.png"]);

    fireEvent.error(node("be2").querySelector(".skill-glyph img")!);
    expect(node("be2").querySelector(".skill-glyph img")).toBeNull();
    expect(node("be2").querySelector(".skill-glyph")).toHaveTextContent("[]");
  });
});

function expectIcon(img: Element | null | undefined, src: string, width = 16) {
  expect(img?.tagName).toBe("IMG");
  expect(img!.getAttribute("src")).toBe(src);
  expect(img!.getAttribute("alt")).toBe("");
  expect(img!.getAttribute("width")).toBe(String(width));
}

describe("SkillsScene assets", () => {
  // assets C18
  it("lock icon", () => {
    renderScene(player({ skills: [] }));
    const locked = node("be2").querySelector(".skill-state")!;
    expect(locked.textContent).toBe("BLOQ.");
    expectIcon(locked.firstElementChild, "/art/icon/ic-lock.png");
    expect(locked.firstChild).toBe(locked.firstElementChild);
    expect(node("be1").querySelector(".skill-state")!.textContent).toBe("1 PT");
    expect(node("be1").querySelector('img[src="/art/icon/ic-lock.png"]')).toBeNull();
  });
});

describe("SkillsScene scene", () => {
  // assets C39
  it("scene background", () => {
    renderScene();
  const section = document.querySelector("section.scene") as HTMLElement;
    expect(section.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/scene-noite.png)");
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

describe("SkillsScene applied assets", () => {
  // assets-apply C11
  it("wood header", () => {
    renderScene();
    expect(document.querySelector(".skills-head")).toHaveClass("panel-wood");
  });

  // assets-apply C13
  it.each([
    ["FRONTEND", "code"],
    ["BACKEND", "server"],
    ["DEVOPS", "shield"],
    ["FULLSTACK", "laptop"],
  ])("generic icon on tree %s", (cls, icon) => {
    renderScene(player({ class: cls }));
    const title = document.querySelector(".skills-tree-name");
    expect(title).toHaveTextContent(cls);
    expectFirstIcon(title, `/art/icon/ic-${icon}.png`);
  });
});

describe("SkillsScene sparkle", () => {
  // assets-apply C20
  it("sparkle on the node unlocked with 200", async () => {
    mockFetch({ "POST /api/me/skills/be1/unlock": json(200, { player: player({ skills: ["be1"], skillPoints: 0 }) }) });
    renderScene();
    await userEvent.click(node("be1"));
    await screen.findByText(/ENDPOINT desbloqueada/);
    const fx = node("be1").querySelector('[data-fx="sparkle"]') as HTMLElement;
    expect(fx).not.toBeNull();
    expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/sparkle.png)");
    expect(document.querySelectorAll('[data-fx="sparkle"]')).toHaveLength(1);
  });

  it("sparkle never on a 409", async () => {
    mockFetch({ "POST /api/me/skills/be1/unlock": json(409, { error: { code: "no_skill_points", message: "sem pontos" } }) });
    renderScene();
    await userEvent.click(node("be1"));
    await screen.findByText(/sem pontos/);
    expect(document.querySelector('[data-fx="sparkle"]')).toBeNull();
  });
});
