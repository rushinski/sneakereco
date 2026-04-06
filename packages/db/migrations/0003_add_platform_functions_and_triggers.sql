CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_tenants_set_updated_at ON "tenants";
CREATE TRIGGER trg_tenants_set_updated_at
    BEFORE UPDATE ON "tenants"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_users_set_updated_at ON "users";
CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_members_set_updated_at ON "tenant_members";
CREATE TRIGGER trg_tenant_members_set_updated_at
    BEFORE UPDATE ON "tenant_members"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_onboarding_set_updated_at ON "tenant_onboarding";
CREATE TRIGGER trg_tenant_onboarding_set_updated_at
    BEFORE UPDATE ON "tenant_onboarding"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_seo_config_set_updated_at ON "tenant_seo_config";
CREATE TRIGGER trg_tenant_seo_config_set_updated_at
    BEFORE UPDATE ON "tenant_seo_config"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_theme_config_set_updated_at ON "tenant_theme_config";
CREATE TRIGGER trg_tenant_theme_config_set_updated_at
    BEFORE UPDATE ON "tenant_theme_config"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_email_config_set_updated_at ON "tenant_email_config";
CREATE TRIGGER trg_tenant_email_config_set_updated_at
    BEFORE UPDATE ON "tenant_email_config"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_domain_config_set_updated_at ON "tenant_domain_config";
CREATE TRIGGER trg_tenant_domain_config_set_updated_at
    BEFORE UPDATE ON "tenant_domain_config"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_products_set_updated_at ON "products";
CREATE TRIGGER trg_products_set_updated_at
    BEFORE UPDATE ON "products"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_product_variants_set_updated_at ON "product_variants";
CREATE TRIGGER trg_product_variants_set_updated_at
    BEFORE UPDATE ON "product_variants"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tag_brands_set_updated_at ON "tag_brands";
CREATE TRIGGER trg_tag_brands_set_updated_at
    BEFORE UPDATE ON "tag_brands"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tag_models_set_updated_at ON "tag_models";
CREATE TRIGGER trg_tag_models_set_updated_at
    BEFORE UPDATE ON "tag_models"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tag_aliases_set_updated_at ON "tag_aliases";
CREATE TRIGGER trg_tag_aliases_set_updated_at
    BEFORE UPDATE ON "tag_aliases"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_product_filters_set_updated_at ON "product_filters";
CREATE TRIGGER trg_product_filters_set_updated_at
    BEFORE UPDATE ON "product_filters"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON "orders";
CREATE TRIGGER trg_orders_set_updated_at
    BEFORE UPDATE ON "orders"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_payment_transactions_set_updated_at ON "payment_transactions";
CREATE TRIGGER trg_payment_transactions_set_updated_at
    BEFORE UPDATE ON "payment_transactions"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_email_subscribers_set_updated_at ON "email_subscribers";
CREATE TRIGGER trg_email_subscribers_set_updated_at
    BEFORE UPDATE ON "email_subscribers"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_featured_items_set_updated_at ON "featured_items";
CREATE TRIGGER trg_featured_items_set_updated_at
    BEFORE UPDATE ON "featured_items"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_user_addresses_set_updated_at ON "user_addresses";
CREATE TRIGGER trg_user_addresses_set_updated_at
    BEFORE UPDATE ON "user_addresses"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_chargeback_evidence_set_updated_at ON "chargeback_evidence";
CREATE TRIGGER trg_chargeback_evidence_set_updated_at
    BEFORE UPDATE ON "chargeback_evidence"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_nexus_registrations_set_updated_at ON "nexus_registrations";
CREATE TRIGGER trg_nexus_registrations_set_updated_at
    BEFORE UPDATE ON "nexus_registrations"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_state_sales_tracking_set_updated_at ON "state_sales_tracking";
CREATE TRIGGER trg_state_sales_tracking_set_updated_at
    BEFORE UPDATE ON "state_sales_tracking"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_tenant_tax_settings_set_updated_at ON "tenant_tax_settings";
CREATE TRIGGER trg_tenant_tax_settings_set_updated_at
    BEFORE UPDATE ON "tenant_tax_settings"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_tenant_shipping_config_set_updated_at ON "tenant_shipping_config";
