CREATE TABLE "food_request_buttons" (
	"id" serial PRIMARY KEY NOT NULL,
	"location" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_orders" ADD COLUMN "location" text DEFAULT 'pickering' NOT NULL;--> statement-breakpoint
ALTER TABLE "food_orders" ADD COLUMN "target" text DEFAULT 'upstairs' NOT NULL;--> statement-breakpoint
CREATE INDEX "food_request_buttons_location_idx" ON "food_request_buttons" USING btree ("location");--> statement-breakpoint
CREATE INDEX "food_orders_feed_idx" ON "food_orders" USING btree ("location","target","id");