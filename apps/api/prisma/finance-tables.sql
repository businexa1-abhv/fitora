-- FitOra finance tables (additive only)

CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" "OwnerSubscriptionPlanCode" NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "gst_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.18,
  "features" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "finance_invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" "FinanceInvoiceType" NOT NULL,
  "invoice_number" VARCHAR(40) NOT NULL UNIQUE,
  "party_user_id" UUID NOT NULL,
  "tenant_id" UUID,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "gst" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL,
  "line_items" JSONB NOT NULL,
  "pdf_url" VARCHAR(500),
  "settlement_id" UUID UNIQUE,
  "payment_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "owner_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "gst" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "status" "OwnerSubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "grace_ends_at" TIMESTAMP(3),
  "payment_id" UUID UNIQUE,
  "invoice_id" UUID UNIQUE,
  "auto_renew" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "commission_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "service_type" "CommissionServiceType" NOT NULL,
  "rate_percent" DECIMAL(5,2) NOT NULL,
  "flat_fee" DECIMAL(12,2),
  "tenant_id" UUID,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "commissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL UNIQUE,
  "service_type" "CommissionServiceType" NOT NULL,
  "gross_amount" DECIMAL(12,2) NOT NULL,
  "rate_percent" DECIMAL(5,2) NOT NULL,
  "commission_amount" DECIMAL(12,2) NOT NULL,
  "net_amount" DECIMAL(12,2) NOT NULL,
  "tenant_id" UUID,
  "beneficiary_user_id" UUID,
  "is_receivable" BOOLEAN NOT NULL DEFAULT false,
  "status" VARCHAR(30) NOT NULL DEFAULT 'POSTED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "merchant_wallets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" UUID NOT NULL,
  "tenant_id" UUID,
  "role" "MerchantWalletRole" NOT NULL,
  "available" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "pending" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lifetime_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "lifetime_paid_out" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("owner_user_id", "role")
);

CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(60) NOT NULL UNIQUE,
  "name" VARCHAR(120) NOT NULL,
  "type" "LedgerAccountType" NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ledger_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "idempotency_key" VARCHAR(120) NOT NULL UNIQUE,
  "reference_type" VARCHAR(60) NOT NULL,
  "reference_id" UUID NOT NULL,
  "memo" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "transaction_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "wallet_id" UUID,
  "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "entry_type" "LedgerEntryType" NOT NULL,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "settlements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "beneficiary_user_id" UUID NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "gross" DECIMAL(12,2) NOT NULL,
  "commission" DECIMAL(12,2) NOT NULL,
  "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "adjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "net" DECIMAL(12,2) NOT NULL,
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "scheduled_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "settlement_lines" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "settlement_id" UUID NOT NULL,
  "payment_id" UUID,
  "commission_id" UUID,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" VARCHAR(300) NOT NULL
);

CREATE TABLE IF NOT EXISTS "payouts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "settlement_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
  "razorpay_payout_id" VARCHAR(100) UNIQUE,
  "failure_reason" VARCHAR(500),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" VARCHAR(40) NOT NULL,
  "event_id" VARCHAR(120) NOT NULL UNIQUE,
  "event_type" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "processed_at" TIMESTAMP(3),
  "error" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
