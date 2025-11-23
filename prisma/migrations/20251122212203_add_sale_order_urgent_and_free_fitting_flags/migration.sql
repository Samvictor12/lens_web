-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "freeFitting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urgentOrder" BOOLEAN NOT NULL DEFAULT false;
