import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLook } from "@/lib/avatar";
import { CATALOG, player } from "@/test/helpers";
import type { HeroAvatar as HeroAvatarType } from "./HeroAvatar";

// assets C42-C46. jsdom has no canvas and never loads images, so the test gives the canvas a 2d context
// that records drawImage calls and an Image that loads (or fails, for FAIL) on the next tick.
const FAIL = new Set<string>();
// srcs matching SLOW load after 1000 ms instead of on the next tick
let SLOW: RegExp | null = null;
const loaded: string[] = [];
const draws: { src: string; sx: number }[] = [];

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = "";
  get src() {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    loaded.push(v);
    setTimeout(() => (FAIL.has(v) ? this.onerror?.() : this.onload?.()), SLOW?.test(v) ? 1000 : 0);
  }
}

function fakeContext() {
  return {
    clearRect: () => {},
    drawImage: (img: unknown, sx = 0) => {
      if (img instanceof FakeImage) draws.push({ src: img.src, sx: typeof sx === "number" ? sx : 0 });
    },
    getImageData: () => ({ data: new Uint8ClampedArray(48 * 64 * 4) }),
    putImageData: () => {},
  };
}

const motion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)", media: q }));

const look = player();
const layers = resolveLook(look, CATALOG).layers.map((l) => l.src);
const strip = (src: string, anim: string) => src.replace(/\/hero\/([^/]+)\.png$/, `/hero/anim/$1-${anim}.png`);
const canvas = () => document.querySelector("canvas")!;
const flush = () => act(async () => void (await vi.advanceTimersByTimeAsync(1)));

// HeroAvatar caches loaded images per module; a fresh module per test keeps the load log honest.
let HeroAvatar: typeof HeroAvatarType;
beforeEach(async () => {
  vi.resetModules();
  ({ HeroAvatar } = await import("./HeroAvatar"));
  vi.useFakeTimers();
  FAIL.clear();
  SLOW = null;
  loaded.length = 0;
  draws.length = 0;
  vi.stubGlobal("Image", FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => fakeContext()) as never);
  motion(false);
});
afterEach(() => vi.useRealTimers());

describe("HeroAvatar anim", () => {
  it("advances a frame every 166 ms", async () => {
    render(<HeroAvatar look={look} catalog={CATALOG} anim="walk" />);
    expect(canvas().dataset.anim).toBe("walk");
    expect(canvas().dataset.frame).toBe("0");
    for (const next of ["1", "2", "3", "0"]) {
      await act(async () => void (await vi.advanceTimersByTimeAsync(166)));
      expect(canvas().dataset.frame).toBe(next);
    }
  });

  it("restarts at frame 0 when the anim changes", async () => {
    SLOW = /-walk\.png$/;
    const view = render(<HeroAvatar look={look} catalog={CATALOG} anim="walk" />);
    await act(async () => void (await vi.advanceTimersByTimeAsync(166 * 2)));
    expect(canvas().dataset.frame).toBe("2");
    draws.length = 0;
    // the run strips have not loaded yet when the anim switches back: the stale walk load must not paint
    view.rerender(<HeroAvatar look={look} catalog={CATALOG} anim="run" />);
    expect(canvas().dataset.anim).toBe("run");
    expect(canvas().dataset.frame).toBe("0");
    await flush();
    expect(draws.length).toBeGreaterThan(0);
    // now the walk loads started before the switch resolve: they must paint nothing
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(loaded.some((src) => src.endsWith("-walk.png"))).toBe(true);
    expect(draws.every((d) => d.src.endsWith("-run.png"))).toBe(true);
  });

  it("draws the static layer when its strip fails", async () => {
    const broken = layers[0];
    FAIL.add(strip(broken, "idle"));
    render(<HeroAvatar look={look} catalog={CATALOG} anim="idle" />);
    await flush();
    await flush();
    expect(draws).toContainEqual({ src: broken, sx: 0 });
    for (const other of layers.slice(1)) expect(draws).toContainEqual({ src: strip(other, "idle"), sx: 0 });
    await act(async () => void (await vi.advanceTimersByTimeAsync(166)));
    expect(canvas().dataset.frame).toBe("1");
    await flush();
    expect(draws).toContainEqual({ src: strip(layers[1], "idle"), sx: 48 });
  });

  it("reduced motion draws the static layers on frame 0", async () => {
    motion(true);
    render(<HeroAvatar look={look} catalog={CATALOG} anim="run" />);
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(canvas().dataset.frame).toBe("0");
    expect(loaded.length).toBeGreaterThan(0);
    expect(loaded.every((src) => !src.includes("/anim/"))).toBe(true);
  });

  it("static without anim: no frame and no timer", async () => {
    render(<HeroAvatar look={look} catalog={CATALOG} />);
    expect(canvas().dataset.frame).toBeUndefined();
    // the fake image loads are this test's own timers: once they fire, nothing may be left scheduled
    await flush();
    expect(vi.getTimerCount()).toBe(0);
    expect(loaded.every((src) => !src.includes("/anim/"))).toBe(true);
    expect(loaded.length).toBe(layers.length);
  });
});
