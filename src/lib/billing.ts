import {
  CURRENCY,
  FREE_KM_PER_DAY,
  MS_PER_DAY,
  OVERAGE_RATE_PER_KM,
} from "./settings";

export type BillingInput = {
  startAt: Date;
  endAt: Date;
  startKm: number;
  /** null until the car comes back and staff record the odometer. */
  endKm: number | null;
  /** Agreed base rental price for the whole booking, in dollars. */
  baseRate: number;
};

export type BillingBreakdown = {
  rentalDays: number;
  freeKm: number;
  baseRate: number;
  /** False until `endKm` is recorded — the UI shows "pending return". */
  settled: boolean;
  kmDriven: number | null;
  overageKm: number | null;
  overageCharge: number | null;
  /** Base rate plus overage. Equals the base rate while unsettled. */
  total: number;
};

/**
 * Number of days a rental is billed for.
 *
 * Any partial day rounds UP to a full day (1 day 3 hours bills as 2 days) and
 * every rental bills at least 1 day, so a two-hour rental still gets one day's
 * free-km allowance.
 */
export function calcRentalDays(startAt: Date, endAt: Date): number {
  const ms = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

/** Rounds to whole cents, avoiding float dust like 40.99999999999999. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * The one place km-overage billing is computed. Pure and side-effect free, so
 * server actions, the booking detail page and the tests all agree by
 * construction.
 */
export function calcBilling(input: BillingInput): BillingBreakdown {
  const rentalDays = calcRentalDays(input.startAt, input.endAt);
  const freeKm = rentalDays * FREE_KM_PER_DAY;
  const baseRate = round2(input.baseRate);

  if (input.endKm === null || input.endKm === undefined) {
    return {
      rentalDays,
      freeKm,
      baseRate,
      settled: false,
      kmDriven: null,
      overageKm: null,
      overageCharge: null,
      total: baseRate,
    };
  }

  // Negative distance is rejected at validation time; clamp here as a belt-and-
  // braces guard so a bad row can never produce a negative charge.
  const kmDriven = Math.max(0, input.endKm - input.startKm);
  const overageKm = Math.max(0, kmDriven - freeKm);
  const overageCharge = round2(overageKm * OVERAGE_RATE_PER_KM);

  return {
    rentalDays,
    freeKm,
    baseRate,
    settled: true,
    kmDriven,
    overageKm,
    overageCharge,
    total: round2(baseRate + overageCharge),
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
  }).format(value);
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(value)} km`;
}
