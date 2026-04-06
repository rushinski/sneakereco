CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"cognito_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_members" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_order_emails_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_members_role_check" CHECK ("tenant_members"."role" in ('customer', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model" text,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"condition_note" text,
	"description" text,
	"sku" text NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_out_of_stock" boolean DEFAULT false NOT NULL,
	"go_live_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_category_check" CHECK ("products"."category" in ('sneakers', 'clothing', 'accessories', 'electronics')),
	CONSTRAINT "products_condition_check" CHECK ("products"."condition" in ('new', 'preowned')),
	CONSTRAINT "products_cost_cents_check" CHECK ("products"."cost_cents" >= 0),
	CONSTRAINT "products_sku_format_check" CHECK ("products"."sku" ~ '^[A-Z]{2,4}-[A-Z]{2,4}-\d{5}$')
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"size_type" text NOT NULL,
	"size_label" text NOT NULL,
	"price_cents" integer NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_size_type_check" CHECK ("product_variants"."size_type" in ('shoe', 'clothing', 'custom', 'none')),
	CONSTRAINT "product_variants_price_cents_check" CHECK ("product_variants"."price_cents" >= 0),
	CONSTRAINT "product_variants_cost_cents_check" CHECK ("product_variants"."cost_cents" >= 0),
	CONSTRAINT "product_variants_stock_check" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tag_brands" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tag_brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tag_models" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tag_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tag_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"brand_id" text,
	"model_id" text,
	"alias" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_aliases_entity_type_check" CHECK ("tag_aliases"."entity_type" in ('brand', 'model')),
	CONSTRAINT "tag_aliases_entity_target_check" CHECK ((
        ("tag_aliases"."entity_type" = 'brand' and "tag_aliases"."brand_id" is not null and "tag_aliases"."model_id" is null)
        or
        ("tag_aliases"."entity_type" = 'model' and "tag_aliases"."model_id" is not null and "tag_aliases"."brand_id" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "tag_aliases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_filters" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"label" text NOT NULL,
	"group_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_filters_group_key_check" CHECK ("product_filters"."group_key" in (
        'brand', 'model',
        'size_shoe', 'size_clothing', 'size_custom', 'size_none',
        'condition', 'category',
        'designer_brand', 'collab', 'custom'
      ))
);
--> statement-breakpoint
ALTER TABLE "product_filters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "product_filter_entries" (
	"product_id" text NOT NULL,
	"filter_id" text NOT NULL,
	CONSTRAINT "product_filter_entries_product_id_filter_id_pk" PRIMARY KEY("product_id","filter_id")
);
--> statement-breakpoint
ALTER TABLE "product_filter_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"guest_email" text,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"fee_cents" integer,
	"total_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"refund_amount_cents" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"fulfillment_type" text,
	"fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL,
	"shipping_carrier" text,
	"tracking_number" text,
	"shipped_at" timestamp with time zone,
	"actual_shipping_cost_cents" integer,
	"label_url" text,
	"label_created_at" timestamp with time zone,
	"label_created_by" text,
	"pickup_location_id" text,
	"pickup_instructions" text,
	"customer_state" varchar(2),
	"tax_calculation_id" text,
	"tax_transaction_id" text,
	"nofraud_transaction_id" text,
	"nofraud_decision" text,
	"payrilla_transaction_id" text,
	"idempotency_key" text,
	"cart_hash" text,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in (
        'pending', 'processing', 'paid',
        'shipped', 'canceled', 'failed', 'blocked', 'review',
        'refunded', 'partially_refunded', 'refund_pending', 'refund_failed'
      )),
	CONSTRAINT "orders_fulfillment_type_check" CHECK ("orders"."fulfillment_type" is null or "orders"."fulfillment_type" in ('ship', 'pickup')),
	CONSTRAINT "orders_fulfillment_status_check" CHECK ("orders"."fulfillment_status" in (
        'unfulfilled', 'label_created', 'shipped', 'delivered',
        'ready_for_pickup', 'picked_up'
      )),
	CONSTRAINT "orders_nofraud_decision_check" CHECK ("orders"."nofraud_decision" is null or "orders"."nofraud_decision" in ('pass', 'fail', 'review')),
	CONSTRAINT "orders_customer_identity_check" CHECK ((
        "orders"."status" in ('pending', 'canceled', 'failed', 'blocked', 'review')
        or "orders"."user_id" is not null
        or "orders"."guest_email" is not null
      ))
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"product_name" text NOT NULL,
	"brand" text NOT NULL,
	"size_label" text,
	"sku" text NOT NULL,
	"image_url" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_line_items_quantity_check" CHECK ("order_line_items"."quantity" > 0),
	CONSTRAINT "order_line_items_unit_price_cents_check" CHECK ("order_line_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "order_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"address_type" text NOT NULL,
	"full_name" text,
	"phone" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_addresses_type_check" CHECK ("order_addresses"."address_type" in ('shipping', 'billing'))
);
--> statement-breakpoint
ALTER TABLE "order_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"payrilla_reference_number" integer,
	"payrilla_auth_code" text,
	"payrilla_status" text DEFAULT 'pending' NOT NULL,
	"card_type" text,
	"card_last4" varchar(4),
	"card_expiry_month" smallint,
	"card_expiry_year" smallint,
	"avs_result_code" varchar(5),
	"cvv_result_code" varchar(2),
	"three_ds_status" varchar(2),
	"three_ds_eci" varchar(2),
	"nofraud_transaction_id" text,
	"nofraud_decision" text,
	"amount_requested_cents" integer NOT NULL,
	"amount_authorized_cents" integer,
	"amount_captured_cents" integer,
	"amount_refunded_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"customer_email" text,
	"customer_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_payrilla_status_check" CHECK ("payment_transactions"."payrilla_status" in ('pending', 'authorized', 'captured', 'voided', 'declined', 'error')),
	CONSTRAINT "payment_transactions_nofraud_decision_check" CHECK ("payment_transactions"."nofraud_decision" is null or "payment_transactions"."nofraud_decision" in ('pass', 'fail', 'review'))
);
--> statement-breakpoint
ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_access_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"address_type" text NOT NULL,
	"full_name" text,
	"phone" text,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_addresses_type_check" CHECK ("user_addresses"."address_type" in ('shipping', 'billing'))
);
--> statement-breakpoint
ALTER TABLE "user_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_actor_type_check" CHECK ("audit_events"."actor_type" in ('user', 'system', 'webhook', 'cron'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"provider" text NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload_hash" text NOT NULL,
	"order_id" text,
	"processed_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chargeback_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"nofraud_transaction_id" text,
	"nofraud_decision" text,
	"avs_result_code" text,
	"cvv_result_code" text,
	"customer_ip" "inet",
	"payment_amount_cents" integer,
	"payment_currency" text,
	"payment_method_last4" text,
	"payment_method_type" text,
	"billing_address_snapshot" jsonb,
	"shipping_address_snapshot" jsonb,
	"carrier" text,
	"tracking_number" text,
	"delivery_confirmed_at" timestamp with time zone,
	"delivery_event_snapshot" jsonb,
	"order_snapshot" jsonb,
	"tax_calculation_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chargeback_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "featured_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "featured_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text,
	"email_type" text NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text,
	"ses_message_id" text,
	"template_data" jsonb,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	CONSTRAINT "email_audit_log_delivery_status_check" CHECK ("email_audit_log"."delivery_status" in ('sent', 'delivered', 'bounced', 'complained', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "email_audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmation_token" text,
	"token_expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_subscribers_status_check" CHECK ("email_subscribers"."status" in ('pending', 'confirmed', 'unsubscribed'))
);
--> statement-breakpoint
ALTER TABLE "email_subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"name" text,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"source" text,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nexus_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"registration_type" text NOT NULL,
	"is_registered" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp with time zone,
	"tracking_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nexus_registrations_type_check" CHECK ("nexus_registrations"."registration_type" in ('physical', 'economic'))
);
--> statement-breakpoint
ALTER TABLE "nexus_registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "state_sales_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_sales_cents" integer DEFAULT 0 NOT NULL,
	"taxable_sales_cents" integer DEFAULT 0 NOT NULL,
	"tax_collected_cents" integer DEFAULT 0 NOT NULL,
	"transaction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "state_sales_tracking_month_check" CHECK ("state_sales_tracking"."month" between 1 and 12)
);
--> statement-breakpoint
ALTER TABLE "state_sales_tracking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_tax_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"home_state" varchar(2) NOT NULL,
	"business_name" text,
	"tax_code_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_tax_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shipping_tracking_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"order_id" text NOT NULL,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"location" text,
	"description" text,
	"raw_response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shipping_tracking_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_shipping_config" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"origin_name" text NOT NULL,
	"origin_company" text,
	"origin_phone" text,
	"origin_line1" text NOT NULL,
	"origin_line2" text,
	"origin_city" text NOT NULL,
	"origin_state" text NOT NULL,
	"origin_postal_code" text NOT NULL,
	"origin_country" text DEFAULT 'US' NOT NULL,
	"enabled_carriers" text[] DEFAULT '{}'::text[] NOT NULL,
	"category_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_shipping_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_slug_unique";--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_domain_unique";--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_brands" ADD CONSTRAINT "tag_brands_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_models" ADD CONSTRAINT "tag_models_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_models" ADD CONSTRAINT "tag_models_brand_id_tag_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."tag_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_aliases" ADD CONSTRAINT "tag_aliases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_aliases" ADD CONSTRAINT "tag_aliases_brand_id_tag_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."tag_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_aliases" ADD CONSTRAINT "tag_aliases_model_id_tag_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."tag_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filters" ADD CONSTRAINT "product_filters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_entries" ADD CONSTRAINT "product_filter_entries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_filter_entries" ADD CONSTRAINT "product_filter_entries_filter_id_product_filters_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."product_filters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_label_created_by_users_id_fk" FOREIGN KEY ("label_created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_access_tokens" ADD CONSTRAINT "order_access_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_access_tokens" ADD CONSTRAINT "order_access_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargeback_evidence" ADD CONSTRAINT "chargeback_evidence_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargeback_evidence" ADD CONSTRAINT "chargeback_evidence_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_items" ADD CONSTRAINT "featured_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_items" ADD CONSTRAINT "featured_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_items" ADD CONSTRAINT "featured_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audit_log" ADD CONSTRAINT "email_audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_audit_log" ADD CONSTRAINT "email_audit_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_subscribers" ADD CONSTRAINT "email_subscribers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexus_registrations" ADD CONSTRAINT "nexus_registrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state_sales_tracking" ADD CONSTRAINT "state_sales_tracking_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_settings" ADD CONSTRAINT "tenant_tax_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_tracking_events" ADD CONSTRAINT "shipping_tracking_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_tracking_events" ADD CONSTRAINT "shipping_tracking_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_shipping_config" ADD CONSTRAINT "tenant_shipping_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_users_cognito_sub" ON "users" USING btree ("cognito_sub") WHERE "users"."cognito_sub" is not null;--> statement-breakpoint
CREATE INDEX "idx_users_cognito_sub" ON "users" USING btree ("cognito_sub") WHERE "users"."cognito_sub" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_members_tenant_user" ON "tenant_members" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_members_tenant" ON "tenant_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_members_user" ON "tenant_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_members_owner" ON "tenant_members" USING btree ("tenant_id") WHERE "tenant_members"."is_owner" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_products_tenant_sku" ON "products" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE INDEX "idx_products_tenant" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_active" ON "products" USING btree ("tenant_id","is_active","go_live_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_products_tenant_brand" ON "products" USING btree ("tenant_id","brand");--> statement-breakpoint
CREATE INDEX "idx_products_tenant_category" ON "products" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_products_created_at" ON "products" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_product_variants_product_size" ON "product_variants" USING btree ("product_id","size_type","size_label");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_tenant" ON "product_variants" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_product" ON "product_images" USING btree ("product_id","is_primary" DESC NULLS LAST,"sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tag_brands_tenant_label" ON "tag_brands" USING btree ("tenant_id","label");--> statement-breakpoint
CREATE INDEX "idx_tag_brands_tenant" ON "tag_brands" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tag_models_tenant_brand_label" ON "tag_models" USING btree ("tenant_id","brand_id","label");--> statement-breakpoint
CREATE INDEX "idx_tag_models_brand" ON "tag_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_tag_models_tenant" ON "tag_models" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tag_aliases_tenant_entity_alias" ON "tag_aliases" USING btree ("tenant_id","entity_type","alias");--> statement-breakpoint
CREATE INDEX "idx_tag_aliases_brand" ON "tag_aliases" USING btree ("brand_id") WHERE "tag_aliases"."brand_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_tag_aliases_model" ON "tag_aliases" USING btree ("model_id") WHERE "tag_aliases"."model_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_product_filters_tenant_label_group" ON "product_filters" USING btree ("tenant_id","label","group_key");--> statement-breakpoint
CREATE INDEX "idx_product_filters_tenant_group" ON "product_filters" USING btree ("tenant_id","group_key");--> statement-breakpoint
CREATE INDEX "idx_product_filter_entries_filter" ON "product_filter_entries" USING btree ("filter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_orders_idempotency_key" ON "orders" USING btree ("idempotency_key") WHERE "orders"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "idx_orders_tenant" ON "orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_status" ON "orders" USING btree ("tenant_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_orders_tenant_fulfillment" ON "orders" USING btree ("tenant_id","fulfillment_status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_orders_user" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "orders"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_orders_cart_hash" ON "orders" USING btree ("cart_hash") WHERE "orders"."cart_hash" is not null;--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_order_line_items_order" ON "order_line_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_line_items_tenant" ON "order_line_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_order_addresses_order_type" ON "order_addresses" USING btree ("order_id","address_type");--> statement-breakpoint
CREATE INDEX "idx_order_addresses_order" ON "order_addresses" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_order" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_tenant" ON "payment_transactions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_payrilla_ref" ON "payment_transactions" USING btree ("payrilla_reference_number") WHERE "payment_transactions"."payrilla_reference_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_order_access_tokens_token_hash" ON "order_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_order_access_tokens_order" ON "order_access_tokens" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_user_addresses_user" ON "user_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_addresses_tenant" ON "user_addresses" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_tenant" ON "audit_events" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_events_order" ON "audit_events" USING btree ("order_id","created_at" DESC NULLS LAST) WHERE "audit_events"."order_id" is not null;--> statement-breakpoint
CREATE INDEX "idx_audit_events_type" ON "audit_events" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor" ON "audit_events" USING btree ("actor_id") WHERE "audit_events"."actor_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_webhook_events_provider_external_event" ON "webhook_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_order" ON "webhook_events" USING btree ("order_id") WHERE "webhook_events"."order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_chargeback_evidence_order" ON "chargeback_evidence" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_chargeback_evidence_tenant" ON "chargeback_evidence" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_featured_items_tenant_product" ON "featured_items" USING btree ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_featured_items_tenant_sort" ON "featured_items" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_email_audit_log_tenant" ON "email_audit_log" USING btree ("tenant_id","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_email_audit_log_order" ON "email_audit_log" USING btree ("order_id") WHERE "email_audit_log"."order_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_email_subscribers_tenant_email" ON "email_subscribers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_email_subscribers_tenant" ON "email_subscribers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_email_subscribers_token" ON "email_subscribers" USING btree ("confirmation_token") WHERE "email_subscribers"."confirmation_token" is not null;--> statement-breakpoint
CREATE INDEX "idx_contact_messages_tenant" ON "contact_messages" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_contact_messages_email" ON "contact_messages" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_nexus_registrations_tenant_state" ON "nexus_registrations" USING btree ("tenant_id","state_code");--> statement-breakpoint
CREATE INDEX "idx_nexus_registrations_tenant" ON "nexus_registrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_state_sales_tracking_tenant_period" ON "state_sales_tracking" USING btree ("tenant_id","state_code","year","month");--> statement-breakpoint
CREATE INDEX "idx_state_sales_tenant" ON "state_sales_tracking" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_state_sales_period" ON "state_sales_tracking" USING btree ("year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_tax_settings_tenant" ON "tenant_tax_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_tax_settings_tenant" ON "tenant_tax_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_tracking_order" ON "shipping_tracking_events" USING btree ("order_id","event_timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_shipping_tracking_number" ON "shipping_tracking_events" USING btree ("tracking_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenant_shipping_config_tenant" ON "tenant_shipping_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenants_slug" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_tenants_domain" ON "tenants" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status");--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "business_name";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "onboarding_completed";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "launched_at";--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_status_check" CHECK ("tenants"."status" in ('active', 'inactive', 'suspended'));--> statement-breakpoint
CREATE POLICY "tenants_select" ON "tenants" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tenants"."id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "users_admin_select" ON "users" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING (current_setting('app.current_user_role', true) = 'admin' and exists (
    select 1
    from "tenant_members"
    where "tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true)
      and "tenant_members"."user_id" = "users"."id"
  ));--> statement-breakpoint
CREATE POLICY "users_select_own" ON "users" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO "sneakereco_app" USING ("users"."id" = current_setting('app.current_user_id', true)) WITH CHECK ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "tenant_members_admin_manage" ON "tenant_members" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_members_admin_select" ON "tenant_members" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_members_select_own" ON "tenant_members" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "tenant_members_tenant_isolation" ON "tenant_members" AS RESTRICTIVE FOR SELECT TO "sneakereco_app" USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "tenant_members_update_own" ON "tenant_members" AS PERMISSIVE FOR UPDATE TO "sneakereco_app" USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "products_admin_all" ON "products" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("products"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("products"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "products_public_read" ON "products" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("products"."tenant_id" = current_setting('app.current_tenant_id', true)
    and "products"."is_active" = true
    and "products"."go_live_at" <= now());--> statement-breakpoint
CREATE POLICY "product_variants_admin_all" ON "product_variants" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "product_variants_public_read" ON "product_variants" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("product_variants"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "products"
      where "products"."id" = "product_variants"."product_id"
        and "products"."is_active" = true
        and "products"."go_live_at" <= now()
    ));--> statement-breakpoint
CREATE POLICY "product_images_admin_all" ON "product_images" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "product_images_public_read" ON "product_images" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("product_images"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "products"
      where "products"."id" = "product_images"."product_id"
        and "products"."is_active" = true
        and "products"."go_live_at" <= now()
    ));--> statement-breakpoint
CREATE POLICY "tag_brands_admin_manage" ON "tag_brands" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tag_brands_public_read" ON "tag_brands" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tag_brands"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_brands"."is_active" = true);--> statement-breakpoint
CREATE POLICY "tag_models_admin_manage" ON "tag_models" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tag_models_public_read" ON "tag_models" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tag_models"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_models"."is_active" = true);--> statement-breakpoint
CREATE POLICY "tag_aliases_admin_manage" ON "tag_aliases" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tag_aliases_public_read" ON "tag_aliases" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("tag_aliases"."tenant_id" = current_setting('app.current_tenant_id', true) and "tag_aliases"."is_active" = true);--> statement-breakpoint
CREATE POLICY "product_filters_admin_manage" ON "product_filters" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "product_filters_public_read" ON "product_filters" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("product_filters"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "product_filter_entries_admin_manage" ON "product_filter_entries" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING (current_setting('app.current_user_role', true) = 'admin' and exists (
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
CREATE POLICY "product_filter_entries_public_read" ON "product_filter_entries" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING (exists (
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
CREATE POLICY "orders_admin_all" ON "orders" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "orders_customer_insert" ON "orders" AS PERMISSIVE FOR INSERT TO "sneakereco_app" WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and (
    "orders"."user_id" = current_setting('app.current_user_id', true)
    or "orders"."user_id" is null
  ));--> statement-breakpoint
CREATE POLICY "orders_customer_select" ON "orders" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and "orders"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "order_line_items_admin_all" ON "order_line_items" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "order_line_items_customer_read" ON "order_line_items" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_line_items"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
CREATE POLICY "order_addresses_admin_all" ON "order_addresses" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "order_addresses_customer_read" ON "order_addresses" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_addresses"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
CREATE POLICY "payment_transactions_admin_read" ON "payment_transactions" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("payment_transactions"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "user_addresses_admin_read" ON "user_addresses" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "user_addresses_customer_manage" ON "user_addresses" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
CREATE POLICY "audit_events_admin_read" ON "audit_events" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("audit_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "chargeback_evidence_admin_read" ON "chargeback_evidence" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("chargeback_evidence"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "featured_items_admin_manage" ON "featured_items" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "featured_items_public_read" ON "featured_items" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "email_audit_log_admin_read" ON "email_audit_log" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("email_audit_log"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "email_subscribers_admin_manage" ON "email_subscribers" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "email_subscribers_public_insert" ON "email_subscribers" AS PERMISSIVE FOR INSERT TO "sneakereco_app" WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "contact_messages_admin_read" ON "contact_messages" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "contact_messages_public_insert" ON "contact_messages" AS PERMISSIVE FOR INSERT TO "sneakereco_app" WITH CHECK ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
CREATE POLICY "nexus_registrations_admin_manage" ON "nexus_registrations" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "state_sales_tracking_admin_read" ON "state_sales_tracking" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("state_sales_tracking"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "tenant_tax_settings_admin_manage" ON "tenant_tax_settings" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "shipping_tracking_admin_read" ON "shipping_tracking_events" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
CREATE POLICY "shipping_tracking_customer_read" ON "shipping_tracking_events" AS PERMISSIVE FOR SELECT TO "sneakereco_app" USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "shipping_tracking_events"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
CREATE POLICY "tenant_shipping_config_admin_manage" ON "tenant_shipping_config" AS PERMISSIVE FOR ALL TO "sneakereco_app" USING ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');
