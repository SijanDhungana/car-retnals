import Link from "next/link";
import { requireSession } from "@/auth";
import { MobileNav, NavLinks } from "@/components/NavLinks";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              FR
            </span>
            <span className="hidden text-sm font-semibold text-slate-900 sm:block">
              Fleet Rentals
            </span>
          </Link>

          <NavLinks />

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 md:block">
              {session.user?.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-8">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
