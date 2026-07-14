-- Safe additive-only: Customer.advance_credit (prepaid balance).
-- Idempotent — safe if column already exists. No data loss.

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "advance_credit" DOUBLE PRECISION NOT NULL DEFAULT 0;
