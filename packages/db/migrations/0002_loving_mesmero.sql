CREATE TABLE "tenant_onboarding" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"request_status" text DEFAULT 'pending' NOT NULL,
	"invite_token_hash" text,
	"invite_sent_at" timestamp with time zone,
	"invite_accepted_at" timestamp with time zone,
	"requested_by_email" text,
	"requested_by_name" text,
	"requested_by_phone" text,
	"business_name" text,
	"instagram_url" text,
	"request_notes" text,
	"seo_questionnaire_completed" boolean DEFAULT false NOT NULL,
	"payment_integration_completed" boolean DEFAULT false NOT NULL,
	"shipping_integration_completed" boolean DEFAULT false NOT NULL,
	"domain_configured" boolean DEFAULT false NOT NULL,
	"theme_configured" boolean DEFAULT false NOT NULL,
	"seo_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_onboarding_request_status_check" CHECK ("tenant_onboarding"."request_status" in ('pending', 'approved', 'rejected', 'invited'))
);
--> statement-breakpoint
ALTER TABLE "tenant_onboarding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_seo_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_description" text,
	"target_audience" text,
	"geographic_focus" text,
	"unique_selling_points" text[],
	"primary_keywords" text[],
	"secondary_keywords" text[],
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"og_image_url" text,
	"google_site_verification" text,
	"google_analytics_id" text,
	"robots_txt_overrides" text,
	"meta_title_template" text DEFAULT '{{product_name}} | {{store_name}}' NOT NULL,
	"meta_description_template" text DEFAULT 'Shop {{product_name}} at {{store_name}}. {{business_description}}' NOT NULL,
	"collection_title_template" text DEFAULT '{{category}} | {{store_name}}' NOT NULL,
	"collection_description_template" text DEFAULT 'Browse our {{category}} collection. {{business_description}}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_seo_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_theme_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"color_primary" text DEFAULT '#000000' NOT NULL,
	"color_secondary" text DEFAULT '#666666' NOT NULL,
	"color_accent" text DEFAULT '#2563EB' NOT NULL,
	"color_background" text DEFAULT '#FFFFFF' NOT NULL,
	"color_surface" text DEFAULT '#F9FAFB' NOT NULL,
	"color_text" text DEFAULT '#111827' NOT NULL,
	"color_text_muted" text DEFAULT '#6B7280' NOT NULL,
	"color_border" text DEFAULT '#E5E7EB' NOT NULL,
	"color_error" text DEFAULT '#EF4444' NOT NULL,
	"color_success" text DEFAULT '#22C55E' NOT NULL,
	"font_heading" text DEFAULT 'Inter' NOT NULL,
	"font_body" text DEFAULT 'Inter' NOT NULL,
	"font_mono" text DEFAULT 'JetBrains Mono' NOT NULL,
	"header_variant" text DEFAULT 'classic' NOT NULL,
	"hero_variant" text DEFAULT 'full_width' NOT NULL,
	"product_card_variant" text DEFAULT 'standard' NOT NULL,
	"footer_variant" text DEFAULT 'standard' NOT NULL,
	"filter_variant" text DEFAULT 'sidebar' NOT NULL,
	"max_content_width" text DEFAULT '1280px' NOT NULL,
	"border_radius" text DEFAULT '8px' NOT NULL,
	"show_about_page" boolean DEFAULT true NOT NULL,
	"show_contact_page" boolean DEFAULT true NOT NULL,
	"hero_title" text,
	"hero_subtitle" text,
	"hero_image_url" text,
	"hero_cta_text" text DEFAULT 'Shop Now',
	"hero_cta_link" text DEFAULT '/shop',
	"about_content" text,
	"about_image_url" text,
	"logo_url" text,
	"logo_width" integer DEFAULT 120,
	"favicon_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_theme_config_header_variant_check" CHECK ("tenant_theme_config"."header_variant" in ('classic', 'minimal', 'centered')),
	CONSTRAINT "tenant_theme_config_hero_variant_check" CHECK ("tenant_theme_config"."hero_variant" in ('full_width', 'split', 'slider', 'none')),
	CONSTRAINT "tenant_theme_config_product_card_variant_check" CHECK ("tenant_theme_config"."product_card_variant" in ('standard', 'minimal', 'detailed')),
	CONSTRAINT "tenant_theme_config_footer_variant_check" CHECK ("tenant_theme_config"."footer_variant" in ('standard', 'minimal', 'extended')),
	CONSTRAINT "tenant_theme_config_filter_variant_check" CHECK ("tenant_theme_config"."filter_variant" in ('sidebar', 'top_bar', 'drawer'))
);
--> statement-breakpoint
ALTER TABLE "tenant_theme_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_email_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"reply_to_email" text,
	"support_email" text,
	"ses_domain_verified" boolean DEFAULT false NOT NULL,
	"ses_domain" text,
	"email_template_variant" text DEFAULT 'standard' NOT NULL,
	"email_accent_color" text,
	"email_logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_email_config_template_variant_check" CHECK ("tenant_email_config"."email_template_variant" in ('standard', 'minimal', 'branded'))
);
--> statement-breakpoint
ALTER TABLE "tenant_email_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_domain_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"custom_domain" text,
	"subdomain" text NOT NULL,
	"dns_verified" boolean DEFAULT false NOT NULL,
	"dns_verification_token" text,
	"dns_verified_at" timestamp with time zone,
	"ssl_provisioned" boolean DEFAULT false NOT NULL,
	"ssl_provisioned_at" timestamp with time zone,
	"cloudflare_zone_id" text,
	"admin_domain" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_domain_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_type" text DEFAULT 'reseller';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "launched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_onboarding" ADD CONSTRAINT "tenant_onboarding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_seo_config" ADD CONSTRAINT "tenant_seo_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_theme_config" ADD CONSTRAINT "tenant_theme_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_email_config" ADD CONSTRAINT "tenant_email_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_domain_config" ADD CONSTRAINT "tenant_domain_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_onboarding_tenant" ON "tenant_onboarding" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_onboarding_status" ON "tenant_onboarding" USING btree ("request_status");--> statement-breakpoint
