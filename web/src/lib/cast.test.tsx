// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "../../cast/manifest.json";
import sheets from "../../cast/sheets.json";
import { CAST_ENEMY, CAST_FX, castById } from "./cast";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("cast catalog", () => {
  it("every sheet id is a png on disk", () => {
    const ids = sheets.sheets.flatMap((sheet) => sheet.ids).sort();
    const items = [...manifest.items].sort((a, b) => a.id.localeCompare(b.id));
    expect(items.map((item) => item.id)).toEqual(ids);
    for (const item of items) {
      expect(item.src).toBe(`/cast/${item.id}.png`);
      expect(existsSync(`${ROOT}web/public${item.src}`), item.src).toBe(true);
      if (item.frames === 1) {
        expect(item.w).toBe(item.cellW);
        expect(item.h).toBe(item.cellH);
      } else {
        expect(item.frames).toBe(4);
        expect(item.w).toBe(item.cellW * 4);
        expect(item.h).toBe(item.cellH);
      }
    }
  });

  it("battle maps only name catalog ids", () => {
    for (const id of Object.values(CAST_ENEMY)) expect(castById(id).frames).toBe(1);
    expect(castById(CAST_FX.data!).frames).toBe(4);
    expect(castById(CAST_FX.ship!).id).toBe("fx-crit");
    expect(CAST_FX.scan).toBeUndefined();
  });
});
