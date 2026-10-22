"use client";

import Link from "next/link";
import { describeOrder, spokenOrder, type FoodOrderDto } from "@/lib/food";
import { speak } from "./useFoodFeed";

export function ScreenHeader({
  title,
  locationName,
  locationSlug,
}: {
  title: string;
  locationName: string;
  locationSlug: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          📍 {locationName}
        </p>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      <Link href={`/food/${locationSlug}`} className="pt-1 text-sm text-slate-500 underline">
        Switch
      </Link>
    </div>
  );
}

export function SoundBanner({
  soundOn,
  onTurnOn,
  offline,
}: {
  soundOn: boolean;
  onTurnOn: () => void;
  offline: boolean;
}) {
  return (
    <>
      {!soundOn ? (
        <button
          type="button"
          onClick={onTurnOn}
          className="mb-4 w-full rounded-2xl bg-orange-500 px-4 py-5 text-xl font-bold text-white shadow"
        >
          🔊 Tap to turn on sound
          <span className="mt-1 block text-sm font-normal opacity-90">
            Needed once each time this page opens
          </span>
        </button>
      ) : (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-center font-medium text-green-800">
          🔊 Sound on — keep this page open. Tap a flashing one to clear it.
        </p>
      )}
      {offline && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-center font-medium text-red-700">
          Can&apos;t reach the server — retrying…
        </p>
      )}
    </>
  );
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function FeedList({
  orders,
  loaded,
  freshIds,
  onSeen,
  emptyText,
  limit,
}: {
  orders: FoodOrderDto[];
  loaded: boolean;
  freshIds: Set<number>;
  onSeen: (id: number) => void;
  emptyText: string;
  limit?: number;
}) {
  if (!loaded) return <p className="py-6 text-center text-slate-500">Loading…</p>;
  if (orders.length === 0) return <p className="py-6 text-center text-slate-500">{emptyText}</p>;

  return (
    <ul className="space-y-2">
      {(limit ? orders.slice(0, limit) : orders).map((order) => {
        const fresh = freshIds.has(order.id);
        const isMessage = order.kind === "message";
        return (
          <li
            key={order.id}
            onClick={() => fresh && onSeen(order.id)}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${
              fresh
                ? "animate-pulse border-orange-500 bg-orange-50"
                : isMessage
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words text-xl font-bold">
                {isMessage ? "💬 " : order.kind === "request" ? "🙋 " : ""}
                {describeOrder(order)}
              </p>
              <p className="text-sm text-slate-600">
                {timeLabel(order.createdAt)}
                {order.name ? ` · for ${order.name}` : ""}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Read ${order.item} out again`}
              onClick={(event) => {
                event.stopPropagation();
                speak(spokenOrder(order));
              }}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
            >
              Repeat
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Free-text box used by both screens. */
export function MessageBox({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div>
      <label htmlFor="custom-message" className="field-label">
        {label}
      </label>
      <textarea
        id="custom-message"
        rows={3}
        maxLength={200}
        className="field-input text-lg"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="mt-1 text-right text-sm text-slate-500">{value.length}/200</p>
    </div>
  );
}
