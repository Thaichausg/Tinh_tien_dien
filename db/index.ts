import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";

// Initialize Neon serverless HTTP client connection using environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is missing.");
}

const sql = neon(databaseUrl || "postgres://localhost:5432/placeholder");
export const db = drizzle(sql, { schema });
export type DbClient = typeof db;
export * from "../schema";
