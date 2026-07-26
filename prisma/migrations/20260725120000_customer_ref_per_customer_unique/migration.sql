-- Allow same customer reference across different customers (SO).
-- Keep uniqueness only within the same customer.
DROP INDEX IF EXISTS "SaleOrder_customerRefNo_lower_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "SaleOrder_customerId_customerRefNo_lower_unique"
ON "SaleOrder" ("customerId", LOWER(TRIM("customerRefNo")))
WHERE "customerRefNo" IS NOT NULL AND TRIM("customerRefNo") <> '';

-- PO reference_id is often the customer ref (or vendor external id).
-- Do not block different customers/SOs from using the same reference.
DROP INDEX IF EXISTS "PurchaseOrder_reference_id_key";
