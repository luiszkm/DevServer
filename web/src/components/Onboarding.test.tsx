import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CATALOG, json, mockFetch } from "@/test/helpers";
import { Onboarding } from "./Onboarding";

const bodyButton = (id: string) => document.querySelector(`[data-body="${id}"]`) as HTMLButtonElement;

describe("Onboarding", () => {
  // C19
  it("dev_name_taken shows NOME JÁ EM USO", async () => {
    mockFetch({
      "GET /api/catalog": json(200, CATALOG),
      "GET /api/onboarding": json(200, { suggestedDevName: "DEV_01", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] }),
      "POST /api/players": json(409, { error: { code: "dev_name_taken", message: "nome já em uso" } }),
    });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    const message = await screen.findByText("NOME JÁ EM USO");
    const input = screen.getByRole("textbox");
    const field = input.closest("label");
    expect(field).not.toBeNull();
    expect(field).toContainElement(message);
    expect(input.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe("Onboarding other outcomes", () => {
  const ONB = json(200, { suggestedDevName: "DEV_01", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] });

  it("shows the api message when onboarding data fails to load", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": json(500, { error: { code: "internal", message: "erro interno" } }) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("erro interno")).toBeInTheDocument();
  });

  it("shows the api message for any other create error and keeps the form", async () => {
    mockFetch({
      "GET /api/catalog": json(200, CATALOG),
      "GET /api/onboarding": ONB,
      "POST /api/players": json(422, { error: { code: "invalid_dev_name", message: "nome inválido" } }),
    });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "FRONTEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("nome inválido")).toBeInTheDocument();
    expect(screen.queryByText("NOME JÁ EM USO")).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("keeps CRIAR DEV disabled until a class is chosen", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "CRIAR DEV" })).toBeDisabled();
  });

  it("hands the created player to onCreated with the typed name and class", async () => {
    const created = { devName: "NEO", class: "DEVOPS" };
    const f = mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB, "POST /api/players": json(201, { player: created }) });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    const input = await screen.findByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "neo");
    await userEvent.click(screen.getByRole("button", { name: "DEVOPS" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const body = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(body).toEqual({ devName: "NEO", class: "DEVOPS", body: "masculino" });
  });

  it("shows CARREGANDO... while onboarding data loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<Onboarding onCreated={vi.fn()} />);
    expect(screen.getByText("CARREGANDO...")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows SERVIDOR FORA DO AR when onboarding data hits a network error", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": () => Promise.reject(new TypeError("Failed to fetch")) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.queryByText("CARREGANDO...")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when a load error has no body", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": new Response(null, { status: 502 }) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("erro ao carregar")).toBeInTheDocument();
  });

  it("shows SERVIDOR FORA DO AR when create hits a network error and allows retry", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB, "POST /api/players": () => Promise.reject(new TypeError("Failed to fetch")) });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when a create error has no body", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB, "POST /api/players": new Response(null, { status: 502 }) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("erro ao criar dev")).toBeInTheDocument();
  });

  it("disables CRIAR DEV while the create request is in flight", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB, "POST /api/players": () => new Promise<Response>(() => {}) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    const submit = screen.getByRole("button", { name: "CRIAR DEV" });
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(submit).toBeDisabled();
  });

  it("marks only the chosen class as pressed", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "DEVOPS" }));
    await userEvent.click(screen.getByRole("button", { name: "FRONTEND" }));
    for (const c of ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"]) {
      expect(screen.getByRole("button", { name: c })).toHaveAttribute("aria-pressed", String(c === "FRONTEND"));
    }
  });
});

