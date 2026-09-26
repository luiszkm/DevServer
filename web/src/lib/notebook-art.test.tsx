// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const files = [
  ...["basico", "raro", "epico", "lendario"].map((id) => `sprite/notebook-${id}`),
  ...["cpu_turbo", "bateria", "ssd_nvme", "rede_5g"].map((id) => `icon/nbup-${id}`),
  ...["raro", "epico", "lendario"].flatMap((id) => ["", "-f"].map((body) => `sprite/hero/laptop-${id}${body}`)),
  ...["raro", "epico", "lendario"].flatMap((id) =>
    ["", "-f"].flatMap((body) => ["idle", "walk", "run", "jump", "interact"].map((anim) => `sprite/hero/anim/laptop-${id}${body}-${anim}`)),
  ),
];

describe("notebook art", () => {
  it("notebook art files exist", () => {
    expect(files).toHaveLength(44);
    for (const name of files) {
      expect(existsSync(`${ROOT}web/art/${name}.json`), name).toBe(true);
      expect(existsSync(`${ROOT}web/public/art/${name}.png`), name).toBe(true);
    }
    for (const dir of ["web/art", "web/public/art"]) {
      const walk = (path: string): string[] =>
        readdirSync(`${ROOT}${path}`, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory() ? walk(`${path}/${entry.name}`) : entry.name.includes("laptop-macbook") ? [`${path}/${entry.name}`] : [],
        );
      expect(walk(dir)).toEqual([]);
    }
  });
});
