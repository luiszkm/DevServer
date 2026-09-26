import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REGIONS = ["vila", "floresta", "mercado", "caverna", "torre", "nuvem"];

describe("region art", () => {
  it("region art files exist", () => {
    const files = [
      ...REGIONS.map((id) => `public/art/background/region-${id}.png`),
      ...REGIONS.map((id) => `public/art/sprite/enemy-boss_${id}.png`),
    ];
    expect(files).toHaveLength(12);
    for (const file of files) expect(existsSync(file), file).toBe(true);
  });
});
