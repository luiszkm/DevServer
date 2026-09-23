import { describe, expect, it } from "vitest";
import { formatMinutes, formatRemaining } from "./time";

describe("time formats", () => {
  it.each([
    [0, "00:00"],
    [-5000, "00:00"],
    [1, "00:01"],
    [59_000, "00:59"],
    [15 * 60_000, "15:00"],
    [3_599_000, "59:59"],
    [3_600_000, "1:00:00"],
    [3 * 3_600_000 + 61_000, "3:01:01"],
  ])("formatRemaining(%i) = %s", (ms, text) => {
    expect(formatRemaining(ms)).toBe(text);
  });

  it.each([
    [15, "15min"],
    [59, "59min"],
    [60, "1h"],
    [90, "1h30m"],
    [360, "6h"],
  ])("formatMinutes(%i) = %s", (m, text) => {
    expect(formatMinutes(m)).toBe(text);
  });
});
