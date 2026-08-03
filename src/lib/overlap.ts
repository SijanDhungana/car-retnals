/**
 * The double-booking rule, kept free of any database import so it can be used
 * from the client, the server and the tests alike.
 *
 * Two bookings overlap when each starts strictly before the other ends. The
 * strict comparison means touching boundaries do NOT conflict: a booking may
 * start at exactly the moment another ends, which is what makes same-day
 * turnarounds possible.
 *
 * This mirrors the `[)` bounds of the `bookings_no_overlap_per_car` exclusion
 * constraint in the database — change one and you must change the other.
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}
