-- AlterEnum: Add EXCHANGE_COATING_PRICE to OfferType
BEGIN;
CREATE TYPE "OfferType_new" AS ENUM ('VALUE', 'PERCENTAGE', 'EXCHANGE_PRODUCT', 'EXCHANGE_COATING_PRICE');
ALTER TABLE "LensOffers" ALTER COLUMN "offerType" TYPE "OfferType_new" USING ("offerType"::text::"OfferType_new");
ALTER TYPE "OfferType" RENAME TO "OfferType_old";
ALTER TYPE "OfferType_new" RENAME TO "OfferType";
DROP TYPE "OfferType_old";
COMMIT;

-- AlterTable: Add exchange_coating_id and withDiscount columns to LensOffers
ALTER TABLE "LensOffers" ADD COLUMN "exchange_coating_id" INTEGER;
ALTER TABLE "LensOffers" ADD COLUMN "withDiscount" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_exchange_coating_id_fkey" FOREIGN KEY ("exchange_coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
