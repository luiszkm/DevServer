"use client";

import { useContext, useEffect, useMemo, useRef } from "react";
import { resolveLook, type Layer, type LookInput } from "@/lib/avatar";
import type { Catalog } from "@/lib/types";
import { GameContext } from "./GameContext";

const W = 48;
const H = 64;

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

/** Paints one layer with its exact hex swaps; pixels outside the map keep their colour. */
function paint(scratch: CanvasRenderingContext2D, img: HTMLImageElement, layer: Layer) {
  scratch.clearRect(0, 0, W, H);
  scratch.drawImage(img, 0, 0);
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
type Props = { look: LookInput; scale?: number; className?: string; catalog?: Catalog };

/** The layered 48x64 hero, recoloured per avatar part on a canvas. */
export function HeroAvatar({ look, scale, className, catalog: given }: Props) {
  const game = useContext(GameContext);
  const catalog = (given ?? game?.catalog)!;
  const resolved = useMemo(() => resolveLook(look, catalog), [look, catalog]);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let cancelled = false;
    Promise.all(resolved.layers.map((l) => loadImage(l.src)))
      .then((imgs) => {
        if (cancelled) return;
        const scratch = document.createElement("canvas");
        scratch.width = W;
        scratch.height = H;
        const s = scratch.getContext("2d", { willReadFrequently: true })!;
        ctx.clearRect(0, 0, W, H);
        imgs.forEach((img, i) => {
          paint(s, img, resolved.layers[i]);
          ctx.drawImage(scratch, 0, 0);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The key names the drawing; layers only change with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.key]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      role="img"
      aria-label="herói"
      data-look={resolved.key}
      className={`pixelated hero-avatar ${className ?? ""}`}
      style={scale ? { width: W * scale, height: H * scale } : undefined}
    />
  );
}
