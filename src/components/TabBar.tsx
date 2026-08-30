"use client";

import { Dumbbell, House, TrendingUp, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary navigation: Today, Program, Progress, You.
 *
 * The bar stays visually quiet per docs/design/REIGN_UI_SPEC.md — dark
 * background, hairline top border, muted inactive items, restrained gold for
 * the active tab, modest icon size, no floating treatment and no gradient.
 *
 * The active tab is marked three ways, not one: a gold rule along its top
 * edge, a heavier label, and the gold itself. Colour alone is weak at a glance
 * and disappears entirely for anyone who cannot separate gold from grey.
 */

const TABS = [
  { href: "/", label: "Today", Icon: House },
  { href: "/program", label: "Program", Icon: Dumbbell },
  { href: "/progress", label: "Progress", Icon: TrendingUp },
  { href: "/you", label: "You", Icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="bg-bg border-border pb-safe sticky bottom-0 border-t"
    >
      <ul className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href;

          return (
            <li key={href} className="relative flex-1">
              {isActive ? (
                <span
                  aria-hidden
                  className="bg-accent absolute inset-x-0 top-0 h-0.5"
                />
              ) : null}
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`text-label flex flex-col items-center justify-center gap-1.5 pt-2.5 pb-2 uppercase transition-colors ${
                  isActive ? "text-accent font-bold" : "text-muted"
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
