-- CompanySettings: configurable GST rates and other attributes
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "customAttributes" JSONB;

-- Case-insensitive unique customer reference (non-empty only)
CREATE UNIQUE INDEX IF NOT EXISTS "SaleOrder_customerRefNo_lower_unique"
ON "SaleOrder" (LOWER(TRIM("customerRefNo")))
WHERE "customerRefNo" IS NOT NULL AND TRIM("customerRefNo") <> '';
