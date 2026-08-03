"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bookings", label: "Bookings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/availability", label: "Availability" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
}

/** Primary navigation, shown inline in the header on tablet and up. */
export function NavLinks() {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            isActive(link.href)
              ? "bg-brand-50 text-brand-700"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Phone navigation, pinned to the bottom of the screen.
 *
 * This must be rendered as a sibling of the header, never inside it: the
 * header's `backdrop-blur` creates a containing block, which would anchor
 * `bottom-0` to the header instead of the viewport.
 */
export function MobileNav() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white sm:hidden">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`py-3 text-center text-xs font-medium transition ${
            isActive(link.href)
              ? "text-brand-700"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
