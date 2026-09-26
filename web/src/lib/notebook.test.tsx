import { describe, expect, it } from "vitest";
import { CATALOG, player } from "@/test/helpers";
import { notebookBonus } from "./notebook";

describe("notebookBonus", () => {
  it("notebookBonus mirrors the api", () => {
    const ups = { cpu_turbo: 2, bateria: 0, ssd_nvme: 0, rede_5g: 0 };
    expect(notebookBonus(CATALOG, player({ notebook: { level: 4, rarity: "raro", upgrades: ups } }), "dmg")).toBe(7);
    expect(notebookBonus(CATALOG, player({ notebook: { level: 12, rarity: "lendario", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0 } } }), "dmg")).toBe(10);
    expect(notebookBonus(CATALOG, player({ notebook: { level: 1, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 5, ssd_nvme: 0, rede_5g: 0 } } }), "hp")).toBe(30);
    expect(notebookBonus(CATALOG, player({ notebook: { level: 1, rarity: "basico", upgrades: { cpu_turbo: 0, bateria: 0, ssd_nvme: 0, rede_5g: 0, sumiu: 2 } } }), "dmg")).toBe(0);
  });
});
