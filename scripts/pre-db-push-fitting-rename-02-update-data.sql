-- Step 2 for `prisma db push` fallback.
-- Run after scripts/pre-db-push-fitting-rename-01-add-enums.sql has committed.

UPDATE "SaleOrder"
SET "status" = 'FITTING_READY'
WHERE "status"::text = 'PRODUCTION_READY';

UPDATE "SaleOrder"
SET "status" = 'IN_FITTING'
WHERE "status"::text = 'IN_PRODUCTION';

UPDATE "InventoryItem"
SET "status" = 'IN_FITTING'
WHERE "status"::text = 'IN_PRODUCTION';

UPDATE "SaleOrderStatusLog"
SET "source" = 'FITTING'
WHERE "source"::text = 'PRODUCTION';

UPDATE "SaleOrderStatusLog"
SET "fromStatus" = CASE "fromStatus"
  WHEN 'PRODUCTION_READY' THEN 'FITTING_READY'
  WHEN 'IN_PRODUCTION' THEN 'IN_FITTING'
  ELSE "fromStatus"
END
WHERE "fromStatus" IN ('PRODUCTION_READY', 'IN_PRODUCTION');

UPDATE "SaleOrderStatusLog"
SET "toStatus" = CASE "toStatus"
  WHEN 'PRODUCTION_READY' THEN 'FITTING_READY'
  WHEN 'IN_PRODUCTION' THEN 'IN_FITTING'
  ELSE "toStatus"
END
WHERE "toStatus" IN ('PRODUCTION_READY', 'IN_PRODUCTION');

UPDATE "Permission"
SET "subject" = 'fitting'
WHERE "subject" = 'production';
