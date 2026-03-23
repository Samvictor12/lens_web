/*
  Warnings:

  - The values [PENDING,ORDERED] on the enum `POStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('VALUE', 'PERCENTAGE', 'EXCHANGE_PRODUCT');

-- AlterEnum
BEGIN;
CREATE TYPE "POStatus_new" AS ENUM ('DRAFT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICE_RECEIVED', 'CLOSED', 'CANCELLED');
ALTER TABLE "public"."PurchaseOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE "POStatus_new" USING ("status"::text::"POStatus_new");
ALTER TYPE "POStatus" RENAME TO "POStatus_old";
ALTER TYPE "POStatus_new" RENAME TO "POStatus";
DROP TYPE "public"."POStatus_old";
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "offer_id" INTEGER;

-- CreateTable
CREATE TABLE "LensOffers" (
    "id" SERIAL NOT NULL,
    "offerName" TEXT NOT NULL,
    "description" TEXT,
    "offerType" "OfferType" NOT NULL,
    "discountValue" DOUBLE PRECISION,
    "discountPercentage" DOUBLE PRECISION,
    "offerPrice" DOUBLE PRECISION,
    "lens_id" INTEGER,
    "coating_id" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "LensOffers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderReceipt" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedItems" JSONB NOT NULL,
    "totalReceivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PARTIAL',
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "PurchaseOrderReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderReceipt_receiptNumber_key" ON "PurchaseOrderReceipt"("receiptNumber");

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_lens_id_fkey" FOREIGN KEY ("lens_id") REFERENCES "LensProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_coating_id_fkey" FOREIGN KEY ("coating_id") REFERENCES "LensCoatingMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LensOffers" ADD CONSTRAINT "LensOffers_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderReceipt" ADD CONSTRAINT "PurchaseOrderReceipt_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "LensOffers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
