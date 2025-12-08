-- Drop Base and Bled columns from SaleOrder table
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "rightBase";
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "rightBaseSize";
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "rightBled";
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "leftBase";
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "leftBaseSize";
ALTER TABLE "SaleOrder" DROP COLUMN IF EXISTS "leftBled";
