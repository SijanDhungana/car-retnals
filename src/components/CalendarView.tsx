"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BookingStatus } from "@/db/schema";
import { STATUS_STYLES } from "@/components/StatusBadge";
import {
  addDays,
  endOfDay,
  isSameDay,
  monthGridDays,
  startOfDay,
  startOfMonth,
} from "@/lib/dates";

export type CalendarBooking = {
  id: string;
  carId: string;
  carName: string;
  carColor: string;
  customerName: string;
  /** ISO strings — Dates don't survive the server→client boundary as Dates. */
  startAt: string;
  endAt: string;
  status: BookingStatus;
};

export type CalendarCar = { id: string; name: string; displayColor: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

/**
 * Month grid of every booking across the fleet.
 *
 * Runs client-side so day buckets land in the viewer's own timezone — the same
 * timezone the datetime-local inputs used when the booking was created.
 */
export function CalendarView({
  bookings,
  cars,
  initialMonth,
}: {
  bookings: CalendarBooking[];
  cars: CalendarCar[];
  initialMonth: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date(initialMonth)));
  const [carFilter, setCarFilter] = useState<string>("");
  const [showCancelled, setShowCancelled] = useState(false);

  const parsed = useMemo(
    () =>
      bookings.map((booking) => ({
        ...booking,
        start: new Date(booking.startAt),
        end: new Date(booking.endAt),
      })),
    [bookings],
  );

  const visible = useMemo(
    () =>
      parsed.filter((booking) => {
        if (carFilter && booking.carId !== carFilter) return false;
        if (!showCancelled && booking.status === "CANCELLED") return false;
        return true;
      }),
    [parsed, carFilter, showCancelled],
  );

  const days = useMemo(() => monthGridDays(month), [month]);

  // A booking appears on every day its window touches, so multi-day rentals
  // read as a continuous block down the grid.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const day of days) {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const hits = visible.filter(
        (booking) => booking.start <= dayEnd && booking.end >= dayStart,
      );
      if (hits.length > 0) map.set(day.toDateString(), hits);
    }
    return map;
  }, [days, visible]);

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(addDays(month, -1)))}
            className="btn-secondary px-3"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-40 text-center text-sm font-semibold text-slate-900">
            {monthLabel.format(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(addDays(month, 32)))}
            className="btn-secondary px-3"
            aria-label="Next month"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="btn-secondary"
          >
            Today
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show cancelled
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCarFilter("")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            carFilter === ""
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
          }`}
        >
          All cars
        </button>
        {cars.map((car) => (
          <button
            key={car.id}
            type="button"
            onClick={() => setCarFilter(car.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition ${
              carFilter === car.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: car.displayColor }}
            />
            {car.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="font-medium uppercase tracking-wide">Status</span>
        {(
          ["RESERVED", "ACTIVE", "RETURNED", "CANCELLED"] as BookingStatus[]
        ).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[status].dot}`}
            />
            {STATUS_STYLES[status].label}
          </span>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-1 py-2">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day[0]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayBookings = byDay.get(day.toDateString()) ?? [];
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 border-b border-r border-slate-100 p-1 sm:min-h-28 sm:p-1.5 ${
                  inMonth ? "bg-white" : "bg-slate-50/60"
                }`}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-brand-600 font-semibold text-white"
                        : inMonth
                          ? "text-slate-600"
                          : "text-slate-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      title={`${booking.carName} — ${booking.customerName}`}
                      className={`block truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight sm:text-xs ${
                        STATUS_STYLES[booking.status].calendar
                      }`}
                      style={{ borderLeftColor: booking.carColor }}
                    >
                      <span className="font-medium">{booking.carName}</span>
                      <span className="hidden sm:inline">
                        {" "}
                        · {booking.customerName}
                      </span>
                    </Link>
                  ))}
                  {dayBookings.length > 3 ? (
                    <span className="block px-1 text-[10px] text-slate-400">
                      +{dayBookings.length - 3} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
