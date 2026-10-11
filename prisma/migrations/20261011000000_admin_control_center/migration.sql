ALTER TABLE "admin_audit_logs"
  ADD COLUMN "previousValue" TEXT,
  ADD COLUMN "newValue" TEXT,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE TABLE "site_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "valueType" TEXT NOT NULL DEFAULT 'string',
  "description" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

CREATE TABLE "payment_methods" (
  "id" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "minDeposit" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "maxDeposit" DOUBLE PRECISION,
  "requiredConfirmations" INTEGER NOT NULL DEFAULT 1,
  "requiresTxHash" BOOLEAN NOT NULL DEFAULT true,
  "requiresProof" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isMaintenance" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_methods_isActive_displayOrder_idx" ON "payment_methods"("isActive", "displayOrder");

INSERT INTO "site_settings" ("id", "key", "value", "valueType", "description", "updatedAt") VALUES
  ('setting_maintenance_mode', 'maintenance_mode', 'false', 'boolean', 'Temporarily disable customer actions', CURRENT_TIMESTAMP),
  ('setting_registration_enabled', 'registration_enabled', 'true', 'boolean', 'Allow new customer registration', CURRENT_TIMESTAMP),
  ('setting_kyc_required_for_withdrawal', 'kyc_required_for_withdrawal', 'true', 'boolean', 'Require approved KYC before withdrawals', CURRENT_TIMESTAMP),
  ('setting_public_activity_enabled', 'public_activity_enabled', 'true', 'boolean', 'Show the public Network Pulse widget', CURRENT_TIMESTAMP),
  ('setting_public_activity_preview_mode', 'public_activity_preview_mode', 'true', 'boolean', 'Use generic preview activity before a live audience exists', CURRENT_TIMESTAMP),
  ('setting_withdrawals_enabled', 'withdrawals_enabled', 'true', 'boolean', 'Allow customers to submit withdrawals', CURRENT_TIMESTAMP),
  ('setting_roi_enabled', 'roi_enabled', 'true', 'boolean', 'Allow the ROI processor to credit daily installments', CURRENT_TIMESTAMP),
  ('setting_roi_email_enabled', 'roi_email_enabled', 'true', 'boolean', 'Send daily ROI notifications', CURRENT_TIMESTAMP),
  ('setting_support_email', 'support_email', 'support@aurexconnect.site', 'string', 'Customer support contact', CURRENT_TIMESTAMP),
  ('setting_site_name', 'site_name', 'AurexConnect', 'string', 'Displayed brand name', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "payment_methods" ("id", "currency", "name", "network", "address", "minDeposit", "displayOrder", "createdAt", "updatedAt") VALUES
  ('payment_btc', 'BTC', 'Bitcoin', 'Bitcoin Mainnet', 'bc1qxy2kgdygjrsqtzqz2n0yrf2493p83kkfjhx0wlh', 50, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('payment_eth', 'ETH', 'Ethereum', 'Ethereum Mainnet', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 50, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('payment_usdt', 'USDT', 'Tether', 'TRC20', 'TN3W4T8AYBFn9NkqL3b4W8ZkbPbXsAcRsM', 50, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
