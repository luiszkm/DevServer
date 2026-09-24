"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameArt } from "./GameArt";

export const TABS = [
  { label: "TÍTULO", href: "/", icon: "titulo" },
  { label: "MUNDO", href: "/mundo", icon: "mundo" },
  { label: "SERVER", href: "/server", icon: "server" },
  { label: "DEPLOY", href: "/deploy", icon: "deploy" },
  { label: "BUG FIGHT", href: "/bug-fight", icon: "bug-fight" },
  { label: "SKILLS", href: "/skills", icon: "skills" },
  { label: "LOJA", href: "/loja", icon: "loja" },
  { label: "AVATAR", href: "/avatar", icon: "avatar" },
  { label: "OFFICE", href: "/office", icon: "office" },
] as const;

const EDITABLE = "input, textarea, select, [contenteditable]";

// Below 1200px the nav collapses behind the MENU button (globals.css media block); above it the button is hidden.
export function Tabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const current = TABS.find((t) => t.href === pathname);

  // Keys 1-9 jump to the matching slot (game-menu door 3).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest(EDITABLE)) return;
      const tab = /^[1-9]$/.test(e.key) ? TABS[Number(e.key) - 1] : undefined;
      if (!tab) return;
      setOpen(false);
      router.push(tab.href);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Escape" || !open) return;
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div className="tabs-bar" onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="btn menu-btn"
        aria-expanded={open}
        aria-controls="cenas-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {current && <GameArt kind="menu" id={current.icon} scale={2} alt="" fallback="" />}
        {current ? `MENU · ${current.label}` : "MENU"}
      </button>
      <nav id="cenas-nav" className="tabs" aria-label="Cenas" data-open={open}>
        {TABS.map((t, i) => (
          <Link
            key={t.href}
            href={t.href}
            className="tab"
            aria-current={pathname === t.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span className="tab-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="tab-icon">
              <GameArt kind="menu" id={t.icon} scale={2} alt="" fallback="" />
            </span>
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
