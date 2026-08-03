import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars } from "@/db/schema";
import { BookingForm } from "@/components/BookingForm";
import { updateBooking, type BookingFormState } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit booking — Fleet Rentals" };

export default async function EditBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ needEndKm?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [[booking], fleet] = await Promise.all([
    db.select().from(bookings).where(eq(bookings.id, id)).limit(1),
    db.select().from(cars).orderBy(asc(cars.sortOrder), asc(cars.name)),
  ]);

  if (!booking) notFound();

  const action = async (
    prev: BookingFormState,
    formData: FormData,
  ): Promise<BookingFormState> => {
    "use server";
    return updateBooking(id, prev, formData);
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/bookings/${id}`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Booking
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Edit booking
        </h1>
      </div>

      {query.needEndKm ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Enter the ending km before marking this booking as returned.
        </div>
      ) : null}

      <BookingForm
        cars={fleet}
        booking={booking}
        action={action}
        submitLabel="Save changes"
        cancelHref={`/bookings/${id}`}
        highlightEndKm={Boolean(query.needEndKm)}
      />
    </div>
  );
}
