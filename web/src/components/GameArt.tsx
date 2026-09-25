"use client";

import { useState } from "react";

/**
 * A `kind` of game art (door 1): catalog kinds keyed by the catalog `id` (`enemy` by region), and the
 * asset sheet's kinds keyed by their fixed name.
 */
export type ArtKind =
  | "enemy" | "item" | "gear" | "skill" | "deploy" | "rack" | "office" | "region" | "hud" | "menu"
  | "btn" | "ic" | "medal" | "prop" | "build" | "mob" | "npc" | "extra";

const SPRITE_KINDS: ArtKind[] = ["enemy", "prop", "build", "mob", "npc", "extra"];

// Sprites bigger than the 32x32 grid: the bosses, and the server hut (plan assumptions: native sizes).
const BIG_SPRITES: Record<string, number> = { "enemy-torre": 48, "enemy-nuvem": 64, "build-server-hut": 96 };

export function artSrc(kind: ArtKind, id: string) {
  return `/art/${SPRITE_KINDS.includes(kind) ? "sprite" : "icon"}/${kind}-${id}.png`;
}

export function nativeSize(kind: ArtKind, id: string) {
  return SPRITE_KINDS.includes(kind) ? (BIG_SPRITES[`${kind}-${id}`] ?? 32) : 16;
}

type Props = { kind: ArtKind; id: string; scale: number; alt: string; fallback: string; className?: string };

/**
 * Game art at a whole-number scale (door 2); the catalog `glyph` stands in when the PNG fails to load,
 * and an empty `fallback` leaves nothing behind (the text next to the icon carries the meaning).
 */
export function GameArt({ kind, id, scale, alt, fallback, className }: Props) {
  const src = artSrc(kind, id);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return fallback ? <span className="pixel">{fallback}</span> : null;
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
