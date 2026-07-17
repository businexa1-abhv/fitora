-- Foreign keys for finance tables (idempotent)

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_party_user_id_fkey"
    FOREIGN KEY ("party_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "owner_subscriptions" ADD CONSTRAINT "owner_subscriptions_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "finance_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_beneficiary_user_id_fkey"
    FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "merchant_wallets" ADD CONSTRAINT "merchant_wallets_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "merchant_wallets" ADD CONSTRAINT "merchant_wallets_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "merchant_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_beneficiary_user_id_fkey"
    FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_settlement_id_fkey"
    FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "settlement_lines" ADD CONSTRAINT "settlement_lines_commission_id_fkey"
    FOREIGN KEY ("commission_id") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "payouts" ADD CONSTRAINT "payouts_settlement_id_fkey"
    FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_settlement_id_fkey"
    FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "owner_subscriptions_owner_id_status_idx" ON "owner_subscriptions"("owner_id", "status");
CREATE INDEX IF NOT EXISTS "owner_subscriptions_tenant_id_status_idx" ON "owner_subscriptions"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "commission_rules_service_type_is_active_idx" ON "commission_rules"("service_type", "is_active");
CREATE INDEX IF NOT EXISTS "commissions_tenant_id_created_at_idx" ON "commissions"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "merchant_wallets_role_idx" ON "merchant_wallets"("role");
CREATE INDEX IF NOT EXISTS "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");
CREATE INDEX IF NOT EXISTS "settlements_beneficiary_user_id_status_idx" ON "settlements"("beneficiary_user_id", "status");
CREATE INDEX IF NOT EXISTS "webhook_events_provider_status_idx" ON "webhook_events"("provider", "status");
