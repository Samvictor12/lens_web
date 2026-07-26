-- CompanySettings: configurable GST rates and other attributes
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "customAttributes" JSONB;

-- Per-customer unique customer reference (same ref allowed across different customers)
DROP INDEX IF EXISTS "SaleOrder_customerRefNo_lower_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "SaleOrder_customerId_customerRefNo_lower_unique"
ON "SaleOrder" ("customerId", LOWER(TRIM("customerRefNo")))
WHERE "customerRefNo" IS NOT NULL AND TRIM("customerRefNo") <> '';
