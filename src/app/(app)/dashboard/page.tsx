import Link from "next/link";
import { asc, eq, gt, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars } from "@/db/schema";
import { getFleetAvailability, getOutNow } from "@/lib/availability";
import { DateTime } from "@/components/DateTime";
import { StatusBadge } from "@/components/StatusBadge";
import { endOfDay, startOfDay } from "@/lib/dates";
import { formatKm } from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard — Fleet Rentals" };

export default async function DashboardPage() {
  const now = new Date();

  const [outNow, todayAvailability, upcoming] = await Promise.all([
    getOutNow(now),
    getFleetAvailability(startOfDay(now), endOfDay(now)),
    db
      .select({ booking: bookings, car: cars })
      .from(bookings)
      .innerJoin(cars, eq(bookings.carId, cars.id))
      .where(and(gt(bookings.startAt, now), ne(bookings.status, "CANCELLED")))
      .orderBy(asc(bookings.startAt))
      .limit(6),
  ]);

  const freeToday = todayAvailability.filter((entry) => entry.available);
  const busyToday = todayAvailability.filter((entry) => !entry.available);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Fleet status for <DateTime value={now} dateOnly />
          </p>
        </div>
        <Link href="/bookings/new" className="btn-primary">
          New booking
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Out right now</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {outNow.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Free today</p>
          <p className="mt-1 text-3xl font-semibold text-emerald-600">
            {freeToday.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Fleet size</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {todayAvailability.length}
          </p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Rented out right now
          </h2>
        </header>

        {outNow.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No cars are out at the moment.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {outNow.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings/${booking.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: booking.car.displayColor }}
                      />
                      <span className="truncate font-medium text-slate-900">
                        {booking.car.name}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {booking.customerName} · {booking.customerPhone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">
                      due <DateTime value={booking.endAt} />
                    </span>
                    <StatusBadge status={booking.status} short />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Available today
            </h2>
          </header>

          {freeToday.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Every car is booked at some point today.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {freeToday.map(({ car }) => (
                <li
                  key={car.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: car.displayColor }}
                    />
                    <span className="text-sm font-medium text-slate-900">
                      {car.name}
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Free
                  </span>
                </li>
              ))}
            </ul>
          )}

          {busyToday.length > 0 ? (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Booked today
              </p>
              <ul className="mt-2 space-y-1">
                {busyToday.map(({ car, conflicts }) => (
                  <li
                    key={car.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-600">{car.name}</span>
                    <span className="text-slate-400">
                      {conflicts.length}{" "}
                      {conflicts.length === 1 ? "booking" : "bookings"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Coming up next
            </h2>
          </header>

          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Nothing scheduled yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map(({ booking, car }) => (
                <li key={booking.id}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="block px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-900">
                        {car.name}
                      </span>
                      <StatusBadge status={booking.status} short />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {booking.customerName} · <DateTime value={booking.startAt} />{" "}
                      · from {formatKm(booking.startKm)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
