ALTER TABLE "food_orders" ALTER COLUMN "location" DROP DEFAULT;--> statement-breakpoint
-- Orders sent before locations existed (live 2026-10-22 12:14 UTC) were all
-- filed under Pickering by the old default. Their real shop is unknown, so
-- take them out of both shops' lists.
UPDATE "food_orders" SET "location" = 'unknown' WHERE "created_at" < '2026-10-22T12:14:00Z';
