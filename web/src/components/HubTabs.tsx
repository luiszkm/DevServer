"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Office, avatar, skills and server share one top-level menu and switch inside it.
export const HUB_TABS = [
  { label: "OFFICE", href: "/office" },
  { label: "AVATAR", href: "/avatar" },
  { label: "SKILLS", href: "/skills" },
  { label: "SERVER", href: "/server" },
] as const;

export const HUB_HREFS = new Set<string>(HUB_TABS.map((t) => t.href));

export function isHub(pathname: string) {
  return HUB_HREFS.has(pathname);
}

export function HubTabs() {
  const pathname = usePathname();
  if (!isHub(pathname)) return null;
  return (
    <nav className="hub-tabs" aria-label="Base">
      {HUB_TABS.map((t) => (
        <Link key={t.href} href={t.href} className="hub-tab pixel" aria-current={pathname === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
