-- Step 1 for `prisma db push` fallback.
-- Run this first, let it commit, then run
-- scripts/pre-db-push-fitting-rename-02-update-data.sql.

ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'FITTING_READY';
ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'IN_FITTING';
ALTER TYPE "SaleOrderStatusSource" ADD VALUE IF NOT EXISTS 'FITTING';
ALTER TYPE "InventoryItemStatus" ADD VALUE IF NOT EXISTS 'IN_FITTING';
