import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import { cars, users } from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

/** The fixed fleet. `slug` is the stable key used for idempotent upserts. */
const FLEET = [
  {
    slug: "lamborghini-urus-yellow",
    name: "Yellow Lamborghini Urus",
    make: "Lamborghini",
    model: "Urus",
    color: "Yellow",
    displayColor: "#eab308",
    sortOrder: 1,
  },
  {
    slug: "lamborghini-urus-black",
    name: "Black Lamborghini Urus",
    make: "Lamborghini",
    model: "Urus",
    color: "Black",
    displayColor: "#1f2937",
    sortOrder: 2,
  },
  {
    slug: "mercedes-cls-53-amg",
    name: "Mercedes CLS 53 AMG",
    make: "Mercedes-Benz",
    model: "CLS 53 AMG",
    color: null,
    displayColor: "#0ea5e9",
    sortOrder: 3,
  },
  {
    slug: "bmw-330i-m-sport",
    name: "BMW 330i M Sport",
    make: "BMW",
    model: "330i M Sport",
    color: null,
    displayColor: "#8b5cf6",
    sortOrder: 4,
  },
  {
    slug: "bmw-m340i",
    name: "BMW M340i",
    make: "BMW",
    model: "M340i",
    color: null,
    displayColor: "#ef4444",
    sortOrder: 5,
  },
  {
    slug: "hyundai-elantra",
    name: "Hyundai Elantra",
    make: "Hyundai",
    model: "Elantra",
    color: null,
    displayColor: "#10b981",
    sortOrder: 6,
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — cannot seed.");

  const db = drizzle(neon(url));

  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL || "admin@example.com"
  ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123";
  const adminName = process.env.SEED_ADMIN_NAME || "Fleet Admin";

  console.log("Seeding fleet ...");
  for (const car of FLEET) {
    await db
      .insert(cars)
      .values({ ...car, active: 1 })
      .onConflictDoUpdate({
        target: cars.slug,
        set: {
          name: car.name,
          make: car.make,
          model: car.model,
          color: car.color,
          displayColor: car.displayColor,
          sortOrder: car.sortOrder,
        },
      });
    console.log(`  • ${car.name}`);
  }

  // The seed runs on every Vercel deploy, so by default it must never disturb
  // an account that already exists. Setting SEED_ADMIN_RESET_PASSWORD=true
  // opts into overwriting the password — that is the password-reset path.
  const resetPassword = process.env.SEED_ADMIN_RESET_PASSWORD === "true";

  console.log("Seeding admin account ...");
  const passwordHash = await hash(adminPassword, 10);
  const insert = db.insert(users).values({
    email: adminEmail,
    passwordHash,
    name: adminName,
    role: "ADMIN",
  });

  await (resetPassword
    ? insert.onConflictDoUpdate({
        target: users.email,
        set: { passwordHash, name: adminName, role: "ADMIN" },
      })
    : insert.onConflictDoNothing({ target: users.email }));

  // The password is deliberately not logged: this output ends up in Vercel's
  // build logs.
  console.log(`\nSeed complete.`);
  console.log(`  Login: ${adminEmail}`);
  console.log(
    resetPassword
      ? "  Password was reset to the current SEED_ADMIN_PASSWORD."
      : "  Password: unchanged if the account already existed, otherwise SEED_ADMIN_PASSWORD.",
  );
  console.log("");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
