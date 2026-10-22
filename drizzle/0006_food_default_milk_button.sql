-- Replace the request buttons made while testing with one "Milk" button per shop.
DELETE FROM "food_request_buttons";
--> statement-breakpoint
INSERT INTO "food_request_buttons" ("location", "label") VALUES ('pickering', 'Milk'), ('scarborough', 'Milk');
