import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cars } from "@/db/schema";
import { BookingForm } from "@/components/BookingForm";
import { createBooking } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "New booking — Fleet Rentals" };

export default async function NewBookingPage() {
  const fleet = await db
    .select()
    .from(cars)
    .where(eq(cars.active, 1))
    .orderBy(asc(cars.sortOrder), asc(cars.name));

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/bookings"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Bookings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          New booking
        </h1>
      </div>

      <BookingForm
        cars={fleet}
        action={createBooking}
        submitLabel="Create booking"
        cancelHref="/bookings"
      />
    </div>
  );
}
