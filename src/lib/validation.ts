import { z } from "zod";

const optionalInt = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .transform((value) => (value === "" ? null : Number(value)))
  .refine((value) => value === null || Number.isFinite(value), {
    message: "Must be a number",
  })
  .refine((value) => value === null || Number.isInteger(value), {
    message: "Must be a whole number",
  })
  .refine((value) => value === null || value >= 0, {
    message: "Cannot be negative",
  });

const requiredInt = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .refine((value) => value !== "", { message: "Required" })
  .transform((value) => Number(value))
  .refine((value) => Number.isInteger(value) && value >= 0, {
    message: "Must be a whole number of kilometres",
  });

const dateTime = z
  .string()
  .min(1, "Required")
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), {
    message: "Invalid date/time",
  });

export const bookingSchema = z
  .object({
    carId: z.string().uuid("Pick a car"),
    customerName: z.string().trim().min(1, "Customer name is required").max(120),
    customerPhone: z
      .string()
      .trim()
      .min(5, "Phone number is required")
      .max(40)
      .regex(/^[0-9+()\-.\s]+$/, "Phone can only contain digits and + ( ) - ."),
    startAt: dateTime,
    endAt: dateTime,
    startKm: requiredInt,
    endKm: optionalInt,
    baseRate: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === "string" ? value.trim() : value))
      .transform((value) => (value === "" ? 0 : Number(value)))
      .refine((value) => Number.isFinite(value) && value >= 0, {
        message: "Base rate must be zero or more",
      }),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => (value ? value : null)),
    status: z.enum(["RESERVED", "ACTIVE", "RETURNED", "CANCELLED"]),
  })
  .refine((data) => data.endAt.getTime() > data.startAt.getTime(), {
    message: "End date/time must be after the start date/time",
    path: ["endAt"],
  })
  .refine(
    (data) => data.endKm === null || data.endKm >= data.startKm,
    {
      message: "Ending km must be greater than or equal to starting km",
      path: ["endKm"],
    },
  )
  .refine((data) => data.status !== "RETURNED" || data.endKm !== null, {
    message: "Enter the ending km before marking a booking as returned",
    path: ["endKm"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const dateRangeSchema = z
  .object({ from: dateTime, to: dateTime })
  .refine((data) => data.to.getTime() > data.from.getTime(), {
    message: "The end of the range must be after the start",
    path: ["to"],
  });

/** Flattens a ZodError into the `{ field: message }` shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
