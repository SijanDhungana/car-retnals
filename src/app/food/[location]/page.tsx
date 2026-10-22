import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findLocation } from "@/lib/food";

export const metadata: Metadata = { title: "Food Call" };

export default async function LocationHome({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const location = findLocation((await params).location);
  if (!location) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-10">
      <p className="text-center text-sm font-semibold uppercase tracking-wide text-orange-600">
        📍 {location.name}
      </p>
      <h1 className="text-center text-3xl font-bold">Which end are you?</h1>
      <Link
        href={`/food/${location.slug}/send`}
        className="rounded-2xl bg-orange-500 px-6 py-8 text-center text-2xl font-bold text-white shadow active:scale-[0.98]"
      >
        {location.sides.kitchen.label}
        <span className="mt-1 block text-base font-normal opacity-90">
          Kitchen — send orders, hear requests
        </span>
      </Link>
      <Link
        href={`/food/${location.slug}/receive`}
        className="rounded-2xl bg-slate-900 px-6 py-8 text-center text-2xl font-bold text-white shadow active:scale-[0.98]"
      >
        {location.sides.counter.label}
        <span className="mt-1 block text-base font-normal opacity-90">
          Hear orders, ask for things
        </span>
      </Link>
      <Link href="/food" className="mt-2 text-center text-sm text-slate-500 underline">
        Change location
      </Link>
    </main>
  );
}
