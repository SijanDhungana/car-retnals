CREATE TABLE "food_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "food_orders_created_at_idx" ON "food_orders" USING btree ("created_at");