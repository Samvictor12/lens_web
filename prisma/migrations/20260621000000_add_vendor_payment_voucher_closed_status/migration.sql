-- AlterTable: Add closed status tracking to VendorPaymentVoucher
ALTER TABLE "VendorPaymentVoucher"
  ADD COLUMN "closedStatus" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "closedAt" TIMESTAMP(3);
