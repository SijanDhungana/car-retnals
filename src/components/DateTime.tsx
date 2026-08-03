"use client";

import { useEffect, useState } from "react";

type Props = {
  value: string | Date;
  /** Omit the time and show only the date. */
  dateOnly?: boolean;
  className?: string;
};

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Renders a stored UTC instant in the viewer's own timezone.
 *
 * The server can't know the browser's timezone, so the first paint emits the
 * raw ISO date and the effect swaps in the localised string after hydration.
 * `suppressHydrationWarning` keeps React quiet about that intentional
 * server/client difference.
 */
export function DateTime({ value, dateOnly = false, className }: Props) {
  const date = typeof value === "string" ? new Date(value) : value;
  const [text, setText] = useState(() => date.toISOString().slice(0, 16).replace("T", " "));

  useEffect(() => {
    setText(dateOnly ? dateFormat.format(date) : dateTimeFormat.format(date));
  }, [date, dateOnly]);

  return (
    <time dateTime={date.toISOString()} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
