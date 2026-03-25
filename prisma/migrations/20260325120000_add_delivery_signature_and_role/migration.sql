-- Add deliverySignature column to SaleOrder
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "deliverySignature" TEXT;

-- Add Delivery Person role if not exists
INSERT INTO "Role" ("name", "createdAt", "updatedAt") VALUES ('Delivery Person', NOW(), NOW()) ON CONFLICT ("name") DO NOTHING;
