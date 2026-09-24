"use client";

import { useState } from "react";

/** A `kind` of catalog art; `enemy` is keyed by region, every other kind by the catalog `id` (door 1). */
export type ArtKind = "enemy" | "item" | "gear" | "skill" | "deploy" | "rack" | "office" | "region" | "hud";

// Bosses are drawn bigger than the 32x32 enemy grid (plan assumptions: native sizes).
const ENEMY_SIZE: Record<string, number> = { torre: 48, nuvem: 64 };

export function artSrc(kind: ArtKind, id: string) {
  return `/art/${kind === "enemy" ? "sprite" : "icon"}/${kind}-${id}.png`;
}

export function nativeSize(kind: ArtKind, id: string) {
  return kind === "enemy" ? (ENEMY_SIZE[id] ?? 32) : 16;
}

type Props = { kind: ArtKind; id: string; scale: number; alt: string; fallback: string; className?: string };

/** Catalog art at a whole-number scale (door 2); the catalog `glyph` stands in when the PNG fails to load. */
export function GameArt({ kind, id, scale, alt, fallback, className }: Props) {
  const src = artSrc(kind, id);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <span className="pixel">{fallback}</span>;
  const size = nativeSize(kind, id) * scale;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pixel art at a fixed integer scale; no optimisation wanted
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`pixelated ${className ?? ""}`}
      onError={() => setFailed(src)}
    />
  );
}
