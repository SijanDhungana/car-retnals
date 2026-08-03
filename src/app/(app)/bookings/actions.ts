"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { requireSession } from "@/auth";
import { findConflicts } from "@/lib/availability";
import { bookingSchema, fieldErrors } from "@/lib/validation";

export type BookingFormState = {
  errors?: Record<string, string>;
  /** Human-readable summary of the clashing bookings, if any. */
  conflict?: string;
  /**
   * The values that were submitted, echoed back so a rejected form keeps what
   * staff typed. React resets uncontrolled fields once a form action settles,
   * so these are re-applied as the fields' defaults.
   */
  values?: Record<string, string>;
};

function readForm(formData: FormData) {
  return {
    carId: String(formData.get("carId") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    startAt: String(formData.get("startAt") ?? ""),
    endAt: String(formData.get("endAt") ?? ""),
    startKm: String(formData.get("startKm") ?? ""),
    endKm: String(formData.get("endKm") ?? ""),
    baseRate: String(formData.get("baseRate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    status: String(formData.get("status") ?? "RESERVED"),
  };
}

function describeConflicts(
  conflicts: Awaited<ReturnType<typeof findConflicts>>,
): string {
  const list = conflicts
    .map((c) => {
      const from = c.startAt.toISOString().slice(0, 16).replace("T", " ");
      const to = c.endAt.toISOString().slice(0, 16).replace("T", " ");
      return `${c.customerName} (${from} → ${to} UTC)`;
    })
    .join("; ");

  return `${conflicts[0].car.name} is already booked for that period: ${list}. Pick another car or a different time.`;
}

/**
 * Postgres raises 23P01 when the exclusion constraint rejects an overlap. That
 * is the race-condition backstop for two staff booking the same car at once —
 * the application-level check above catches the ordinary case.
 */
function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23P01"
  );
}

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const session = await requireSession();

  const raw = readForm(formData);
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }
  const data = parsed.data;

  if (data.status !== "CANCELLED") {
    const conflicts = await findConflicts({
      carId: data.carId,
      startAt: data.startAt,
      endAt: data.endAt,
    });
    if (conflicts.length > 0) {
      return { conflict: describeConflicts(conflicts), values: raw };
    }
  }

  let newId: string;
  try {
    const [row] = await db
      .insert(bookings)
      .values({
        carId: data.carId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        startAt: data.startAt,
        endAt: data.endAt,
        startKm: data.startKm,
        endKm: data.endKm,
        baseRate: data.baseRate.toFixed(2),
        notes: data.notes,
        status: data.status,
        createdById: session.user.id,
      })
      .returning({ id: bookings.id });
    newId = row.id;
  } catch (error) {
    if (isExclusionViolation(error)) {
      return {
        conflict:
          "That car was booked for an overlapping period by someone else a moment ago. Reload and try a different slot.",
        values: raw,
      };
    }
    throw error;
  }

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/availability");
  redirect(`/bookings/${newId}`);
}

export async function updateBooking(
  id: string,
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireSession();

  const raw = readForm(formData);
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values: raw };
  }
  const data = parsed.data;

  if (data.status !== "CANCELLED") {
    const conflicts = await findConflicts({
      carId: data.carId,
      startAt: data.startAt,
      endAt: data.endAt,
      excludeBookingId: id,
    });
    if (conflicts.length > 0) {
      return { conflict: describeConflicts(conflicts), values: raw };
    }
  }

  try {
    await db
      .update(bookings)
      .set({
        carId: data.carId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        startAt: data.startAt,
        endAt: data.endAt,
        startKm: data.startKm,
        endKm: data.endKm,
        baseRate: data.baseRate.toFixed(2),
        notes: data.notes,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, id));
  } catch (error) {
    if (isExclusionViolation(error)) {
      return {
        conflict:
          "That change would overlap another booking for the same car. Reload and try a different slot.",
        values: raw,
      };
    }
    throw error;
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/availability");
  redirect(`/bookings/${id}`);
}

export async function deleteBooking(formData: FormData) {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.delete(bookings).where(eq(bookings.id, id));

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/availability");
  redirect("/bookings");
}

/** One-click status change from the booking detail page. */
export async function setBookingStatus(formData: FormData) {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;

  if (!["RESERVED", "ACTIVE", "RETURNED", "CANCELLED"].includes(status)) {
    return;
  }

  // Returning a car requires the closing odometer reading, otherwise the
  // overage can never be computed.
  if (status === "RETURNED") {
    const [existing] = await db
      .select({ endKm: bookings.endKm })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (!existing || existing.endKm === null) {
      redirect(`/bookings/${id}/edit?needEndKm=1`);
    }
  }

  await db
    .update(bookings)
    .set({ status: status as never, updatedAt: new Date() })
    .where(eq(bookings.id, id));

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  revalidatePath("/availability");
}
