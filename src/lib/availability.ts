import { and, asc, eq, gt, lt, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookings, cars, type Booking, type Car } from "@/db/schema";

export { rangesOverlap } from "./overlap";

/**
 * SQL predicate matching bookings that block the given window — the database
 * expression of the same rule as `rangesOverlap`. Cancelled bookings never
 * block anything.
 */
function blockingOverlap(startAt: Date, endAt: Date): SQL | undefined {
  return and(
    ne(bookings.status, "CANCELLED"),
    lt(bookings.startAt, endAt),
    gt(bookings.endAt, startAt),
  );
}

export type ConflictingBooking = Booking & { car: Car };

/**
 * Every non-cancelled booking for `carId` that overlaps the window.
 * Pass `excludeBookingId` when editing so a booking never conflicts with itself.
 */
export async function findConflicts({
  carId,
  startAt,
  endAt,
  excludeBookingId,
}: {
  carId: string;
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
}): Promise<ConflictingBooking[]> {
  const rows = await db
    .select({ booking: bookings, car: cars })
    .from(bookings)
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .where(
      and(
        eq(bookings.carId, carId),
        blockingOverlap(startAt, endAt),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
      ),
    )
    .orderBy(asc(bookings.startAt));

  return rows.map((row) => ({ ...row.booking, car: row.car }));
}

export type CarAvailability = {
  car: Car;
  available: boolean;
  conflicts: ConflictingBooking[];
};

/**
 * Availability for the whole fleet across a window — powers both the
 * availability page and the "free today" half of the dashboard.
 */
export async function getFleetAvailability(
  startAt: Date,
  endAt: Date,
): Promise<CarAvailability[]> {
  const [fleet, overlapping] = await Promise.all([
    db.select().from(cars).orderBy(asc(cars.sortOrder), asc(cars.name)),
    db
      .select({ booking: bookings, car: cars })
      .from(bookings)
      .innerJoin(cars, eq(bookings.carId, cars.id))
      .where(blockingOverlap(startAt, endAt))
      .orderBy(asc(bookings.startAt)),
  ]);

  const byCar = new Map<string, ConflictingBooking[]>();
  for (const row of overlapping) {
    const list = byCar.get(row.booking.carId) ?? [];
    list.push({ ...row.booking, car: row.car });
    byCar.set(row.booking.carId, list);
  }

  return fleet.map((car) => {
    const conflicts = byCar.get(car.id) ?? [];
    return { car, available: conflicts.length === 0, conflicts };
  });
}

/**
 * Bookings that are on the road right now: status ACTIVE, or RESERVED with a
 * window that already contains the current moment.
 */
export async function getOutNow(now = new Date()) {
  const rows = await db
    .select({ booking: bookings, car: cars })
    .from(bookings)
    .innerJoin(cars, eq(bookings.carId, cars.id))
    .where(
      and(
        or(eq(bookings.status, "ACTIVE"), eq(bookings.status, "RESERVED")),
        lt(bookings.startAt, now),
        gt(bookings.endAt, now),
      ),
    )
    .orderBy(asc(bookings.endAt));

  return rows.map((row) => ({ ...row.booking, car: row.car }));
}
