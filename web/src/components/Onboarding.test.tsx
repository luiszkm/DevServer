import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { json, mockFetch } from "@/test/helpers";
import { Onboarding } from "./Onboarding";

describe("Onboarding", () => {
  // C19
  it("dev_name_taken shows NOME JÁ EM USO", async () => {
    mockFetch({
      "GET /api/onboarding": json(200, { suggestedDevName: "DEV_01", classes: ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"] }),
      "POST /api/players": json(409, { error: { code: "dev_name_taken", message: "nome já em uso" } }),
    });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
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
    mockFetch({ "GET /api/onboarding": json(500, { error: { code: "internal", message: "erro interno" } }) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("erro interno")).toBeInTheDocument();
  });

  it("shows the api message for any other create error and keeps the form", async () => {
    mockFetch({
      "GET /api/onboarding": ONB,
      "POST /api/players": json(422, { error: { code: "invalid_dev_name", message: "nome inválido" } }),
    });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "FRONTEND" }));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("nome inválido")).toBeInTheDocument();
    expect(screen.queryByText("NOME JÁ EM USO")).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("keeps CRIAR DEV disabled until a class is chosen", async () => {
    mockFetch({ "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "CRIAR DEV" })).toBeDisabled();
  });

  it("hands the created player to onCreated with the typed name and class", async () => {
    const created = { devName: "NEO", class: "DEVOPS" };
    const f = mockFetch({ "GET /api/onboarding": ONB, "POST /api/players": json(201, { player: created }) });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    const input = await screen.findByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "neo");
    await userEvent.click(screen.getByRole("button", { name: "DEVOPS" }));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const body = JSON.parse(f.fn.mock.calls.find(([u]) => String(u) === "/api/players")![1]!.body as string);
    expect(body).toEqual({ devName: "NEO", class: "DEVOPS" });
  });

  it("shows CARREGANDO... while onboarding data loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<Onboarding onCreated={vi.fn()} />);
    expect(screen.getByText("CARREGANDO...")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows SERVIDOR FORA DO AR when onboarding data hits a network error", async () => {
    mockFetch({ "GET /api/onboarding": () => Promise.reject(new TypeError("Failed to fetch")) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.queryByText("CARREGANDO...")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when a load error has no body", async () => {
    mockFetch({ "GET /api/onboarding": new Response(null, { status: 502 }) });
    render(<Onboarding onCreated={vi.fn()} />);
    expect(await screen.findByText("erro ao carregar")).toBeInTheDocument();
  });

  it("shows SERVIDOR FORA DO AR when create hits a network error and allows retry", async () => {
    mockFetch({ "GET /api/onboarding": ONB, "POST /api/players": () => Promise.reject(new TypeError("Failed to fetch")) });
    const onCreated = vi.fn();
    render(<Onboarding onCreated={onCreated} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("SERVIDOR FORA DO AR")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CRIAR DEV" })).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when a create error has no body", async () => {
    mockFetch({ "GET /api/onboarding": ONB, "POST /api/players": new Response(null, { status: 502 }) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    await userEvent.click(screen.getByRole("button", { name: "CRIAR DEV" }));
    expect(await screen.findByText("erro ao criar dev")).toBeInTheDocument();
  });

  it("disables CRIAR DEV while the create request is in flight", async () => {
    mockFetch({ "GET /api/onboarding": ONB, "POST /api/players": () => new Promise<Response>(() => {}) });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "BACKEND" }));
    const submit = screen.getByRole("button", { name: "CRIAR DEV" });
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(submit).toBeDisabled();
  });

  it("marks only the chosen class as pressed", async () => {
    mockFetch({ "GET /api/onboarding": ONB });
    render(<Onboarding onCreated={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "DEVOPS" }));
    await userEvent.click(screen.getByRole("button", { name: "FRONTEND" }));
    for (const c of ["FRONTEND", "BACKEND", "DEVOPS", "FULLSTACK"]) {
      expect(screen.getByRole("button", { name: c })).toHaveAttribute("aria-pressed", String(c === "FRONTEND"));
    }
  });
});
