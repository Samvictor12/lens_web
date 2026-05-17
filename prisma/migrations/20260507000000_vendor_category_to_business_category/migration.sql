-- Drop old category string column and add businessCategory_id FK on Vendor
ALTER TABLE "Vendor" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "businessCategory_id" INTEGER;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_businessCategory_id_fkey"
  FOREIGN KEY ("businessCategory_id") REFERENCES "businessCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
