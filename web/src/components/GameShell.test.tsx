import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameShell } from "./GameShell";
import { WorldScene } from "./WorldScene";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: () => {} }) }));

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
      "GET /api/catalog": json(200, CATALOG),
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

  it("404 with another code shows server down, not onboarding", async () => {
    mockFetch({ "GET /api/me": json(404, { error: { code: "not_found", message: "x" } }) });
    render(<GameShell><p>cena</p></GameShell>);
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
  });

  it("catalog failure shows server down", async () => {
    mockFetch({
      "GET /api/me": json(200, { player: player() }),
      "GET /api/catalog": json(500, { error: { code: "internal", message: "x" } }),
    });
    render(<GameShell><p>cena</p></GameShell>);
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.queryByText("cena")).not.toBeInTheDocument();
  });

  const onboardingRoutes = {
    "GET /api/me": json(404, { error: { code: "player_not_found", message: "x" } }),
    "GET /api/onboarding": json(200, { suggestedDevName: "NEO", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] }),
    "POST /api/players": json(201, { player: player({ devName: "NEO" }) }),
  };
  async function createDev() {
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(document.querySelector('[data-body="masculino"]') as HTMLButtonElement);
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
  }

  it("enters the game after onboarding creates the dev", async () => {
    mockFetch({ ...onboardingRoutes, "GET /api/catalog": json(200, CATALOG) });
    render(<GameShell><p>cena</p></GameShell>);
    await createDev();
    expect(await screen.findByText("cena")).toBeInTheDocument();
    expect(within(screen.getByRole("contentinfo", { name: "HUD" })).getByText("NEO")).toBeInTheDocument();
  });

  it.each([
    ["catalog 500", () => json(500, { error: { code: "internal", message: "x" } })],
    ["catalog network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("catalog failure after onboarding shows server down (%s)", async (_name, failure) => {
    // onboarding reads the catalog for the body picker; the reload after creating the dev fails
    let calls = 0;
    mockFetch({ ...onboardingRoutes, "GET /api/catalog": () => (calls++ === 0 ? json(200, CATALOG) : (failure as () => Response)()) });
    render(<GameShell><p>cena</p></GameShell>);
    await createDev();
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.queryByText("cena")).not.toBeInTheDocument();
  });

  it.each([
    ["logout 204", () => new Response(null, { status: 204 })],
    ["logout network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("SAIR returns to the login screen (%s)", async (_name, outcome) => {
    const f = mockFetch({
      "GET /api/me": json(200, { player: player() }),
      "GET /api/catalog": json(200, CATALOG),
      "POST /api/auth/logout": outcome as () => Response,
    });
    render(<GameShell><p>cena</p></GameShell>);
    await userEvent.click(await screen.findByRole("button", { name: "SAIR" }));
    expect(await screen.findByRole("link", { name: "ENTRAR COM GITHUB" })).toBeInTheDocument();
    expect(f.calls("POST /api/auth/logout")).toBe(1);
  });

  it("gives the HUD the catalog so it shows active skill glyphs", async () => {
    mockFetch({
      "GET /api/me": json(200, { player: player({ skills: ["f1"] }) }),
      "GET /api/catalog": json(200, CATALOG),
    });
    render(<GameShell><p>cena</p></GameShell>);
    await screen.findByText("cena");
    const hud = screen.getByRole("contentinfo", { name: "HUD" });
    const chip = within(within(hud).getByLabelText("habilidades ativas")).getByRole("img");
    expect(chip.getAttribute("src")).toBe("/art/icon/skill-f1.png");
    expect(chip.getAttribute("alt")).toBe("MARKUP SEMÂNTICO");
  });
});

describe("GameShell assets", () => {
  // assets C15
  it("logo", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/me": json(200, { player: player() }) });
    render(<GameShell><p>cena</p></GameShell>);
    const logo = await screen.findByRole("img", { name: "DevServer" });
    expect(logo.getAttribute("src")).toBe("/art/sprite/logo.png");
    expect(logo.getAttribute("width")).toBe("160");
    expect(logo.getAttribute("height")).toBe("64");
    expect(logo.className.split(/\s+/)).toContain("pixelated");
    expect(logo.closest("header")).not.toBeNull();
    expect(logo.closest("header")!.textContent).not.toMatch(/DEV|SERVER/);
  });
});
