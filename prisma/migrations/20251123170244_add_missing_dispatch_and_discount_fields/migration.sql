-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "additionalPrice" JSONB,
ADD COLUMN     "fittingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
