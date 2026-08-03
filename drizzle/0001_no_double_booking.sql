-- Database-level guarantee that a car is never double-booked.
--
-- The server action checks for conflicts before writing, but two staff members
-- submitting at the same instant could both pass that check. This exclusion
-- constraint makes the overlap physically impossible.
--
-- '[)' bounds mean start-inclusive / end-exclusive, so a booking may begin at
-- exactly the moment another ends — that is what allows same-day turnarounds.
-- Cancelled bookings are excluded from the constraint so a cancelled slot is
-- immediately reusable.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap_per_car"
  EXCLUDE USING gist (
    "car_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_end_after_start" CHECK ("end_at" > "start_at");
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_end_km_gte_start_km"
  CHECK ("end_km" IS NULL OR "end_km" >= "start_km");
