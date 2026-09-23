"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const TABS = [
  { label: "TÍTULO", href: "/" },
  { label: "MUNDO", href: "/mundo" },
  { label: "DEPLOY", href: "/deploy" },
  { label: "BUG FIGHT", href: "/bug-fight" },
  { label: "SKILLS", href: "/skills" },
  { label: "LOJA", href: "/loja" },
  { label: "AVATAR", href: "/avatar" },
] as const;

export function Tabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Cenas">
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={pathname === t.href ? "page" : undefined}>
          <span className="tab-num">{String(i + 1).padStart(2, "0")}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
