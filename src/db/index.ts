import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

/**
 * Neon's serverless HTTP driver: every query is a stateless fetch, so there is
 * no TCP pool to exhaust when Vercel spins up hundreds of concurrent lambdas.
 * Use the *pooled* Neon connection string (host contains "-pooler").
 */
function getDb(): Database {
  if (instance) return instance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Locally, copy .env.example to .env.local and " +
        "fill in your Neon connection string. On Vercel, add it under " +
        "Project Settings → Environment Variables.",
    );
  }

  instance = drizzle(neon(connectionString), { schema });
  return instance;
}

/**
 * The connection is created on first use rather than at import time.
 *
 * `next build` evaluates every route module while collecting page data, so
 * connecting eagerly would make DATABASE_URL a *build-time* requirement and
 * fail the deploy before the app ever runs. Queries still fail loudly at
 * runtime if the variable is missing.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[property];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
