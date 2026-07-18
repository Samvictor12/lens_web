-- M2: Alternate lens substitution audit note on SaleOrder.
-- Safe additive-only, idempotent. Does NOT touch lens_id/coating_id/category_id/pricing.
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "alternateLensNote" TEXT;
