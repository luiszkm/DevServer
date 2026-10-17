// @vitest-environment node
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "../../cast/manifest.json";
import sheets from "../../cast/sheets.json";
import { CAST_ENEMY, CAST_FX, castBattlePose, castById, castHeroId, castMapPose } from "./cast";

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
    for (const id of Object.values(CAST_ENEMY)) expect(castById(id).frames).toBe(4);
    expect(castById("fx-fire").frames).toBe(4);
    expect(castById("fx-teleport").frames).toBe(4);
    expect(castById(CAST_FX.data!).frames).toBe(4);
    expect(castById(CAST_FX.ship!).id).toBe("fx-crit");
    expect(CAST_FX.scan).toBeUndefined();
  });

  it("battle pose is attack only on a strike or a cast", () => {
    expect(castBattlePose("lunge")).toBe("attack");
    expect(castBattlePose("cast")).toBe("attack");
    expect(castBattlePose("special")).toBe("attack");
    expect(castBattlePose("hit")).toBe("idle");
    expect(castBattlePose("fall")).toBe("idle");
    expect(castBattlePose("flee")).toBe("idle");
    expect(castBattlePose(undefined)).toBe("idle");
  });

  it("map pose walks only while moving", () => {
    expect(castMapPose(true)).toBe("walk");
    expect(castMapPose(false)).toBe("idle");
  });

  it("hero sheet follows the body", () => {
    expect(castHeroId("masculino", "attack")).toBe("hero-m-attack");
    expect(castHeroId("feminino", "walk")).toBe("hero-f-walk");
    expect(castHeroId("outro", "idle")).toBe("hero-m-idle");
    expect(castById(castHeroId("feminino", "idle")).frames).toBe(1);
    expect(castById(castHeroId("masculino", "attack")).frames).toBe(4);
    expect(castById(castHeroId("feminino", "interact")).frames).toBe(4);
    expect(castById(castHeroId("masculino", "run")).frames).toBe(4);
  });
});
