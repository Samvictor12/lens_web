-- CreateTable
CREATE TABLE "LensIndexMaster" (
    "id" SERIAL NOT NULL,
    "index_name" TEXT NOT NULL,
    "description" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensIndexMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LensIndexMaster_index_name_key" ON "LensIndexMaster"("index_name");

-- AddForeignKey
ALTER TABLE "LensIndexMaster" ADD CONSTRAINT "LensIndexMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LensIndexMaster" ADD CONSTRAINT "LensIndexMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default index values
INSERT INTO "LensIndexMaster" ("index_name", "description", "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy")
VALUES
  ('1.56', 'Standard index 1.56', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('1.59', 'Mid index 1.59', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('1.61', 'Mid-high index 1.61', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('1.67', 'High index 1.67', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
  ('1.74', 'Ultra high index 1.74', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
ON CONFLICT ("index_name") DO NOTHING;

-- AlterTable LensProductMaster
ALTER TABLE "LensProductMaster" ADD COLUMN "index_id" INTEGER;
ALTER TABLE "LensProductMaster" ADD COLUMN "add_extra_charge" DOUBLE PRECISION DEFAULT 0;

-- Backfill index_id from legacy index_value
UPDATE "LensProductMaster" p
SET "index_id" = i."id"
FROM "LensIndexMaster" i
WHERE p."index_value" IS NOT NULL
  AND i."index_name" = CASE p."index_value"
    WHEN 156 THEN '1.56'
    WHEN 159 THEN '1.59'
    WHEN 161 THEN '1.61'
    WHEN 167 THEN '1.67'
    WHEN 174 THEN '1.74'
    ELSE NULL
  END;

ALTER TABLE "LensProductMaster" DROP COLUMN IF EXISTS "index_value";

ALTER TABLE "LensProductMaster" ADD CONSTRAINT "LensProductMaster_index_id_fkey" FOREIGN KEY ("index_id") REFERENCES "LensIndexMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend OfferType enum
ALTER TYPE "OfferType" ADD VALUE IF NOT EXISTS 'EXCHANGE_BRAND_PRICE';
ALTER TYPE "OfferType" ADD VALUE IF NOT EXISTS 'COATING_PROMOTION';

-- AlterTable LensOffers
ALTER TABLE "LensOffers" ADD COLUMN "brand_id" INTEGER;
ALTER TABLE "LensOffers" ADD COLUMN "exchange_brand_id" INTEGER;
ALTER TABLE "LensOffers" ADD COLUMN "coating_ids" JSONB;

ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "LensBrandMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_exchange_brand_id_fkey" FOREIGN KEY ("exchange_brand_id") REFERENCES "LensBrandMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
