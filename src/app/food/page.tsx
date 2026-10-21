import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Food Call",
  description: "Send savoury orders from the kitchen and hear them upstairs.",
};

export default function FoodHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-center text-3xl font-bold">Food Call</h1>
      <p className="text-center text-slate-600">Which end are you?</p>
      <Link
        href="/food/send"
        className="rounded-2xl bg-orange-500 px-6 py-8 text-center text-2xl font-bold text-white shadow active:scale-[0.98]"
      >
        Send orders
        <span className="mt-1 block text-base font-normal opacity-90">Downstairs kitchen</span>
      </Link>
      <Link
        href="/food/receive"
        className="rounded-2xl bg-slate-900 px-6 py-8 text-center text-2xl font-bold text-white shadow active:scale-[0.98]"
      >
        Receive orders
        <span className="mt-1 block text-base font-normal opacity-90">Reads them out loud</span>
      </Link>
    </main>
  );
}
