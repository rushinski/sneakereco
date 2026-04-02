import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  // Primary key: prefixed ULID, generated in application code
  id: text("id").primaryKey(),

  // Core fields
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").unique(),
  email: text("email").notNull(),
  phone: text("phone"),
  instagram: text("instagram"),
  businessName: text("business_name"),

  // Status
  status: text("status", {
    enum: ["active", "inactive", "suspended"],
  })
    .notNull()
    .default("inactive"),
  onboardingCompleted: boolean("onboarding_completed")
    .notNull()
    .default(false),

  // Timestamps
  opensAt: timestamp("opens_at", { withTimezone: true }),
  launchedAt: timestamp("launched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});