CREATE TRIGGER trg_tenant_shipping_config_set_updated_at
    BEFORE UPDATE ON "tenant_shipping_config"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_product_stock_status()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id text;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.product_id IS DISTINCT FROM OLD.product_id THEN
        UPDATE "products"
        SET
            "is_out_of_stock" = NOT EXISTS (
                SELECT 1
                FROM "product_variants"
                WHERE "product_id" = OLD.product_id
                  AND "stock" > 0
            ),
            "updated_at" = NOW()
        WHERE "id" = OLD.product_id;

        target_product_id := NEW.product_id;
    ELSIF TG_OP = 'INSERT' THEN
        target_product_id := NEW.product_id;
    ELSE
        target_product_id := OLD.product_id;
    END IF;

    UPDATE "products"
    SET
        "is_out_of_stock" = NOT EXISTS (
            SELECT 1
            FROM "product_variants"
            WHERE "product_id" = target_product_id
              AND "stock" > 0
        ),
        "updated_at" = NOW()
    WHERE "id" = target_product_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_product_variants_stock_change ON "product_variants";
CREATE TRIGGER trg_product_variants_stock_change
    AFTER INSERT OR UPDATE OF stock, product_id OR DELETE
    ON "product_variants"
    FOR EACH ROW EXECUTE FUNCTION update_product_stock_status();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION set_label_created_at()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(NEW.label_url, '') <> ''
       AND COALESCE(OLD.label_url, '') = ''
       AND NEW.label_created_at IS NULL THEN
        NEW.label_created_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_orders_set_label_created_at ON "orders";
CREATE TRIGGER trg_orders_set_label_created_at
    BEFORE UPDATE OF label_url
    ON "orders"
    FOR EACH ROW EXECUTE FUNCTION set_label_created_at();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION update_state_sales_on_order()
RETURNS TRIGGER AS $$
DECLARE
    should_record boolean := false;
    sales_year integer;
    sales_month integer;
    aggregate_id text;
BEGIN
    IF NEW.customer_state IS NULL THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        should_record := NEW.status = 'paid';
    ELSIF TG_OP = 'UPDATE' THEN
        should_record := (
            (OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid')
            OR (
                OLD.status = 'paid'
                AND NEW.status = 'paid'
                AND OLD.customer_state IS NULL
                AND NEW.customer_state IS NOT NULL
            )
        );
    END IF;

    IF NOT should_record THEN
        RETURN NULL;
    END IF;

    sales_year := EXTRACT(YEAR FROM NEW.created_at)::integer;
    sales_month := EXTRACT(MONTH FROM NEW.created_at)::integer;
    aggregate_id := 'ssr_' || md5(
        concat_ws(':', NEW.tenant_id, NEW.customer_state, sales_year::text, sales_month::text)
    );

    INSERT INTO "state_sales_tracking" (
        "id",
        "tenant_id",
        "state_code",
        "year",
        "month",
        "total_sales_cents",
        "taxable_sales_cents",
        "tax_collected_cents",
        "transaction_count"
    )
    VALUES (
        aggregate_id,
        NEW.tenant_id,
        NEW.customer_state,
        sales_year,
        sales_month,
        NEW.total_cents,
        NEW.subtotal_cents,
        NEW.tax_cents,
        1
    )
    ON CONFLICT ("tenant_id", "state_code", "year", "month")
    DO UPDATE SET
        "total_sales_cents" = "state_sales_tracking"."total_sales_cents" + EXCLUDED."total_sales_cents",
        "taxable_sales_cents" = "state_sales_tracking"."taxable_sales_cents" + EXCLUDED."taxable_sales_cents",
        "tax_collected_cents" = "state_sales_tracking"."tax_collected_cents" + EXCLUDED."tax_collected_cents",
        "transaction_count" = "state_sales_tracking"."transaction_count" + 1,
        "updated_at" = NOW();

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_orders_state_sales_on_change ON "orders";
CREATE TRIGGER trg_orders_state_sales_on_change
    AFTER INSERT OR UPDATE OF status, customer_state
    ON "orders"
    FOR EACH ROW EXECUTE FUNCTION update_state_sales_on_order();
