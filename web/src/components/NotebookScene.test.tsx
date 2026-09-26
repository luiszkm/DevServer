import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import NotebookPage from "@/app/(game)/notebook/page";
import { CONNECTION_FAILED } from "@/lib/gear";
import type { Player } from "@/lib/types";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";

function renderNotebook(initial: Player = player()) {
  const setPlayer = vi.fn();
  function Host() {
    const [p, setP] = useState(initial);
    return (
      <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer: (next) => { setPlayer(next); setP(next); } }}>
        <NotebookPage />
      </GameContext.Provider>
    );
  }
  render(<Host />);
  return { setPlayer };
}

const armed = (overrides: Partial<Player> = {}) =>
  player({
    coins: 5000,
    notebook: {
      level: 4,
      rarity: "raro",
      upgrades: { cpu_turbo: 1, bateria: 2, ssd_nvme: 0, rede_5g: 1 },
    },
    ...overrides,
  });

function buttons() {
  return screen.queryAllByRole("button");
}

describe("NotebookScene", () => {
  it("shows the notebook at its level", () => {
    renderNotebook(armed());
    const img = document.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/art/sprite/notebook-raro.png");
    expect(screen.getByText("NOTEBOOK RARO")).toBeInTheDocument();
    expect(screen.getByText("NÍVEL 4/10")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("4");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
    const lines = [...document.querySelectorAll(".notebook-stats li")].map((li) => li.textContent);
    expect(lines).toEqual(["PODER +5%", "VIDA +35", "SP +0", "REGEN SP +1"]);
  });

  it("APRIMORAR sends the intent and renders the answer", async () => {
    const next = armed({ notebook: { level: 4, rarity: "raro", upgrades: { cpu_turbo: 1, bateria: 2, ssd_nvme: 0, rede_5g: 1 } } });
    const { setPlayer } = renderNotebook(player({ coins: 250, notebook: { level: 3, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }));
    const fetch = mockFetch({ "POST /api/me/notebook/enhance": json(200, { player: next }) });
    fireEvent.click(screen.getByRole("button", { name: "APRIMORAR · 250c" }));
    expect(await screen.findByText("NOTEBOOK RARO")).toBeInTheDocument();
    expect(fetch.calls("POST /api/me/notebook/enhance")).toBe(1);
    const init = fetch.fn.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(setPlayer).toHaveBeenCalledWith(next);
  });

  it("buttons wait for the pending answer", async () => {
    let release: (r: Response) => void = () => {};
    const hung = new Promise<Response>((res) => { release = res; });
    const fetch = mockFetch({ "POST /api/me/notebook/enhance": () => hung });
    renderNotebook(player({ coins: 250, notebook: { level: 3, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }));
    const button = screen.getByRole("button", { name: "APRIMORAR · 250c" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    for (const b of buttons()) expect(b).toBeDisabled();
    fireEvent.click(button);
    expect(fetch.calls("POST /api/me/notebook/enhance")).toBe(1);
    release(json(200, { player: player() }));
    await screen.findByRole("button", { name: "APRIMORAR · 100c" });
  });

  it("max level has no APRIMORAR", () => {
    renderNotebook(player({ notebook: { level: 10, rarity: "lendario", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }));
    expect(screen.getByText("NÍVEL MÁXIMO")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /APRIMORAR/ })).not.toBeInTheDocument();
  });

  it("APRIMORAR needs the coins", () => {
    const notebook = { level: 3, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } };
    const { rerender } = render(
      <GameContext.Provider value={{ player: player({ coins: 249, notebook }), catalog: CATALOG, setPlayer: vi.fn() }}>
        <NotebookPage />
      </GameContext.Provider>,
    );
    expect(within(document.querySelector(".notebook-panel") as HTMLElement).getByRole("button", { name: "COINS INSUFICIENTES" })).toBeDisabled();
    rerender(
      <GameContext.Provider value={{ player: player({ coins: 250, notebook }), catalog: CATALOG, setPlayer: vi.fn() }}>
        <NotebookPage />
      </GameContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "APRIMORAR · 250c" })).toBeEnabled();
  });

  it("errors show the api message", async () => {
    const p = player({ coins: 250, notebook: { level: 3, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } });
    const { setPlayer } = renderNotebook(p);
    mockFetch({ "POST /api/me/notebook/enhance": json(409, { error: { code: "notebook_max_level", message: "o notebook já está no nível máximo" } }) });
    fireEvent.click(screen.getByRole("button", { name: "APRIMORAR · 250c" }));
    expect(await screen.findByRole("status")).toHaveTextContent("o notebook já está no nível máximo");
    expect(setPlayer).not.toHaveBeenCalled();
    expect(screen.getByText("NÍVEL 3/10")).toBeInTheDocument();

    mockFetch({ "POST /api/me/notebook/enhance": () => Promise.reject(new Error("offline")) });
    fireEvent.click(screen.getByRole("button", { name: "APRIMORAR · 250c" }));
    expect(await screen.findByRole("status")).toHaveTextContent(CONNECTION_FAILED);
  });

  it("upgrade cards follow the catalog", () => {
    renderNotebook(player({
      coins: 5000,
      notebook: { level: 7, rarity: "epico", upgrades: { cpu_turbo: 1, bateria: 0, ssd_nvme: 2, rede_5g: 1 } },
    }));
    const cards = [...document.querySelectorAll(".notebook-card")];
    expect(cards.map((c) => c.querySelector(".pixel")?.textContent)).toEqual(["CPU TURBO", "BATERIA ESTENDIDA", "SSD NVME", "CONECTIVIDADE 5G"]);
    expect(cards.map((c) => c.querySelector("img")?.getAttribute("src"))).toEqual([
      "/art/icon/nbup-cpu_turbo.png", "/art/icon/nbup-bateria.png", "/art/icon/nbup-ssd_nvme.png", "/art/icon/nbup-rede_5g.png",
    ]);
    const text = cards.map((c) => c.textContent);
    expect(text[0]).toContain(CATALOG.notebook.upgrades[0].description);
    expect(text[0]).toContain("NV 1/3");
    expect(text[0]).toContain("+2% → +4% DANO");
    expect(text[1]).toContain("+0 → +10 HP");
    expect(text[2]).toContain("+10 → +15 SP");
    expect(text[3]).toContain("+1 → +2 REGEN SP");
    expect(within(cards[0] as HTMLElement).getByRole("button")).toHaveTextContent("UPGRADE · 500c");
    expect(within(cards[1] as HTMLElement).getByRole("button")).toHaveTextContent("UPGRADE · 250c");
    expect(within(cards[2] as HTMLElement).getByRole("button")).toHaveTextContent("UPGRADE · 700c");
    expect(within(cards[3] as HTMLElement).getByRole("button")).toHaveTextContent("UPGRADE · 350c");
  });

  it("maxed upgrade has no button", () => {
    renderNotebook(player({ notebook: { level: 10, rarity: "lendario", upgrades: { cpu_turbo: 3, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }));
    const card = document.querySelector(".notebook-card")!;
    expect(card.textContent).toContain("NV 3/3");
    expect(card.textContent).toContain("NV MÁX.");
    expect(within(card as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("locked upgrade names the level it needs", () => {
    const upgrades = { cpu_turbo: 1, bateria: 0, ssd_nvme: 0, rede_5g: 0 };
    const { rerender } = render(
      <GameContext.Provider value={{ player: player({ coins: 0, notebook: { level: 3, rarity: "basico", upgrades } }), catalog: CATALOG, setPlayer: vi.fn() }}>
        <NotebookPage />
      </GameContext.Provider>,
    );
    const locked = screen.getByRole("button", { name: "REQUER NOTEBOOK NV 4" });
    expect(locked).toBeDisabled();
    rerender(
      <GameContext.Provider value={{ player: player({ coins: 499, notebook: { level: 4, rarity: "raro", upgrades } }), catalog: CATALOG, setPlayer: vi.fn() }}>
        <NotebookPage />
      </GameContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "COINS INSUFICIENTES" })).toBeDisabled();
    rerender(
      <GameContext.Provider value={{ player: player({ coins: 500, notebook: { level: 4, rarity: "raro", upgrades } }), catalog: CATALOG, setPlayer: vi.fn() }}>
        <NotebookPage />
      </GameContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "UPGRADE · 500c" })).toBeEnabled();
  });

  it("upgrade sends the intent", async () => {
    const start = player({
      coins: 500,
      notebook: { level: 4, rarity: "raro", upgrades: { cpu_turbo: 1, bateria: 0, ssd_nvme: 0, rede_5g: 0 } },
    });
    const { setPlayer } = renderNotebook(start);
    mockFetch({ "POST /api/me/notebook/upgrades/cpu_turbo": json(409, { error: { code: "notebook_level_too_low", message: "aprimore o notebook para liberar este nível" } }) });
    fireEvent.click(screen.getByRole("button", { name: "UPGRADE · 500c" }));
    expect(await screen.findByRole("status")).toHaveTextContent("aprimore o notebook para liberar este nível");
    expect(setPlayer).not.toHaveBeenCalled();

    const next = player({ notebook: { level: 4, rarity: "raro", upgrades: { cpu_turbo: 2, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } });
    const fetch = mockFetch({ "POST /api/me/notebook/upgrades/cpu_turbo": json(200, { player: next }) });
    fireEvent.click(screen.getByRole("button", { name: "UPGRADE · 500c" }));
    expect(await screen.findByText("NV 2/3")).toBeInTheDocument();
    expect(fetch.calls("POST /api/me/notebook/upgrades/cpu_turbo")).toBe(1);
    expect((fetch.fn.mock.calls[0][1] as RequestInit).body).toBeUndefined();
    expect(setPlayer).toHaveBeenCalledWith(next);
  });
});
