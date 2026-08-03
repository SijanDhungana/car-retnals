"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Booking, Car } from "@/db/schema";
import { calcBilling } from "@/lib/billing";
import { toDateTimeLocalValue } from "@/lib/dates";
import { KmBreakdown } from "@/components/KmBreakdown";
import type { BookingFormState } from "@/app/(app)/bookings/actions";

type Props = {
  cars: Car[];
  booking?: Booking;
  action: (
    prev: BookingFormState,
    formData: FormData,
  ) => Promise<BookingFormState>;
  submitLabel: string;
  cancelHref: string;
  /** Set when staff were sent here because a return needs its closing km. */
  highlightEndKm?: boolean;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

const STATUS_OPTIONS = [
  { value: "RESERVED", label: "Reserved" },
  { value: "ACTIVE", label: "Active — out now" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type FormValues = {
  carId: string;
  customerName: string;
  customerPhone: string;
  startAt: string;
  endAt: string;
  startKm: string;
  endKm: string;
  baseRate: string;
  notes: string;
  status: string;
};

function initialValues(booking?: Booking): FormValues {
  return {
    carId: booking?.carId ?? "",
    customerName: booking?.customerName ?? "",
    customerPhone: booking?.customerPhone ?? "",
    startAt: booking ? toDateTimeLocalValue(booking.startAt) : "",
    endAt: booking ? toDateTimeLocalValue(booking.endAt) : "",
    startKm: booking ? String(booking.startKm) : "",
    endKm:
      booking?.endKm !== null && booking?.endKm !== undefined
        ? String(booking.endKm)
        : "",
    baseRate: booking ? String(Number(booking.baseRate)) : "",
    notes: booking?.notes ?? "",
    status: booking?.status ?? "RESERVED",
  };
}

export function BookingForm({
  cars,
  booking,
  action,
  submitLabel,
  cancelHref,
  highlightEndKm = false,
}: Props) {
  const [state, formAction] = useActionState<BookingFormState, FormData>(
    action,
    {},
  );

  /**
   * Every field is controlled deliberately. React resets a form's DOM once a
   * form action settles, and an uncontrolled `<select>` loses its selection
   * because `defaultValue` never sets the `selected` attribute — so a blocked
   * double-booking would silently clear the chosen car. Controlled values are
   * re-applied from state on the post-action render, so nothing is lost.
   */
  const [values, setValues] = useState<FormValues>(() => initialValues(booking));

  const field =
    (key: keyof FormValues) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const preview = useMemo(() => {
    const start = new Date(values.startAt);
    const end = new Date(values.endAt);
    if (
      !values.startAt ||
      !values.endAt ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return null;
    }

    const startKm = Number(values.startKm);
    const endKm = values.endKm.trim() === "" ? null : Number(values.endKm);
    if (!Number.isFinite(startKm)) return null;
    if (endKm !== null && (!Number.isFinite(endKm) || endKm < startKm)) {
      return null;
    }

    return calcBilling({
      startAt: start,
      endAt: end,
      startKm,
      endKm,
      baseRate: Number(values.baseRate) || 0,
    });
  }, [values]);

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {state.conflict ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Double-booking blocked</p>
            <p className="mt-1">{state.conflict}</p>
          </div>
        ) : null}

        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Vehicle &amp; customer
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="carId" className="field-label">
                Car
              </label>
              <select
                id="carId"
                name="carId"
                value={values.carId}
                onChange={field("carId")}
                required
                className="field-input"
              >
                <option value="" disabled>
                  Select a car…
                </option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.name}
                  </option>
                ))}
              </select>
              {errors.carId ? (
                <p className="field-error">{errors.carId}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="customerName" className="field-label">
                Customer name
              </label>
              <input
                id="customerName"
                name="customerName"
                value={values.customerName}
                onChange={field("customerName")}
                required
                className="field-input"
                placeholder="Jane Doe"
              />
              {errors.customerName ? (
                <p className="field-error">{errors.customerName}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="customerPhone" className="field-label">
                Customer phone
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                value={values.customerPhone}
                onChange={field("customerPhone")}
                required
                className="field-input"
                placeholder="+1 555 010 2030"
              />
              {errors.customerPhone ? (
                <p className="field-error">{errors.customerPhone}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Rental period
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startAt" className="field-label">
                Start date &amp; time
              </label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                value={values.startAt}
                onChange={field("startAt")}
                required
                className="field-input"
              />
              {errors.startAt ? (
                <p className="field-error">{errors.startAt}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="endAt" className="field-label">
                End date &amp; time
              </label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                value={values.endAt}
                onChange={field("endAt")}
                required
                className="field-input"
              />
              {errors.endAt ? (
                <p className="field-error">{errors.endAt}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Odometer &amp; pricing
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="startKm" className="field-label">
                Starting km
              </label>
              <input
                id="startKm"
                name="startKm"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={values.startKm}
                onChange={field("startKm")}
                required
                className="field-input"
              />
              {errors.startKm ? (
                <p className="field-error">{errors.startKm}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="endKm" className="field-label">
                Ending km
                <span className="ml-1 font-normal text-slate-400">
                  (on return)
                </span>
              </label>
              <input
                id="endKm"
                name="endKm"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={values.endKm}
                onChange={field("endKm")}
                autoFocus={highlightEndKm}
                className={`field-input ${
                  highlightEndKm ? "border-amber-400 ring-2 ring-amber-200" : ""
                }`}
                placeholder="Leave blank until returned"
              />
              {errors.endKm ? (
                <p className="field-error">{errors.endKm}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="baseRate" className="field-label">
                Base rental price
              </label>
              <input
                id="baseRate"
                name="baseRate"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={values.baseRate}
                onChange={field("baseRate")}
                className="field-input"
                placeholder="0.00"
              />
              {errors.baseRate ? (
                <p className="field-error">{errors.baseRate}</p>
              ) : null}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="status" className="field-label">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={field("status")}
                className="field-input"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status ? (
                <p className="field-error">{errors.status}</p>
              ) : null}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="notes" className="field-label">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={values.notes}
                onChange={field("notes")}
                className="field-input"
                placeholder="Deposit taken, damage noted, delivery address…"
              />
              {errors.notes ? (
                <p className="field-error">{errors.notes}</p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <SubmitButton label={submitLabel} />
          <Link href={cancelHref} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          {preview ? (
            <KmBreakdown billing={preview} />
          ) : (
            <div className="card p-5 text-sm text-slate-500">
              Fill in the rental period and starting km to preview the charges.
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}
