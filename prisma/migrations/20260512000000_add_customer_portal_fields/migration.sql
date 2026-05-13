-- Add Customer Portal fields to Customer table
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_token" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_pin_hash" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_activated_at" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_pin_changed_at" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "portal_last_accessed" TIMESTAMP(3);

-- Add unique constraint on portal_token
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_portal_token_key" UNIQUE ("portal_token");
