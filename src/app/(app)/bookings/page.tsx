import Link from "next/link";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars, type BookingStatus } from "@/db/schema";
import { DateTime } from "@/components/DateTime";
import { StatusBadge } from "@/components/StatusBadge";
import { calcBilling, formatMoney } from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bookings — Fleet Rentals" };

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "RESERVED", label: "Reserved" },
  { value: "ACTIVE", label: "Active" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

const VALID_STATUSES: BookingStatus[] = [
  "RESERVED",
  "ACTIVE",
  "RETURNED",
  "CANCELLED",
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; car?: string }>;
}) {
  const params = await searchParams;

  const statusFilter = VALID_STATUSES.includes(params.status as BookingStatus)
    ? (params.status as BookingStatus)
    : undefined;
  const carFilter = params.car || undefined;

  const filters: (SQL | undefined)[] = [
    statusFilter ? eq(bookings.status, statusFilter) : undefined,
    carFilter ? eq(bookings.carId, carFilter) : undefined,
  ];

  const [rows, fleet] = await Promise.all([
    db
      .select({ booking: bookings, car: cars })
      .from(bookings)
      .innerJoin(cars, eq(bookings.carId, cars.id))
      .where(and(...filters))
      .orderBy(desc(bookings.startAt))
      .limit(200),
    db.select().from(cars).orderBy(asc(cars.sortOrder), asc(cars.name)),
  ]);

  const buildHref = (next: { status?: string; car?: string }) => {
    const query = new URLSearchParams();
    const status = next.status ?? statusFilter ?? "";
    const car = next.car ?? carFilter ?? "";
    if (status) query.set("status", status);
    if (car) query.set("car", car);
    const qs = query.toString();
    return qs ? `/bookings?${qs}` : "/bookings";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
        <Link href="/bookings/new" className="btn-primary">
          New booking
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (statusFilter ?? "") === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={buildHref({ status: filter.value })}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}

        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

        <Link
          href={buildHref({ car: "" })}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            !carFilter
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
          }`}
        >
          All cars
        </Link>
        {fleet.map((car) => (
          <Link
            key={car.id}
            href={buildHref({ car: car.id })}
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
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-slate-500">
            No bookings match this filter.
          </p>
          <Link href="/bookings/new" className="btn-primary mt-4">
            Create the first booking
          </Link>
        </div>
      ) : (
        <>
          {/* Table on desktop */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Car</th>
                  <th className="px-4 py-2 font-medium">Customer</th>
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ booking, car }) => {
                  const billing = calcBilling({
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    startKm: booking.startKm,
                    endKm: booking.endKm,
                    baseRate: Number(booking.baseRate),
                  });

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/bookings/${booking.id}`}
                          className="flex items-center gap-2 font-medium text-slate-900"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: car.displayColor }}
                          />
                          {car.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-900">
                          {booking.customerName}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {booking.customerPhone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <DateTime value={booking.startAt} />
                        <span className="mx-1 text-slate-300">→</span>
                        <DateTime value={booking.endAt} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={booking.status} short />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {billing.settled ? (
                          <span className="font-medium text-slate-900">
                            {formatMoney(billing.total)}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">
                            pending return
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards on mobile */}
          <ul className="space-y-3 md:hidden">
            {rows.map(({ booking, car }) => {
              const billing = calcBilling({
                startAt: booking.startAt,
                endAt: booking.endAt,
                startKm: booking.startKm,
                endKm: booking.endKm,
                baseRate: Number(booking.baseRate),
              });

              return (
                <li key={booking.id}>
                  <Link href={`/bookings/${booking.id}`} className="card block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: car.displayColor }}
                        />
                        <span className="font-medium text-slate-900">
                          {car.name}
                        </span>
                      </div>
                      <StatusBadge status={booking.status} short />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {booking.customerName} · {booking.customerPhone}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      <DateTime value={booking.startAt} />
                      <span className="mx-1 text-slate-300">→</span>
                      <DateTime value={booking.endAt} />
                    </p>
                    <p className="mt-2 text-sm">
                      {billing.settled ? (
                        <span className="font-medium text-slate-900">
                          {formatMoney(billing.total)}
                        </span>
                      ) : (
                        <span className="text-amber-600">pending return</span>
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
