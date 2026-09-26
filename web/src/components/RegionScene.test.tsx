import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Player } from "@/lib/types";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";
import { RegionScene } from "./RegionScene";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const motion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)", media: q }));

function renderRegion(regionId: string, p: Player = player({ region: regionId })) {
  return render(
    <GameContext.Provider value={{ player: p, catalog: CATALOG, setPlayer: vi.fn() }}>
      <RegionScene regionId={regionId} />
    </GameContext.Provider>,
  );
}

const node = (id: string) => document.querySelector(`[data-node="${id}"]`) as HTMLElement;
const button = (id: string) => node(id) as HTMLButtonElement;

describe("RegionScene", () => {
  it("opens the first node when progress is missing", () => {
    const bare = player({ region: "mercado" });
    delete (bare as { progress?: Player["progress"] }).progress;
    renderRegion("mercado", bare);
    expect(button("mercado-1")).toBeEnabled();
    for (const id of ["mercado-2", "mercado-3", "mercado-4", "mercado-5"]) expect(button(id)).toBeDisabled();
  });

  it("region map opens the first node", () => {
    renderRegion("floresta");
    const map = document.querySelector(".region-map") as HTMLElement;
    expect(map.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/background/region-floresta.png)");
    expect(document.querySelectorAll("[data-node]")).toHaveLength(5);
    expect(button("floresta-1")).toBeEnabled();
    for (const id of ["floresta-2", "floresta-3", "floresta-4", "floresta-5"]) expect(button(id)).toBeDisabled();
    expect(node("floresta-5").querySelector('img[src="/art/icon/ic-crown.png"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: "VOLTAR AO MUNDO" })).toHaveAttribute("href", "/mundo");
  });

  it("cleared nodes wear the flag", () => {
    renderRegion("floresta", player({ region: "floresta", progress: { floresta: 2 } }));
    for (const id of ["floresta-1", "floresta-2"]) {
      expect(button(id)).toBeDisabled();
      expect(node(id).querySelector('img[src="/art/sprite/build-flag.png"]')).not.toBeNull();
    }
    expect(button("floresta-3")).toBeEnabled();
    expect(button("floresta-4")).toBeDisabled();
    expect(button("floresta-5")).toBeDisabled();
    expect(document.querySelector(".region-hero")).toHaveAttribute("data-at", "floresta-2");
  });

  it("clicking the next node starts it", async () => {
    push.mockClear();
    motion(false);
    const setPlayer = vi.fn();
    const fetchMock = mockFetch({
      "POST /api/me/battle": json(200, { battle: { enemy: "slime_verde", region: "floresta", node: "floresta-1" }, player: player({ region: "floresta" }) }),
    });
    render(
      <GameContext.Provider value={{ player: player({ region: "floresta" }), catalog: CATALOG, setPlayer }}>
        <RegionScene regionId="floresta" />
      </GameContext.Provider>,
    );
    await userEvent.click(button("floresta-1"));
    fireEvent.transitionEnd(document.querySelector(".region-hero")!, { propertyName: "left" });
    await waitFor(() => expect(fetchMock.calls("POST /api/me/battle")).toBe(1));
    const body = fetchMock.fn.mock.calls.find((c) => String(c[0]) === "/api/me/battle")?.[1]?.body;
    expect(JSON.parse(String(body))).toEqual({ node: "floresta-1" });
    expect(push).toHaveBeenCalledWith("/bug-fight");
    expect(setPlayer).toHaveBeenCalled();
  });

  it("other region is locked", () => {
    renderRegion("floresta", player({ region: "vila" }));
    expect(screen.getByText("você não está nesta região")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VOLTAR AO MUNDO" })).toHaveAttribute("href", "/mundo");
    for (const id of ["floresta-1", "floresta-2", "floresta-3", "floresta-4", "floresta-5"]) expect(button(id)).toBeDisabled();
  });

  it("unknown region", () => {
    renderRegion("nao-existe");
    expect(screen.getByText("região desconhecida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VOLTAR AO MUNDO" })).toHaveAttribute("href", "/mundo");
  });

  it("reduced motion starts without the walk", async () => {
    push.mockClear();
    motion(true);
    mockFetch({
      "POST /api/me/battle": json(200, { player: player({ region: "floresta" }) }),
    });
    renderRegion("floresta");
    await userEvent.click(button("floresta-1"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bug-fight"));
  });

  it("a locked node shows the api message", async () => {
    push.mockClear();
    motion(true);
    mockFetch({
      "POST /api/me/battle": json(409, { error: { code: "node_locked", message: "o nó ainda está trancado" } }),
    });
    renderRegion("floresta");
    await userEvent.click(button("floresta-1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("o nó ainda está trancado");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows SERVIDOR FORA DO AR when the fight does not answer", async () => {
    motion(true);
    mockFetch({ "POST /api/me/battle": () => Promise.reject(new TypeError("Failed to fetch")) });
    renderRegion("floresta");
    await userEvent.click(button("floresta-1"));
    expect(await screen.findByRole("alert")).toHaveTextContent("SERVIDOR FORA DO AR");
  });
});
