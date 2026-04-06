/// <reference types="node" />

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseSystemUrl = process.env.DATABASE_SYSTEM_URL;

if (!databaseSystemUrl) {
  throw new Error("DATABASE_SYSTEM_URL is required to run Drizzle.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use the SYSTEM role for migrations (bypasses RLS)
    url: databaseSystemUrl,
  },
  verbose: true,
  strict: true,
});
