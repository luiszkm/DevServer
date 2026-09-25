"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { heroFrame, resolveLook, type AvatarAnim, type Layer, type LookInput } from "@/lib/avatar";
import type { Catalog } from "@/lib/types";
import { GameContext } from "./GameContext";

const W = 48;
const H = 64;
// 6 frames per second (plan assumptions: speed); every strip has 4 frames.
const FRAME_MS = 166;
const FRAMES = 4;

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(src);
        reject(new Error(src));
      };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

const rgb = (hex: string) => parseInt(hex.slice(1), 16);

/** A layer's strip frame, or its static PNG when the strip fails to load (then x = 0). */
async function loadFrame(layer: Layer, anim: AvatarAnim | null, frame: number) {
  if (!anim) return { img: await loadImage(layer.src), sx: 0 };
  const f = heroFrame(layer, anim, frame);
  try {
    return { img: await loadImage(f.src), sx: f.sx };
  } catch {
    return { img: await loadImage(layer.src), sx: 0 };
  }
}

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Paints one layer (from source x `sx`) with its exact hex swaps; pixels outside the map keep their colour. */
function paint(scratch: CanvasRenderingContext2D, img: HTMLImageElement, sx: number, layer: Layer) {
  scratch.clearRect(0, 0, W, H);
  scratch.drawImage(img, sx, 0, W, H, 0, 0, W, H);
  const entries = Object.entries(layer.swap);
  if (!entries.length) return;
  const map = new Map(entries.map(([from, to]) => [rgb(from), rgb(to)]));
  const data = scratch.getImageData(0, 0, W, H);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const to = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    if (to === undefined) continue;
    px[i] = to >> 16;
    px[i + 1] = (to >> 8) & 255;
    px[i + 2] = to & 255;
  }
  scratch.putImageData(data, 0, 0);
}

// Without a scale the size comes from CSS (keep a 3:4 aspect ratio there).
// `catalog` is for screens outside the game shell (onboarding); inside it comes from the game.
// `anim` plays that strip in a loop (door 5); without it, or with reduced motion, the static layers.
type Props = { look: LookInput; scale?: number; className?: string; catalog?: Catalog; anim?: AvatarAnim };

/** The layered 48x64 hero, recoloured per avatar part on a canvas, optionally animated. */
export function HeroAvatar({ look, scale, className, catalog: given, anim }: Props) {
  const game = useContext(GameContext);
  const catalog = (given ?? game?.catalog)!;
  const resolved = useMemo(() => resolveLook(look, catalog), [look, catalog]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [still] = useState(reducedMotion);
  const playing = anim && !still ? anim : null;
  // The frame belongs to the anim it was counted for, so a new anim starts at 0 without an effect.
  const [tick, setTick] = useState<{ anim: AvatarAnim | null; n: number }>({ anim: playing, n: 0 });
  const frame = tick.anim === playing ? tick.n : 0;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTick((t) => ({ anim: playing, n: ((t.anim === playing ? t.n : 0) + 1) % FRAMES })), FRAME_MS);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    Promise.all(resolved.layers.map((l) => loadFrame(l, playing, frame)))
      .then((frames) => {
        if (cancelled) return;
        const scratch = document.createElement("canvas");
        scratch.width = W;
        scratch.height = H;
        const s = scratch.getContext("2d", { willReadFrequently: true })!;
        ctx.clearRect(0, 0, W, H);
        frames.forEach(({ img, sx }, i) => {
          paint(s, img, sx, resolved.layers[i]);
          ctx.drawImage(scratch, 0, 0);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The key names the drawing; layers only change with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.key, playing, frame]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      role="img"
      aria-label="herói"
      data-look={resolved.key}
      data-anim={anim}
      data-frame={anim ? frame : undefined}
      className={`pixelated hero-avatar ${className ?? ""}`}
      style={scale ? { width: W * scale, height: H * scale } : undefined}
    />
  );
}
