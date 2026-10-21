"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { describeOrder, spokenOrder, type FoodOrderDto } from "@/lib/food";

/** Short two-note "ding-dong" so people look up before the voice starts. */
function chime(context: AudioContext | null) {
  if (!context) return;
  const now = context.currentTime;
  [880, 660].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.connect(gain).connect(context.destination);
    const start = now + index * 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    oscillator.start(start);
    oscillator.stop(start + 0.65);
  });
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

/** Pop-up for when this tab is behind another one. Silently skipped if not allowed. */
function notify(registration: ServiceWorkerRegistration | null, order: FoodOrderDto) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title = `New order: ${describeOrder(order)}`;
  const options = {
    body: order.name ? `For ${order.name}` : "Tap to open the order list",
    tag: `food-order-${order.id}`,
    requireInteraction: true,
  };
  if (registration) {
    registration.showNotification(title, options).catch(() => {});
  } else {
    try {
      new Notification(title, options);
    } catch {
      // Some phones only allow notifications through a service worker.
    }
  }
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ReceiveBoard() {
  const [orders, setOrders] = useState<FoodOrderDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [offline, setOffline] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());

  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const soundOnRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const announce = useCallback((order: FoodOrderDto) => {
    if (!soundOnRef.current) return;
    chime(audioRef.current);
    setTimeout(() => speak(spokenOrder(order)), 800);
    if (document.hidden) notify(swRef.current, order);
  }, []);

  // Load everything from today first, then keep polling for anything newer.
  // Polling runs in a worker so it keeps going while another tab is in front.
  useEffect(() => {
    let firstLoadDone = false;
    const worker = new Worker("/food/poll-worker.js");

    worker.onmessage = (event: MessageEvent<{ ok: boolean; orders?: FoodOrderDto[] }>) => {
      if (!event.data.ok) {
        setOffline(true);
        return;
      }
      setOffline(false);
      const incoming = event.data.orders ?? [];
      const isFirstLoad = !firstLoadDone;
      firstLoadDone = true;
      setLoaded(true);

      if (incoming.length) {
        setOrders((previous) => [...incoming.slice().reverse(), ...previous]);
        // Orders already there when the page opened are shown, not read out.
        if (!isFirstLoad) {
          setFreshIds((previous) => new Set([...previous, ...incoming.map((o) => o.id)]));
          incoming.forEach(announce);
        }
      }
    };
    worker.postMessage("start");
    return () => worker.terminate();
  }, [announce]);

  // While this tab is in the background, show the unseen count in its title.
  useEffect(() => {
    const unseen = freshIds.size;
    document.title =
      unseen && document.hidden ? `🔔 (${unseen}) New order` : "Food Call — Receive";
    const onVisible = () => {
      if (!document.hidden) document.title = "Food Call — Receive";
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [freshIds]);

  // Keep the screen awake while sound is on (where the browser allows it).
  useEffect(() => {
    if (!soundOn || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [soundOn]);

  function turnSoundOn() {
    // Browsers only allow audio after a tap, so this button unlocks it.
    try {
      audioRef.current ??= new AudioContext();
      audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
    chime(audioRef.current);
    speak("Sound is on. New orders will be read out.");
    soundOnRef.current = true;
    setSoundOn(true);

    // Ask once for pop-up notifications, used when another tab is in front.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/food/sw.js", { scope: "/food/" })
        .then((registration) => (swRef.current = registration))
        .catch(() => {});
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }

  function markSeen(id: number) {
    setFreshIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Incoming orders</h1>
        <Link href="/food" className="text-sm text-slate-500 underline">
          Switch
        </Link>
      </div>

      {!soundOn ? (
        <button
          type="button"
          onClick={turnSoundOn}
          className="mb-4 w-full rounded-2xl bg-orange-500 px-4 py-6 text-xl font-bold text-white shadow"
        >
          🔊 Tap to turn on sound
          <span className="mt-1 block text-sm font-normal opacity-90">
            Needed once each time this page opens
          </span>
        </button>
      ) : (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-center font-medium text-green-800">
          🔊 Sound on — keep this tab open (it can be behind other tabs). Tap a flashing order to clear it.
        </p>
      )}

      {offline && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-center font-medium text-red-700">
          Can&apos;t reach the server — retrying…
        </p>
      )}

      {!loaded ? (
        <p className="py-10 text-center text-slate-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-slate-500">
          No orders yet. New ones will appear here and be read out.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => {
            const fresh = freshIds.has(order.id);
            return (
              <li
                key={order.id}
                onClick={() => fresh && markSeen(order.id)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${
                  fresh
                    ? "animate-pulse border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold">{describeOrder(order)}</p>
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
      )}
    </main>
  );
}
