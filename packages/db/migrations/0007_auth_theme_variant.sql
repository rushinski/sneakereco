ALTER TABLE "tenant_theme_config" ADD COLUMN "auth_variant" text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_theme_config" ADD COLUMN "auth_headline" text;--> statement-breakpoint
ALTER TABLE "tenant_theme_config" ADD COLUMN "auth_description" text;--> statement-breakpoint
ALTER TABLE "tenant_theme_config" ADD CONSTRAINT "tenant_theme_config_auth_variant_check" CHECK ("tenant_theme_config"."auth_variant" in ('simple', 'bold'));
