"use client";

import { useEffect, useState } from "react";
import type { FoodButtonDto, FoodLocation } from "@/lib/food";
import { FeedList, MessageBox, ScreenHeader, SoundBanner } from "../../_components/FeedParts";
import { postFoodOrder, useFoodFeed } from "../../_components/useFoodFeed";

type Status = { kind: "ok" | "error"; text: string } | null;

/** Upstairs counter: hears orders from the kitchen, asks the kitchen for things. */
export default function UpstairsScreen({
  location,
  locationName,
}: {
  location: FoodLocation;
  locationName: string;
}) {
  const feed = useFoodFeed({ location, target: "upstairs", pageTitle: "Upstairs — Food Call" });

  const [buttons, setButtons] = useState<FoodButtonDto[]>([]);
  const [buttonsLoaded, setButtonsLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [customText, setCustomText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    fetch(`/api/food/buttons?location=${location}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { buttons: FoodButtonDto[] }) => setButtons(data.buttons))
      .catch(() => setStatus({ kind: "error", text: "Couldn't load your saved buttons." }))
      .finally(() => setButtonsLoaded(true));
  }, [location]);

  async function send(kind: "request" | "message", item: string) {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await postFoodOrder({ location, target: "downstairs", kind, item });
      setStatus({ kind: "ok", text: kind === "message" ? "Message sent" : `Asked for: ${item}` });
      if (kind === "message") setCustomText("");
    } catch (error) {
      setStatus({
        kind: "error",
        text: `Not sent — ${error instanceof Error ? error.message : "check the connection"}.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function addButton() {
    const label = newLabel.trim();
    if (!label || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/food/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, label }),
      });
      if (!response.ok) throw new Error();
      const { button } = (await response.json()) as { button: FoodButtonDto };
      setButtons((previous) => [...previous, button]);
      setNewLabel("");
      setAdding(false);
      setStatus({ kind: "ok", text: `Saved “${button.label}” button` });
    } catch {
      setStatus({ kind: "error", text: "Couldn't save the button. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function removeButton(button: FoodButtonDto) {
    if (!window.confirm(`Remove the “${button.label}” button?`)) return;
    const response = await fetch(`/api/food/buttons?location=${location}&id=${button.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (response?.ok) {
      setButtons((previous) => previous.filter((b) => b.id !== button.id));
    } else {
      setStatus({ kind: "error", text: "Couldn't remove the button. Try again." });
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6">
      <ScreenHeader title="Upstairs" locationName={locationName} locationSlug={location} />
      <SoundBanner soundOn={feed.soundOn} onTurnOn={feed.turnSoundOn} offline={feed.offline} />

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ask downstairs</h2>
          {buttons.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-sm font-medium text-slate-600 underline"
            >
              {editing ? "Done" : "Edit buttons"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {buttons.map((button) =>
            editing ? (
              <button
                key={button.id}
                type="button"
                onClick={() => removeButton(button)}
                className="min-h-14 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-lg font-semibold text-red-700"
              >
                ✕ {button.label}
              </button>
            ) : (
              <button
                key={button.id}
                type="button"
                disabled={busy}
                onClick={() => send("request", button.label)}
                className="min-h-14 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-lg font-semibold active:bg-orange-500 active:text-white"
              >
                {button.label}
              </button>
            ),
          )}
          {!editing && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="min-h-14 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-lg font-semibold text-slate-500"
            >
              + Add button
            </button>
          )}
        </div>

        {buttonsLoaded && buttons.length === 0 && !adding && (
          <p className="mt-2 text-sm text-slate-500">
            Add buttons for things you ask for often, like “Milk”. They stay saved.
          </p>
        )}

        {adding && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              addButton();
            }}
          >
            <label htmlFor="new-button" className="sr-only">
              New button
            </label>
            <input
              id="new-button"
              autoFocus
              maxLength={40}
              placeholder="e.g. Milk"
              className="field-input text-lg"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
            />
            <button
              type="submit"
              disabled={!newLabel.trim() || busy}
              className="shrink-0 rounded-lg bg-slate-900 px-4 font-semibold text-white disabled:bg-slate-300"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewLabel("");
              }}
              className="shrink-0 px-2 text-slate-500"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="mt-4">
          <MessageBox
            value={customText}
            onChange={setCustomText}
            label="Or type a message (read out loud downstairs)"
          />
          <button
            type="button"
            disabled={!customText.trim() || busy}
            onClick={() => send("message", customText.trim())}
            className="w-full rounded-xl bg-orange-500 py-3 text-lg font-bold text-white disabled:bg-slate-300"
          >
            Send message
          </button>
        </div>

        {status && (
          <p
            role="status"
            className={`mt-3 text-center font-medium ${
              status.kind === "ok" ? "text-green-700" : "text-red-600"
            }`}
          >
            {status.text}
          </p>
        )}
      </section>

      <h2 className="mb-2 text-lg font-bold">Incoming orders</h2>
      <FeedList
        orders={feed.orders}
        loaded={feed.loaded}
        freshIds={feed.freshIds}
        onSeen={feed.markSeen}
        emptyText="No orders yet. New ones will appear here and be read out."
      />
    </main>
  );
}