describe("Onboarding body", () => {
  const ONB = json(200, { suggestedDevName: "DEV_01", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] });

  it("offers every catalog body with its default look, and needs one picked", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeDisabled();
    const ids = [...document.querySelectorAll<HTMLElement>("[data-body]")].map((b) => b.dataset.body);
    expect(ids).toEqual(CATALOG.avatar.bodies.map((b) => b.id));
    for (const b of CATALOG.avatar.bodies) {
      const look = bodyButton(b.id).querySelector("canvas")!.dataset.look!;
      expect(look).toContain(b.id === "feminino" ? "/art/sprite/hero/body-f.png" : "/art/sprite/hero/body.png");
      expect(bodyButton(b.id)).toHaveTextContent(b.name);
    }
    await userEvent.click(bodyButton("feminino"));
    expect(bodyButton("feminino")).toHaveAttribute("aria-pressed", "true");
    expect(bodyButton("masculino")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeEnabled();
  });

  it("sends the chosen body", async () => {
    const f = mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": ONB, "POST /api/players": json(201, { player: {} }) });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "FRONTEND" }));
    await userEvent.click(bodyButton("feminino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalled());
    const sent = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(sent.body).toBe("feminino");
  });

  it("catalog failure shows the load error", async () => {
    mockFetch({ "GET /api/catalog": json(500, { error: { code: "internal", message: "x" } }), "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("erro ao carregar")).toBeInTheDocument();
  });
});

function expectLoadingFx(text: HTMLElement) {
  const fx = text.querySelector("span.fx-loading") as HTMLElement;
  expect(fx).not.toBeNull();
  expect(fx.getAttribute("aria-hidden")).toBe("true");
  expect(fx.style.backgroundImage.replace(/"/g, "")).toBe("url(/art/fx/loading.png)");
}

const LOOK_ONB = json(200, { suggestedDevName: "DEV_01", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] });

function partIds() {
  return [...document.querySelectorAll<HTMLElement>("[data-part]")].map((el) => el.dataset.part);
}

function previewLook() {
  return document.querySelector<HTMLElement>(".onboarding-hero")!.dataset.look!;
}

describe("Onboarding look", () => {
  it("hides parts until a body is chosen", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await screen.findByText("MASCULINO");
    expect(partIds()).toEqual([]);
    expect([...document.querySelectorAll<HTMLElement>("[data-body]")].map((el) => el.dataset.body)).toEqual(
      CATALOG.avatar.bodies.map((b) => b.id),
    );
  });

  it("lists free masculino parts", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await screen.findByText("MASCULINO");
    await userEvent.click(bodyButton("masculino"));
    expect(partIds()).toEqual(["tone", "eyes", "hair", "hairColor", "beard", "glasses", "top", "topColor", "bottomColor", "laptop"]);
    const hidden: [string, string][] = [
      ["hair", "hair_moicano"],
      ["hairColor", "hair_azul"],
      ["top", "top_jaqueta"],
      ["top", "top_hoodie_trace"],
      ["top", "top_moletom_gear"],
      ["glasses", "glasses_cyber"],
      ["laptop", "laptop_gamer"],
      ["laptop", "laptop_raro"],
    ];
    for (const [part, option] of hidden) {
      await userEvent.click(document.querySelector(`[data-part="${part}"]`)!);
      expect(document.querySelector(`[data-option="${option}"]`)).toBeNull();
    }
  });

  it("feminino has no beard", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await screen.findByText("FEMININO");
    await userEvent.click(bodyButton("feminino"));
    expect(screen.queryByRole("button", { name: "BARBA" })).not.toBeInTheDocument();
  });

  it("preview wears the picked option", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await screen.findByText("MASCULINO");
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CLARA" }));
    expect(screen.getByRole("button", { name: "CLARA" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "PADRÃO" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "ROUPA" }));
    await userEvent.click(screen.getByRole("button", { name: "CAMISETA" }));
    expect(previewLook()).toContain("#b07858");
    expect(previewLook()).toContain("top-camiseta");
  });

  it("switching body keeps wearable picks", async () => {
    const f = mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB, "POST /api/players": json(201, { player: {} }) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CLARA" }));
    await userEvent.click(screen.getByRole("button", { name: "BARBA" }));
    await userEvent.click(screen.getByRole("button", { name: "BIGODE" }));
    expect(previewLook()).toContain("#b07858");
    expect(previewLook()).toContain("beard-bigode");
    await userEvent.click(bodyButton("feminino"));
    expect(screen.queryByRole("button", { name: "BARBA" })).not.toBeInTheDocument();
    expect(previewLook()).toContain("#b07858");
    expect(previewLook()).not.toContain("beard-bigode");
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(f.fn).toHaveBeenCalled());
    const sent = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(sent.appearance).toEqual({ tone: "tone_clara" });
    expect(sent.appearance.beard).toBeUndefined();
  });

  it("CRIAR DEV needs class and body only", async () => {
    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    const { unmount } = render(<Onboarding onCreated={vi.fn()} />);
    const submit = await screen.findByRole("button", { name: "CRIAR DEV" });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "BACKEND" }));
    expect(submit).toBeDisabled();
    unmount();

    mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await screen.findByText("MASCULINO");
    await userEvent.click(bodyButton("masculino"));
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "BACKEND" }));
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeEnabled();
  });

  it("create without picks omits appearance", async () => {
    const f = mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB, "POST /api/players": json(201, { player: {} }) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(f.fn).toHaveBeenCalled());
    const sent = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(sent).toEqual({ devName: "DEV_01", class: "BACKEND", body: "masculino" });
    expect(sent).not.toHaveProperty("appearance");
  });

  it("create sends touched parts only", async () => {
    const f = mockFetch({ "GET /api/catalog": json(200, CATALOG), "GET /api/onboarding": LOOK_ONB, "POST /api/players": json(201, { player: {} }) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(bodyButton("masculino"));
    await userEvent.click(screen.getByRole("button", { name: "CLARA" }));
    await userEvent.click(screen.getByRole("button", { name: "ROUPA" }));
    await userEvent.click(screen.getByRole("button", { name: "CAMISETA" }));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(f.fn).toHaveBeenCalled());
    const sent = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(sent.appearance).toEqual({ tone: "tone_clara", top: "top_camiseta" });
  });
});

describe("Onboarding loading", () => {
  // assets C30
  it("loading fx", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<Onboarding onCreated={vi.fn()} />);
    expectLoadingFx(screen.getByText("CARREGANDO..."));
  });
});
