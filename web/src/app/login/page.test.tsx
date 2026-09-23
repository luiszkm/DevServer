import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "./page";

const BANNER = "NÃO FOI POSSÍVEL ENTRAR · TENTE DE NOVO";

describe("LoginPage", () => {
  // C6
  it.each(["github", "state"])("shows error banner (error=%s)", async (error) => {
    render(await LoginPage({ searchParams: Promise.resolve({ error }) }));
    const banner = screen.getByText(BANNER);
    const button = screen.getByRole("link", { name: "ENTRAR COM GITHUB" });
    expect(banner.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows error banner only with an error param", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ENTRAR COM GITHUB" })).toBeInTheDocument();
  });
});
