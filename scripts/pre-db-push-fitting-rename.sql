-- Use this only if you are applying the Production -> Fitting rename with
-- `prisma db push`.
--
-- Preferred path:
--   npx prisma migrate dev
-- or, on a deployed database:
--   npx prisma migrate deploy
--
-- Why this exists:
-- `db push` does not run the hand-written enum rename migration. It may try to
-- replace enums while existing rows still contain PRODUCTION / IN_PRODUCTION
-- values, which fails with "invalid input value for enum ... PRODUCTION".
--
-- Run this SQL first in psql/Adminer/your SQL client with autocommit enabled,
-- then run `npx prisma db push`.
--
-- If using `npx prisma db execute`, run these two files instead:
--   npx prisma db execute --schema prisma/schema.prisma --file scripts/pre-db-push-fitting-rename-01-add-enums.sql
--   npx prisma db execute --schema prisma/schema.prisma --file scripts/pre-db-push-fitting-rename-02-update-data.sql

ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'FITTING_READY';
ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'IN_FITTING';
ALTER TYPE "SaleOrderStatusSource" ADD VALUE IF NOT EXISTS 'FITTING';
ALTER TYPE "InventoryItemStatus" ADD VALUE IF NOT EXISTS 'IN_FITTING';

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
