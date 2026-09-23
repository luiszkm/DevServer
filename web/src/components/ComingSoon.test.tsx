import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BugFightPage from "@/app/(game)/bug-fight/page";
import SkillsPage from "@/app/(game)/skills/page";
import ShopPage from "@/app/(game)/loja/page";
import AvatarPage from "@/app/(game)/avatar/page";

describe("ComingSoon", () => {
  // C28
  it.each([
    ["/bug-fight", BugFightPage, "BUG FIGHT"],
    ["/skills", SkillsPage, "SKILLS"],
    ["/loja", ShopPage, "LOJA"],
    ["/avatar", AvatarPage, "AVATAR"],
  ])("every unshipped scene shows EM BREVE (%s)", (_route, Page, name) => {
    render(<Page />);
    expect(screen.getByText("EM BREVE")).toBeInTheDocument();
    expect(screen.getByText(name)).toBeInTheDocument();
  });
});
