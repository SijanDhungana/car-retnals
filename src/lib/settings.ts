/**
 * Single source of truth for the rental business rules.
 *
 * Nothing else in the app may hardcode the free-km allowance or the overage
 * rate — import from here so a pricing change is a one-line edit (or an env
 * var change) rather than a search-and-replace.
 *
 * These are read from NEXT_PUBLIC_* vars so the same numbers are available in
 * server components, server actions and client-side previews without a second
 * definition drifting out of sync.
 */

function numberFromEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Kilometres included free of charge, per rental day. */
export const FREE_KM_PER_DAY = numberFromEnv(
  process.env.NEXT_PUBLIC_FREE_KM_PER_DAY,
  200,
);

/** Dollars charged per kilometre driven beyond the free allowance. */
export const OVERAGE_RATE_PER_KM = numberFromEnv(
  process.env.NEXT_PUBLIC_OVERAGE_RATE_PER_KM,
  1.0,
);

/** ISO 4217 code used for all money formatting. */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

/** Milliseconds in one rental day. Used by the rental-days rounding rule. */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SETTINGS = {
  freeKmPerDay: FREE_KM_PER_DAY,
  overageRatePerKm: OVERAGE_RATE_PER_KM,
  currency: CURRENCY,
} as const;