CREATE INDEX "idx_tenant_onboarding_invite" ON "tenant_onboarding" USING btree ("invite_token_hash") WHERE "tenant_onboarding"."invite_token_hash" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_seo_config_tenant" ON "tenant_seo_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_theme_config_tenant" ON "tenant_theme_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_email_config_tenant" ON "tenant_email_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_domain_config_tenant" ON "tenant_domain_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_domain_config_custom_domain" ON "tenant_domain_config" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_domain_config_subdomain" ON "tenant_domain_config" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "idx_tenant_domain_custom" ON "tenant_domain_config" USING btree ("custom_domain") WHERE "tenant_domain_config"."custom_domain" is not null;--> statement-breakpoint
CREATE INDEX "idx_tenant_domain_subdomain" ON "tenant_domain_config" USING btree ("subdomain");--> statement-breakpoint
CREATE POLICY "tenant_onboarding_admin_manage" ON "tenant_onboarding" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_onboarding"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_onboarding"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_seo_config_admin_manage" ON "tenant_seo_config" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_seo_config_public_read" ON "tenant_seo_config" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "tenant_theme_config_admin_manage" ON "tenant_theme_config" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_theme_config_public_read" ON "tenant_theme_config" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "tenant_email_config_admin_manage" ON "tenant_email_config" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_email_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_email_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_domain_config_admin_manage" ON "tenant_domain_config" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_domain_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_domain_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenants_select" ON "tenants" TO sneakereco_app USING ("tenants"."id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "users_admin_select" ON "users" TO sneakereco_app USING (current_setting('app.current_user_role', true) = 'admin' and exists (
    select 1
    from "tenant_members"
    where "tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true)
      and "tenant_members"."user_id" = "users"."id"
  ));--> statement-breakpoint
ALTER POLICY "users_select_own" ON "users" TO sneakereco_app USING ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "users_update_own" ON "users" TO sneakereco_app USING ("users"."id" = current_setting('app.current_user_id', true)) WITH CHECK ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_admin_manage" ON "tenant_members" TO sneakereco_app USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_members_admin_select" ON "tenant_members" TO sneakereco_app USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_members_select_own" ON "tenant_members" TO sneakereco_app USING ("tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_tenant_isolation" ON "tenant_members" TO sneakereco_app USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_update_own" ON "tenant_members" TO sneakereco_app USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "products_admin_all" ON "products" TO sneakereco_app USING ("products"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("products"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "products_public_read" ON "products" TO sneakereco_app USING ("products"."tenant_id" = current_setting('app.current_tenant_id', true)
    and "products"."is_active" = true
    and "products"."go_live_at" <= now());--> statement-breakpoint
ALTER POLICY "product_variants_admin_all" ON "product_variants" TO sneakereco_app USING ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "product_variants_public_read" ON "product_variants" TO sneakereco_app USING ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "products"
      where "products"."id" = "product_variants"."product_id"
        and "products"."is_active" = true
        and "products"."go_live_at" <= now()
    ));--> statement-breakpoint
ALTER POLICY "product_images_admin_all" ON "product_images" TO sneakereco_app USING ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "product_images_public_read" ON "product_images" TO sneakereco_app USING ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "products"
      where "products"."id" = "product_images"."product_id"
        and "products"."is_active" = true
        and "products"."go_live_at" <= now()
    ));--> statement-breakpoint
