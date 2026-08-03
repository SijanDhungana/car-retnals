import assert from "node:assert/strict";
import { test } from "node:test";
import { calcBilling, calcRentalDays } from "../src/lib/billing.ts";
import { rangesOverlap } from "../src/lib/overlap.ts";

const at = (iso: string) => new Date(iso);

test("rental days round any partial day up to a full day", () => {
  assert.equal(
    calcRentalDays(at("2026-01-01T10:00:00Z"), at("2026-01-02T10:00:00Z")),
    1,
  );
  // 1 day 3 hours bills as 2 days.
  assert.equal(
    calcRentalDays(at("2026-01-01T10:00:00Z"), at("2026-01-02T13:00:00Z")),
    2,
  );
  assert.equal(
    calcRentalDays(at("2026-01-01T10:00:00Z"), at("2026-01-04T10:00:01Z")),
    4,
  );
});

test("a rental is always at least one day", () => {
  assert.equal(
    calcRentalDays(at("2026-01-01T10:00:00Z"), at("2026-01-01T12:00:00Z")),
    1,
  );
  // Degenerate/backwards ranges are rejected at validation time; the billing
  // module still must not return zero or a negative day count.
  assert.equal(
    calcRentalDays(at("2026-01-02T10:00:00Z"), at("2026-01-01T10:00:00Z")),
    1,
  );
});

test("billing is pending until the ending km is recorded", () => {
  const billing = calcBilling({
    startAt: at("2026-01-01T10:00:00Z"),
    endAt: at("2026-01-03T10:00:00Z"),
    startKm: 10_000,
    endKm: null,
    baseRate: 500,
  });

  assert.equal(billing.settled, false);
  assert.equal(billing.rentalDays, 2);
  assert.equal(billing.freeKm, 400);
  assert.equal(billing.kmDriven, null);
  assert.equal(billing.overageKm, null);
  assert.equal(billing.overageCharge, null);
  assert.equal(billing.total, 500);
});

test("no overage when driving stays inside the free allowance", () => {
  const billing = calcBilling({
    startAt: at("2026-01-01T10:00:00Z"),
    endAt: at("2026-01-03T10:00:00Z"),
    startKm: 10_000,
    endKm: 10_400,
    baseRate: 500,
  });

  assert.equal(billing.settled, true);
  assert.equal(billing.freeKm, 400);
  assert.equal(billing.kmDriven, 400);
  assert.equal(billing.overageKm, 0);
  assert.equal(billing.overageCharge, 0);
  assert.equal(billing.total, 500);
});

test("overage is charged at $1 per km beyond the allowance", () => {
  const billing = calcBilling({
    startAt: at("2026-01-01T10:00:00Z"),
    endAt: at("2026-01-03T10:00:00Z"),
    startKm: 10_000,
    endKm: 10_675,
    baseRate: 500,
  });

  assert.equal(billing.rentalDays, 2);
  assert.equal(billing.freeKm, 400);
  assert.equal(billing.kmDriven, 675);
  assert.equal(billing.overageKm, 275);
  assert.equal(billing.overageCharge, 275);
  assert.equal(billing.total, 775);
});

test("a partial day earns a full extra day of free km", () => {
  // 1 day 3 hours → 2 rental days → 400 free km, so 350 km driven is free.
  const billing = calcBilling({
    startAt: at("2026-01-01T10:00:00Z"),
    endAt: at("2026-01-02T13:00:00Z"),
    startKm: 500,
    endKm: 850,
    baseRate: 250,
  });

  assert.equal(billing.rentalDays, 2);
  assert.equal(billing.freeKm, 400);
  assert.equal(billing.overageKm, 0);
  assert.equal(billing.total, 250);
});

test("money totals round to whole cents", () => {
  const billing = calcBilling({
    startAt: at("2026-01-01T00:00:00Z"),
    endAt: at("2026-01-02T00:00:00Z"),
    startKm: 0,
    endKm: 210,
    baseRate: 199.99,
  });

  assert.equal(billing.overageKm, 10);
  assert.equal(billing.total, 209.99);
});

test("overlap detection allows touching boundaries", () => {
  const aStart = at("2026-01-01T10:00:00Z");
  const aEnd = at("2026-01-03T10:00:00Z");

  // Same-day turnaround: starts exactly when the other ends.
  assert.equal(
    rangesOverlap(aStart, aEnd, aEnd, at("2026-01-05T10:00:00Z")),
    false,
  );
  // Ends exactly when the other starts.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2025-12-30T10:00:00Z"), aStart),
    false,
  );
});

test("overlap detection catches every real clash", () => {
  const aStart = at("2026-01-01T10:00:00Z");
  const aEnd = at("2026-01-05T10:00:00Z");

  // Fully contained.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2026-01-02T00:00:00Z"), at("2026-01-03T00:00:00Z")),
    true,
  );
  // Straddles the start.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2025-12-31T00:00:00Z"), at("2026-01-02T00:00:00Z")),
    true,
  );
  // Straddles the end.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2026-01-04T00:00:00Z"), at("2026-01-09T00:00:00Z")),
    true,
  );
  // Encloses the whole booking.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2025-12-01T00:00:00Z"), at("2026-02-01T00:00:00Z")),
    true,
  );
  // Overlaps by a single minute.
  assert.equal(
    rangesOverlap(aStart, aEnd, at("2026-01-05T09:59:00Z"), at("2026-01-06T00:00:00Z")),
    true,
  );
});
