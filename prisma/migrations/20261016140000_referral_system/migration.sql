-- Referral attribution already exists in the User model in some deployments.
-- Keep this migration idempotent so it is safe across those environments.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
CREATE INDEX IF NOT EXISTS "users_referredBy_idx" ON "users"("referredBy");
