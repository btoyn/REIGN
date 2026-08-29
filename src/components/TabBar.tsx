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
 * This is a client component because it reads the current URL to decide which
 * tab is active.
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
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`text-label flex flex-col items-center justify-center gap-1.5 pt-2.5 pb-2 uppercase transition-colors ${
                  isActive ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
