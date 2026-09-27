"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const TITLE = { label: "TÍTULO", href: "/", icon: "titulo" } as const;
export const WORLD = { label: "MUNDO", href: "/mundo", icon: "mundo" } as const;
const BASE = { label: "BASE", href: "/office", icon: "office" } as const;
export const DEPLOY = { label: "DEPLOY", href: "/deploy", icon: "deploy" } as const;
export const FIGHT = { label: "BUG FIGHT", href: "/bug-fight", icon: "bug-fight" } as const;
export const SHOP = { label: "LOJA", href: "/loja", icon: "loja" } as const;

/** Number keys 1-6, in order. The HUD links TÍTULO, MUNDO, DEPLOY, BUG FIGHT and LOJA, and its hero links BASE. */
const SHORTCUTS = [TITLE, WORLD, BASE, DEPLOY, FIGHT, SHOP];

const EDITABLE = "input, textarea, select, [contenteditable]";

// Keys 1-6 jump to the matching scene (game-menu door 3). Office, avatar, skills and server are tabs inside BASE.
export function SceneShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest(EDITABLE)) return;
      const scene = /^[1-9]$/.test(e.key) ? SHORTCUTS[Number(e.key) - 1] : undefined;
      if (scene) router.push(scene.href);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
