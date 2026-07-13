-- Safe additive-only change: User.vehicleNumber for delivery auto-fill.
-- No enum drops, no table rewrites, no data deletion.
-- Idempotent: safe to run more than once.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "vehicleNumber" TEXT;
