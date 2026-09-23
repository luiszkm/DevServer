import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameShell } from "./GameShell";
import { WorldScene } from "./WorldScene";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("GameShell", () => {
  // C1
  it("401 shows login screen", async () => {
    mockFetch({ "GET /api/me": json(401, { error: { code: "unauthenticated", message: "x" } }) });
    render(<GameShell><p>cena secreta</p></GameShell>);
    const btn = await screen.findByRole("link", { name: "ENTRAR COM GITHUB" });
    expect(btn).toHaveAttribute("href", "/api/auth/github/login");
    expect(screen.queryByText("cena secreta")).not.toBeInTheDocument();
  });

  // C13
  it("404 opens onboarding with suggestion", async () => {
    mockFetch({
      "GET /api/me": json(404, { error: { code: "player_not_found", message: "x" } }),
      "GET /api/onboarding": json(200, {
        suggestedDevName: "OCTOCAT",
        classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"],
      }),
    });
    render(<GameShell><p>cena</p></GameShell>);
    expect(await screen.findByRole("textbox")).toHaveValue("OCTOCAT");
    for (const c of ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"]) {
      expect(screen.getByRole("button", { name: c })).toBeEnabled();
    }
  });

  // C25
  it.each([
    ["500", () => json(500, { error: { code: "internal", message: "x" } })],
    ["network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("server down shows retry (%s)", async (_name, failure) => {
    const f = mockFetch({ "GET /api/me": failure as () => Response });
    render(<GameShell><p>cena</p></GameShell>);
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "TENTAR DE NOVO" }));
    await screen.findByText("SERVIDOR FORA DO AR");
    expect(f.calls("GET /api/me")).toBe(2);
  });

  // C30
  it("mutation response updates HUD without refetch", async () => {
    const f = mockFetch({
      "GET /api/me": json(200, { player: player({ coins: 100 }) }),
      "GET /api/catalog": json(200, CATALOG),
      "POST /api/me/travel": json(200, { player: player({ coins: 999, region: "floresta" }) }),
    });
    render(<GameShell><WorldScene /></GameShell>);
    const card = await screen.findByRole("article", { name: "FLORESTA DE LOGS" });
    await userEvent.click(within(card).getByRole("button", { name: "VIAJAR ATÉ AQUI" }));
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    expect(await within(hud).findByText("999")).toBeInTheDocument();
    expect(f.calls("GET /api/me")).toBe(1);
  });
});
