import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars } from "@/db/schema";
import { CalendarView, type CalendarBooking } from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Calendar — Fleet Rentals" };

export default async function CalendarPage() {
  const [rows, fleet] = await Promise.all([
    db
      .select({ booking: bookings, car: cars })
      .from(bookings)
      .innerJoin(cars, eq(bookings.carId, cars.id))
      .orderBy(asc(bookings.startAt)),
    db.select().from(cars).orderBy(asc(cars.sortOrder), asc(cars.name)),
  ]);

  const calendarBookings: CalendarBooking[] = rows.map(({ booking, car }) => ({
    id: booking.id,
    carId: car.id,
    carName: car.name,
    carColor: car.displayColor,
    customerName: booking.customerName,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Every booking across the fleet. Filter by car, colour-coded by status.
        </p>
      </div>

      <CalendarView
        bookings={calendarBookings}
        cars={fleet.map((car) => ({
          id: car.id,
          name: car.name,
          displayColor: car.displayColor,
        }))}
        initialMonth={new Date().toISOString()}
      />
    </div>
  );
}
