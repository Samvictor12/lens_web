-- AlterTable
ALTER TABLE "LensOffers" ADD COLUMN     "exchange_lens_id" INTEGER;

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_exchange_lens_id_fkey" FOREIGN KEY ("exchange_lens_id") REFERENCES "LensProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
