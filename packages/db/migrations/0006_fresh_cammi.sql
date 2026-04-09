CREATE TABLE "tenant_cognito_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_pool_id" text NOT NULL,
	"user_pool_arn" text NOT NULL,
	"customer_client_id" text NOT NULL,
	"admin_client_id" text NOT NULL,
	"region" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_cognito_config" ADD CONSTRAINT "tenant_cognito_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_cognito_tenant" ON "tenant_cognito_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_cognito_pool" ON "tenant_cognito_config" USING btree ("user_pool_id");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_super_admin";