ALTER POLICY "tag_brands_admin_manage" ON "tag_brands" TO sneakereco_app USING ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tag_brands_public_read" ON "tag_brands" TO sneakereco_app USING ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_brands"."is_active" = true);--> statement-breakpoint
ALTER POLICY "tag_models_admin_manage" ON "tag_models" TO sneakereco_app USING ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tag_models_public_read" ON "tag_models" TO sneakereco_app USING ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_models"."is_active" = true);--> statement-breakpoint
ALTER POLICY "tag_aliases_admin_manage" ON "tag_aliases" TO sneakereco_app USING ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tag_aliases_public_read" ON "tag_aliases" TO sneakereco_app USING ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_aliases"."is_active" = true);--> statement-breakpoint
ALTER POLICY "product_filters_admin_manage" ON "product_filters" TO sneakereco_app USING ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "product_filters_public_read" ON "product_filters" TO sneakereco_app USING ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "product_filter_entries_admin_manage" ON "product_filter_entries" TO sneakereco_app USING (current_setting('app.current_user_role', true) = 'admin' and exists (
      select 1
      from "products"
      inner join "product_filters"
        on "product_filters"."id" = "product_filter_entries"."filter_id"
      where "products"."id" = "product_filter_entries"."product_id"
        and "products"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "product_filters"."tenant_id" = current_setting('app.current_tenant_id', true)
    )) WITH CHECK (current_setting('app.current_user_role', true) = 'admin' and exists (
      select 1
      from "products"
      inner join "product_filters"
        on "product_filters"."id" = "product_filter_entries"."filter_id"
      where "products"."id" = "product_filter_entries"."product_id"
        and "products"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "product_filters"."tenant_id" = current_setting('app.current_tenant_id', true)
    ));--> statement-breakpoint
ALTER POLICY "product_filter_entries_public_read" ON "product_filter_entries" TO sneakereco_app USING (exists (
      select 1
      from "products"
      inner join "product_filters"
        on "product_filters"."id" = "product_filter_entries"."filter_id"
      where "products"."id" = "product_filter_entries"."product_id"
        and "products"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "product_filters"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "products"."is_active" = true
        and "products"."go_live_at" <= now()
    ));--> statement-breakpoint
ALTER POLICY "orders_admin_all" ON "orders" TO sneakereco_app USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "orders_customer_insert" ON "orders" TO sneakereco_app WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and (
    "orders"."user_id" = current_setting('app.current_user_id', true)
    or "orders"."user_id" is null
  ));--> statement-breakpoint
ALTER POLICY "orders_customer_select" ON "orders" TO sneakereco_app USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and "orders"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "order_line_items_admin_all" ON "order_line_items" TO sneakereco_app USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "order_line_items_customer_read" ON "order_line_items" TO sneakereco_app USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_line_items"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "order_addresses_admin_all" ON "order_addresses" TO sneakereco_app USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "order_addresses_customer_read" ON "order_addresses" TO sneakereco_app USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_addresses"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "payment_transactions_admin_read" ON "payment_transactions" TO sneakereco_app USING ("payment_transactions"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "user_addresses_admin_read" ON "user_addresses" TO sneakereco_app USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "user_addresses_customer_manage" ON "user_addresses" TO sneakereco_app USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "audit_events_admin_read" ON "audit_events" TO sneakereco_app USING ("audit_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "chargeback_evidence_admin_read" ON "chargeback_evidence" TO sneakereco_app USING ("chargeback_evidence"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "featured_items_admin_manage" ON "featured_items" TO sneakereco_app USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "featured_items_public_read" ON "featured_items" TO sneakereco_app USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "email_audit_log_admin_read" ON "email_audit_log" TO sneakereco_app USING ("email_audit_log"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "email_subscribers_admin_manage" ON "email_subscribers" TO sneakereco_app USING ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "email_subscribers_public_insert" ON "email_subscribers" TO sneakereco_app WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "contact_messages_admin_read" ON "contact_messages" TO sneakereco_app USING ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "contact_messages_public_insert" ON "contact_messages" TO sneakereco_app WITH CHECK ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "nexus_registrations_admin_manage" ON "nexus_registrations" TO sneakereco_app USING ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "state_sales_tracking_admin_read" ON "state_sales_tracking" TO sneakereco_app USING ("state_sales_tracking"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_tax_settings_admin_manage" ON "tenant_tax_settings" TO sneakereco_app USING ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "shipping_tracking_admin_read" ON "shipping_tracking_events" TO sneakereco_app USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "shipping_tracking_customer_read" ON "shipping_tracking_events" TO sneakereco_app USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "shipping_tracking_events"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "tenant_shipping_config_admin_manage" ON "tenant_shipping_config" TO sneakereco_app USING ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');