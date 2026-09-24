import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TitlePage from "@/app/(game)/page";
import WorldPage from "@/app/(game)/mundo/page";
import DeployPage from "@/app/(game)/deploy/page";
import BugFightPage from "@/app/(game)/bug-fight/page";
import SkillsPage from "@/app/(game)/skills/page";
import ShopPage from "@/app/(game)/loja/page";
import AvatarPage from "@/app/(game)/avatar/page";
import OfficePage from "@/app/(game)/office/page";
import { CATALOG, json, mockFetch, player } from "@/test/helpers";
import { GameContext } from "./GameContext";

// Foundation C28 listed the scenes still showing EM BREVE; with LOJA and AVATAR shipped that set is empty.
describe("ComingSoon", () => {
  // C46 (shop), C41 (office)
  it.each([
    ["/", TitlePage],
    ["/mundo", WorldPage],
    ["/deploy", DeployPage],
    ["/bug-fight", BugFightPage],
    ["/skills", SkillsPage],
    ["/loja", ShopPage],
    ["/avatar", AvatarPage],
    ["/office", OfficePage],
  ])("no scene shows EM BREVE (%s)", async (_route, Page) => {
    mockFetch({
      "GET /api/me/deploys": json(200, { serverTime: "2026-01-01T12:00:00Z", deploys: [] }),
      "POST /api/me/battle": json(200, {
        battle: { region: "vila", enemyHp: 60, enemyHpMax: 60, sp: 50, spMax: 50, weakness: false, status: "active" },
        player: player(),
      }),
    });
    const { container } = render(
      <GameContext.Provider value={{ player: player(), catalog: CATALOG, setPlayer: vi.fn() }}>
        <Page />
      </GameContext.Provider>,
    );
    // Let scenes that load on mount settle before reading the screen.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector("section, main, div")).not.toBeNull();
    expect(screen.queryByText("EM BREVE")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("EM BREVE");
  });
});
