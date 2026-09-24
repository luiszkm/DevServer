"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

export const TABS = [
  { label: "TÍTULO", href: "/" },
  { label: "MUNDO", href: "/mundo" },
  { label: "SERVER", href: "/server" },
  { label: "DEPLOY", href: "/deploy" },
  { label: "BUG FIGHT", href: "/bug-fight" },
  { label: "SKILLS", href: "/skills" },
  { label: "LOJA", href: "/loja" },
  { label: "AVATAR", href: "/avatar" },
  { label: "OFFICE", href: "/office" },
] as const;

// Below 1200px the nav collapses behind the MENU button (globals.css media block); above it the button is hidden.
export function Tabs() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const current = TABS.find((t) => t.href === pathname);

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
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
