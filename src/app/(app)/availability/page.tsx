import Link from "next/link";
import { getFleetAvailability } from "@/lib/availability";
import { DateTime } from "@/components/DateTime";
import { StatusBadge } from "@/components/StatusBadge";
import {
  addDays,
  endOfDay,
  parseDateInput,
  startOfDay,
  toDateInputValue,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = { title: "Availability — Fleet Rentals" };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  const today = new Date();
  const from = (params.from && parseDateInput(params.from)) || today;
  const to = (params.to && parseDateInput(params.to)) || addDays(today, 2);

  // A backwards range would silently match nothing; clamp it instead.
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to < from ? from : to);

  const availability = await getFleetAvailability(rangeStart, rangeEnd);
  const freeCount = availability.filter((entry) => entry.available).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Availability</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Pick a date range to see which cars are free for the whole period.
        </p>
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-40 flex-1">
          <label htmlFor="from" className="field-label">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={toDateInputValue(from)}
            className="field-input"
          />
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="to" className="field-label">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={toDateInputValue(to)}
            className="field-input"
          />
        </div>
        <button type="submit" className="btn-primary">
          Check
        </button>
      </form>

      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{freeCount}</span> of{" "}
        {availability.length} cars are free for the entire period{" "}
        <DateTime value={rangeStart} dateOnly /> –{" "}
        <DateTime value={rangeEnd} dateOnly />.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {availability.map(({ car, available, conflicts }) => (
          <li
            key={car.id}
            className={`card p-4 ${
              available ? "border-emerald-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: car.displayColor }}
                />
                <span className="font-medium text-slate-900">{car.name}</span>
              </div>

              {available ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Available
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                  Taken
                </span>
              )}
            </div>

            {available ? (
              <Link
                href={`/bookings/new`}
                className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Book this car →
              </Link>
            ) : (
              <ul className="mt-3 space-y-2">
                {conflicts.map((conflict) => (
                  <li key={conflict.id}>
                    <Link
                      href={`/bookings/${conflict.id}`}
                      className="block rounded-lg bg-slate-50 px-3 py-2 text-sm transition hover:bg-slate-100"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-slate-900">
                          {conflict.customerName}
                        </span>
                        <StatusBadge status={conflict.status} short />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <DateTime value={conflict.startAt} />
                        <span className="mx-1 text-slate-300">→</span>
                        <DateTime value={conflict.endAt} />
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
