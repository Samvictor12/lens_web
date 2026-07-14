-- Safe additive-only: Customer.credit_days (invoice due-date offset in days).
-- Idempotent — safe if column already exists. No data loss.

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "credit_days" INTEGER;
