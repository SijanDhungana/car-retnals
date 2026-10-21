"use client";

import Link from "next/link";
import { useState } from "react";

const OTHER = "__other__";

export default function SendForm({ menu }: { menu: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const item = selected === OTHER ? otherText.trim() : selected;

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
      setOtherText("");
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
        {[...menu, OTHER].map((entry) => {
          const active = selected === entry;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => setSelected(entry)}
              className={`min-h-16 rounded-xl border-2 px-3 py-3 text-lg font-semibold transition ${
                active
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              {entry === OTHER ? "Something else…" : entry}
            </button>
          );
        })}
      </div>

      {selected === OTHER && (
        <div className="mt-3">
          <label htmlFor="other" className="field-label">
            What is it?
          </label>
          <input
            id="other"
            className="field-input text-lg"
            value={otherText}
            maxLength={60}
            autoFocus
            onChange={(event) => setOtherText(event.target.value)}
          />
        </div>
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
