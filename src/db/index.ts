import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string.",
  );
}

/**
 * Neon's serverless HTTP driver: every query is a stateless fetch, so there is
 * no TCP pool to exhaust when Vercel spins up hundreds of concurrent lambdas.
 * Use the *pooled* Neon connection string (host contains "-pooler").
 */
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export { schema };
