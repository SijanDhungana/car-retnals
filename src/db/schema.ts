import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STAFF"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "RESERVED",
  "ACTIVE",
  "RETURNED",
  "CANCELLED",
]);

/**
 * Staff accounts. There is no public signup — rows are created by the seed
 * script (or by an admin directly in the database).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: userRoleEnum("role").notNull().default("STAFF"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

/** The fixed fleet. Seeded once; staff do not add cars through the UI. */
export const cars = pgTable(
  "cars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    color: text("color"),
    plate: text("plate"),
    /** Hex colour used to tint this car's blocks in the calendar view. */
    displayColor: text("display_color").notNull().default("#64748b"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("cars_slug_unique").on(table.slug)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    carId: uuid("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "restrict" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    startKm: integer("start_km").notNull(),
    /** Null until the car is returned; billing stays "pending" while null. */
    endKm: integer("end_km"),
    /** Agreed base price for the whole booking, before km overage. */
    baseRate: numeric("base_rate", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    status: bookingStatusEnum("status").notNull().default("RESERVED"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bookings_car_range_idx").on(table.carId, table.startAt, table.endAt),
    index("bookings_status_idx").on(table.status),
    index("bookings_start_at_idx").on(table.startAt),
  ],
);

/**
 * Food call system: orders sent from the downstairs savoury kitchen to the
 * counter. Public (no login) — see `src/app/food`. Serial id so the receiving
 * screen can poll for "everything after the last id I saw".
 */
export const foodOrders = pgTable(
  "food_orders",
  {
    id: serial("id").primaryKey(),
    /** "order" (menu item) or "message" (free text typed downstairs). */
    kind: text("kind").notNull().default("order"),
    item: text("item").notNull(),
    quantity: integer("quantity").notNull().default(1),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("food_orders_created_at_idx").on(table.createdAt)],
);

export const carsRelations = relations(cars, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  car: one(cars, { fields: [bookings.carId], references: [cars.id] }),
  createdBy: one(users, {
    fields: [bookings.createdById],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Car = typeof cars.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type FoodOrder = typeof foodOrders.$inferSelect;
