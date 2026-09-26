import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  // assets C16
  it("logo", () => {
    render(<LoginScreen />);
    const h1 = screen.getByRole("heading", { level: 1, name: "DevServer" });
    const logo = h1.querySelector("img")!;
    expect(logo.getAttribute("src")).toBe("/art/sprite/logo.png");
    expect(logo.getAttribute("width")).toBe("320");
    expect(logo.getAttribute("height")).toBe("128");
    expect(h1.textContent).toBe("");
  });
});
