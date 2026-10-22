"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeOrder,
  spokenOrder,
  type FoodLocation,
  type FoodOrderDto,
  type FoodTarget,
} from "@/lib/food";

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

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

/** Pop-up for when this tab is behind another one. Silently skipped if not allowed. */
function notify(registration: ServiceWorkerRegistration | null, order: FoodOrderDto) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const title =
    order.kind === "message"
      ? `Message: ${describeOrder(order)}`
      : order.kind === "request"
        ? `Upstairs needs: ${describeOrder(order)}`
        : `New order: ${describeOrder(order)}`;
  const options = {
    body: order.name ? `For ${order.name}` : "Tap to open",
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

/**
 * Everything a screen needs to listen for orders/requests sent to it:
 * loads the last few hours, then polls (in a worker, so it keeps going in a
 * background tab), chimes, reads each new one aloud and flags it as fresh.
 */
export function useFoodFeed({
  location,
  target,
  pageTitle,
}: {
  location: FoodLocation;
  target: FoodTarget;
  pageTitle: string;
}) {
  const [orders, setOrders] = useState<FoodOrderDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [offline, setOffline] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());

  const soundOnRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  const announce = useCallback((order: FoodOrderDto) => {
    if (!soundOnRef.current) return;
    chime(audioRef.current);
    setTimeout(() => speak(spokenOrder(order)), 800);
    if (document.hidden) notify(swRef.current, order);
  }, []);

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
      if (!incoming.length) return;

      setOrders((previous) => [...incoming.slice().reverse(), ...previous]);
      // What was already there when the page opened is shown, not read out.
      if (!isFirstLoad) {
        setFreshIds((previous) => new Set([...previous, ...incoming.map((o) => o.id)]));
        incoming.forEach(announce);
      }
    };
    worker.postMessage({ feed: `/api/food/orders?location=${location}&target=${target}` });
    return () => worker.terminate();
  }, [announce, location, target]);

  // While this tab is in the background, show the unseen count in its title.
  useEffect(() => {
    const unseen = freshIds.size;
    document.title = unseen && document.hidden ? `🔔 (${unseen}) ${pageTitle}` : pageTitle;
    const onVisible = () => {
      if (!document.hidden) document.title = pageTitle;
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [freshIds, pageTitle]);

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
    speak("Sound is on.");
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

  return { orders, loaded, offline, soundOn, turnSoundOn, freshIds, markSeen };
}

/** Sends an order / request / message. Throws with a readable message on failure. */
export async function postFoodOrder(body: Record<string, unknown>) {
  const response = await fetch("/api/food/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Couldn't send");
  }
}
