"use client";

import Link from "next/link";
import { useState } from "react";
import type { FoodMenuItem } from "@/lib/food";

export default function SendForm({ menu }: { menu: FoodMenuItem[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pastrami, setPastrami] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const selectedItem = menu.find((entry) => entry.name === selected);
  const canAddPastrami = Boolean(selectedItem?.pastramiAddOn);
  const item = selected
    ? canAddPastrami && pastrami
      ? `${selected} with Pastrami`
      : selected
    : null;

  async function send() {
    if (!item || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/food/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, quantity, name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't send");
      }
      setMessage({
        kind: "ok",
        text: `Sent: ${quantity > 1 ? `${quantity} × ` : ""}${item}${name.trim() ? ` for ${name.trim()}` : ""}`,
      });
      setSelected(null);
      setPastrami(false);
      setQuantity(1);
      setName("");
    } catch (error) {
      setMessage({
        kind: "error",
        text: `Not sent — ${error instanceof Error ? error.message : "check the connection"}. Tap Send to try again.`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-40 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Send an order</h1>
        <Link href="/food" className="text-sm text-slate-500 underline">
          Switch
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Item</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {menu.map((entry) => {
          const active = selected === entry.name;
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => {
                setSelected(entry.name);
                setPastrami(false);
              }}
              className={`min-h-16 rounded-xl border-2 px-3 py-3 text-lg font-semibold transition ${
                active
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              {entry.name}
            </button>
          );
        })}
      </div>

      {canAddPastrami && (
        <label className="mt-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 text-lg font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 accent-orange-500"
            checked={pastrami}
            onChange={(event) => setPastrami(event.target.checked)}
          />
          Add pastrami
        </label>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
        How many
      </h2>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="One fewer"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-white text-2xl font-bold"
        >
          −
        </button>
        <span className="w-12 text-center text-3xl font-bold tabular-nums">{quantity}</span>
        <button
          type="button"
          aria-label="One more"
          onClick={() => setQuantity((q) => Math.min(50, q + 1))}
          className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-white text-2xl font-bold"
        >
          +
        </button>
      </div>

      <div className="mt-6">
        <label htmlFor="name" className="field-label">
          Name (optional)
        </label>
        <input
          id="name"
          className="field-input text-lg"
          value={name}
          maxLength={40}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3">
        <div className="mx-auto max-w-xl">
          {message && (
            <p
              role="status"
              className={`mb-2 text-center font-medium ${
                message.kind === "ok" ? "text-green-700" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="button"
            onClick={send}
            disabled={!item || sending}
            className="w-full rounded-xl bg-orange-500 py-4 text-xl font-bold text-white disabled:bg-slate-300"
          >
            {sending ? "Sending…" : item ? `Send ${quantity > 1 ? `${quantity} × ` : ""}${item}` : "Pick an item"}
          </button>
        </div>
      </div>
    </main>
  );
}
