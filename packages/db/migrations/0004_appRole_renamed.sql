ALTER POLICY "tenants_select" ON "tenants" TO public USING ("tenants"."id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "users_admin_select" ON "users" TO public USING (current_setting('app.current_user_role', true) = 'admin' and exists (
    select 1
    from "tenant_members"
    where "tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true)
      and "tenant_members"."user_id" = "users"."id"
  ));--> statement-breakpoint
ALTER POLICY "users_select_own" ON "users" TO public USING ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "users_update_own" ON "users" TO public USING ("users"."id" = current_setting('app.current_user_id', true)) WITH CHECK ("users"."id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_admin_manage" ON "tenant_members" TO public USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_members_admin_select" ON "tenant_members" TO public USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_members_select_own" ON "tenant_members" TO public USING ("tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_tenant_isolation" ON "tenant_members" TO public USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "tenant_members_update_own" ON "tenant_members" TO public USING ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("tenant_members"."tenant_id" = current_setting('app.current_tenant_id', true) and "tenant_members"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "tenant_onboarding_admin_manage" ON "tenant_onboarding" TO public USING ("tenant_onboarding"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_onboarding"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_seo_config_admin_manage" ON "tenant_seo_config" TO public USING ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_seo_config_public_read" ON "tenant_seo_config" TO public USING ("tenant_seo_config"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "tenant_theme_config_admin_manage" ON "tenant_theme_config" TO public USING ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_theme_config_public_read" ON "tenant_theme_config" TO public USING ("tenant_theme_config"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "tenant_email_config_admin_manage" ON "tenant_email_config" TO public USING ("tenant_email_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_email_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_domain_config_admin_manage" ON "tenant_domain_config" TO public USING ("tenant_domain_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_domain_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "orders_admin_all" ON "orders" TO public USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "orders_customer_insert" ON "orders" TO public WITH CHECK ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and (
    "orders"."user_id" = current_setting('app.current_user_id', true)
    or "orders"."user_id" is null
  ));--> statement-breakpoint
ALTER POLICY "orders_customer_select" ON "orders" TO public USING ("orders"."tenant_id" = current_setting('app.current_tenant_id', true) and "orders"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "order_line_items_admin_all" ON "order_line_items" TO public USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "order_line_items_customer_read" ON "order_line_items" TO public USING ("order_line_items"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_line_items"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "order_addresses_admin_all" ON "order_addresses" TO public USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "order_addresses_customer_read" ON "order_addresses" TO public USING ("order_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "order_addresses"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "payment_transactions_admin_read" ON "payment_transactions" TO public USING ("payment_transactions"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "user_addresses_admin_read" ON "user_addresses" TO public USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "user_addresses_customer_manage" ON "user_addresses" TO public USING ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true)) WITH CHECK ("user_addresses"."tenant_id" = current_setting('app.current_tenant_id', true) and "user_addresses"."user_id" = current_setting('app.current_user_id', true));--> statement-breakpoint
ALTER POLICY "audit_events_admin_read" ON "audit_events" TO public USING ("audit_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "chargeback_evidence_admin_read" ON "chargeback_evidence" TO public USING ("chargeback_evidence"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "featured_items_admin_manage" ON "featured_items" TO public USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "featured_items_public_read" ON "featured_items" TO public USING ("featured_items"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "email_audit_log_admin_read" ON "email_audit_log" TO public USING ("email_audit_log"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "email_subscribers_admin_manage" ON "email_subscribers" TO public USING ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "email_subscribers_public_insert" ON "email_subscribers" TO public WITH CHECK ("email_subscribers"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "contact_messages_admin_read" ON "contact_messages" TO public USING ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "contact_messages_public_insert" ON "contact_messages" TO public WITH CHECK ("contact_messages"."tenant_id" = current_setting('app.current_tenant_id', true));--> statement-breakpoint
ALTER POLICY "nexus_registrations_admin_manage" ON "nexus_registrations" TO public USING ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("nexus_registrations"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "state_sales_tracking_admin_read" ON "state_sales_tracking" TO public USING ("state_sales_tracking"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "tenant_tax_settings_admin_manage" ON "tenant_tax_settings" TO public USING ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_tax_settings"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "shipping_tracking_admin_read" ON "shipping_tracking_events" TO public USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');--> statement-breakpoint
ALTER POLICY "shipping_tracking_customer_read" ON "shipping_tracking_events" TO public USING ("shipping_tracking_events"."tenant_id" = current_setting('app.current_tenant_id', true) and exists (
      select 1
      from "orders"
      where "orders"."id" = "shipping_tracking_events"."order_id"
        and "orders"."tenant_id" = current_setting('app.current_tenant_id', true)
        and "orders"."user_id" = current_setting('app.current_user_id', true)
    ));--> statement-breakpoint
ALTER POLICY "tenant_shipping_config_admin_manage" ON "tenant_shipping_config" TO public USING ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin') WITH CHECK ("tenant_shipping_config"."tenant_id" = current_setting('app.current_tenant_id', true) and current_setting('app.current_user_role', true) = 'admin');