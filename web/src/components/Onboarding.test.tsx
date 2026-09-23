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
    expect(await screen.findByText("NOME JÁ EM USO")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
