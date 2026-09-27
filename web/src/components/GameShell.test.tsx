import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameShell } from "./GameShell";
import { WorldScene } from "./WorldScene";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => router }));

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
    const card = await screen.findByRole("button", { name: "FLORESTA DE LOGS" });
    await userEvent.click(card);
    fireEvent.transitionEnd(document.querySelector(".map-hero")!, { propertyName: "left" });
    await userEvent.click(within(screen.getByRole("dialog", { name: "FLORESTA DE LOGS" })).getByRole("button", { name: "ENTRAR" }));
    const hud = screen.getByRole("banner", { name: "HUD" });
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
    expect(within(screen.getByRole("banner", { name: "HUD" })).getByText("NEO")).toBeInTheDocument();
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

  it("places the HUD above the scene", async () => {
    mockFetch({
      "GET /api/me": json(200, { player: player() }),
      "GET /api/catalog": json(200, CATALOG),
    });
    render(<GameShell><p className="scene">cena</p></GameShell>);
    await screen.findByText("cena");
    const topbar = document.querySelector(".page > .topbar")!;
    expect(topbar.children).toHaveLength(1);
    expect(topbar.children[0]).toHaveClass("hud");
    expect(topbar.children[0]).toHaveAttribute("aria-label", "HUD");
    const frame = document.querySelector(".page > .frame")!;
    expect(frame.querySelector(".hud")).toBeNull();
    expect(frame.children[0]).toHaveTextContent("cena");
  });

  it("has no scene hotbar and no MENU button; TÍTULO is a HUD link", async () => {
    mockFetch({
      "GET /api/me": json(200, { player: player() }),
      "GET /api/catalog": json(200, CATALOG),
    });
    render(<GameShell><p>cena</p></GameShell>);
    await screen.findByText("cena");
    expect(screen.queryByRole("navigation", { name: "Cenas" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^MENU/ })).toBeNull();
    const title = screen.getByRole("link", { name: "TÍTULO" });
    expect(title.closest("header")).toBe(screen.getByRole("banner", { name: "HUD" }));
    expect(title.getAttribute("href")).toBe("/");
  });

  it("number keys still switch scenes inside the shell", async () => {
    router.push.mockClear();
    mockFetch({
      "GET /api/me": json(200, { player: player() }),
      "GET /api/catalog": json(200, CATALOG),
    });
    render(<GameShell><p>cena</p></GameShell>);
    await screen.findByText("cena");
    await userEvent.keyboard("1");
    expect(router.push).toHaveBeenCalledWith("/");
  });

});

describe("GameShell assets", () => {
  it("no logo header above the tabs", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/me": json(200, { player: player() }) });
    render(<GameShell><p>cena</p></GameShell>);
    await screen.findByText("cena");
    expect(document.querySelector("header.logo")).toBeNull();
    expect(screen.queryByRole("img", { name: "DevServer" })).toBeNull();
  });
});

function expectLoadingFx(text: HTMLElement) {
  const fx = text.querySelector("span.fx-loading") as HTMLElement;
  expect(fx).not.toBeNull();
  expect(fx.getAttribute("aria-hidden")).toBe("true");
  expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/loading.png)");
}

describe("GameShell loading", () => {
  // assets C30
  it("loading fx", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<GameShell><p>cena</p></GameShell>);
    expectLoadingFx(screen.getByText("CARREGANDO..."));
  });
});
