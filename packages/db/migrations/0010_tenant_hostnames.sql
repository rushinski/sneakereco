CREATE TABLE "tenant_hostnames" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"hostname" text NOT NULL,
	"surface" text NOT NULL,
	"host_kind" text NOT NULL,
	"is_canonical" boolean DEFAULT false NOT NULL,
	"redirect_to_hostname" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_hostnames" ADD CONSTRAINT "tenant_hostnames_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_hostnames_hostname" ON "tenant_hostnames" USING btree ("hostname");
--> statement-breakpoint
CREATE INDEX "idx_tenant_hostnames_tenant_surface" ON "tenant_hostnames" USING btree ("tenant_id","surface");
--> statement-breakpoint
ALTER TABLE "tenant_hostnames" ADD CONSTRAINT "tenant_hostnames_hostname_lowercase" CHECK ("tenant_hostnames"."hostname" = lower("tenant_hostnames"."hostname"));
--> statement-breakpoint
ALTER TABLE "tenant_hostnames" ADD CONSTRAINT "tenant_hostnames_surface_check" CHECK ("tenant_hostnames"."surface" in ('platform', 'platform-admin', 'customer', 'store-admin'));
--> statement-breakpoint
ALTER TABLE "tenant_hostnames" ADD CONSTRAINT "tenant_hostnames_host_kind_check" CHECK ("tenant_hostnames"."host_kind" in ('platform', 'managed', 'admin-managed', 'custom', 'admin-custom', 'alias'));
--> statement-breakpoint
ALTER TABLE "tenant_hostnames" ADD CONSTRAINT "tenant_hostnames_status_check" CHECK ("tenant_hostnames"."status" in ('active', 'disabled', 'pending_verification'));
--> statement-breakpoint
INSERT INTO "tenant_hostnames" (
	"id",
	"tenant_id",
	"hostname",
	"surface",
	"host_kind",
	"is_canonical",
	"redirect_to_hostname",
	"status"
) VALUES
	('thn_platform_site_test', null, 'sneakereco.test', 'platform', 'platform', true, null, 'active'),
	('thn_platform_admin_test', null, 'dashboard.sneakereco.test', 'platform-admin', 'platform', true, null, 'active'),
	('thn_platform_api_test', null, 'api.sneakereco.test', 'platform', 'platform', true, null, 'active');
