import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars } from "@/db/schema";
import { calcBilling, formatKm } from "@/lib/billing";
import { DateTime } from "@/components/DateTime";
import { KmBreakdown } from "@/components/KmBreakdown";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteBooking, setBookingStatus } from "../actions";

export const dynamic = "force-dynamic";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select({ booking: bookings, car: cars })
    .from(bookings)
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!row) notFound();

  const { booking, car } = row;

  const billing = calcBilling({
    startAt: booking.startAt,
    endAt: booking.endAt,
    startKm: booking.startKm,
    endKm: booking.endKm,
    baseRate: Number(booking.baseRate),
  });

  const statusActions = (
    [
      { status: "ACTIVE", label: "Mark as out now" },
      { status: "RETURNED", label: "Mark as returned" },
      { status: "RESERVED", label: "Back to reserved" },
      { status: "CANCELLED", label: "Cancel booking" },
    ] as const
  ).filter((action) => action.status !== booking.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/bookings"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Bookings
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: car.displayColor }}
            />
            {car.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {booking.customerName} · {booking.customerPhone}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          <Link href={`/bookings/${booking.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Booking details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Pickup"
                value={<DateTime value={booking.startAt} />}
              />
              <Detail
                label="Return"
                value={<DateTime value={booking.endAt} />}
              />
              <Detail
                label="Starting km"
                value={formatKm(booking.startKm)}
              />
              <Detail
                label="Ending km"
                value={
                  booking.endKm === null ? (
                    <span className="text-amber-600">not recorded yet</span>
                  ) : (
                    formatKm(booking.endKm)
                  )
                }
              />
              <div className="sm:col-span-2">
                <Detail
                  label="Notes"
                  value={
                    booking.notes ? (
                      <span className="whitespace-pre-wrap">{booking.notes}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )
                  }
                />
              </div>
            </dl>
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Update status
            </h2>
            <div className="flex flex-wrap gap-2">
              {statusActions.map((action) => (
                <form key={action.status} action={setBookingStatus}>
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="status" value={action.status} />
                  <button
                    type="submit"
                    className={
                      action.status === "CANCELLED"
                        ? "btn-danger"
                        : "btn-secondary"
                    }
                  >
                    {action.label}
                  </button>
                </form>
              ))}
            </div>
            {booking.endKm === null ? (
              <p className="mt-3 text-xs text-slate-500">
                Marking this booking as returned requires the ending km — you
                will be taken to the edit form to enter it.
              </p>
            ) : null}
          </section>

          <section className="card border-red-100 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Delete booking
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Permanently removes this booking and its record. Cancelling is
              usually the better option.
            </p>
            <form action={deleteBooking} className="mt-3">
              <input type="hidden" name="id" value={booking.id} />
              <button type="submit" className="btn-danger">
                Delete permanently
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20">
            <KmBreakdown billing={billing} />
          </div>
        </div>
      </div>
    </div>
  );
}
