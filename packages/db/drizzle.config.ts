import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use the SYSTEM role for migrations (bypasses RLS)
    url: process.env.DATABASE_SYSTEM_URL!,
  },
  verbose: true,
  strict: true,
});