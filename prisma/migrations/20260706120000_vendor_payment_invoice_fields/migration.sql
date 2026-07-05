-- Vendor payment invoice capture + auto-closed vouchers
ALTER TABLE "VendorPaymentVoucher"
  ADD COLUMN "subtotalAmount" DECIMAL(15,2),
  ADD COLUMN "taxAmount" DECIMAL(15,2),
  ADD COLUMN "vendorInvoiceNo" TEXT,
  ADD COLUMN "invoiceCopyPath" TEXT;

ALTER TABLE "VendorPaymentVoucherItem"
  ADD COLUMN "subtotalAmount" DECIMAL(15,2),
  ADD COLUMN "taxAmount" DECIMAL(15,2);

-- New vouchers default to closed; existing open vouchers stay as-is
ALTER TABLE "VendorPaymentVoucher" ALTER COLUMN "closedStatus" SET DEFAULT true;
ALTER TABLE "CustomerPaymentVoucher" ALTER COLUMN "closedStatus" SET DEFAULT true;
