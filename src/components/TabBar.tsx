"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary navigation: Today, Program, Progress, You.
 *
 * The bar stays visually quiet per docs/design/REIGN_UI_SPEC.md — dark
 * background, hairline top border, muted inactive items, restrained gold for
 * the active tab, no floating treatment and no gradient.
 *
 * This is a client component because it reads the current URL to decide which
 * tab is active.
 */

const TABS = [
  { href: "/", label: "Today" },
  { href: "/program", label: "Program" },
  { href: "/progress", label: "Progress" },
  { href: "/you", label: "You" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="bg-bg border-border pb-safe sticky bottom-0 border-t"
    >
      <ul className="flex">
        {TABS.map(({ href, label }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`text-label flex h-14 items-center justify-center uppercase transition-colors ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
