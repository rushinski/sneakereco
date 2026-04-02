CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"email" text NOT NULL,
	"phone" text,
	"instagram" text,
	"business_name" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"opens_at" timestamp with time zone,
	"launched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
