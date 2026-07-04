-- Customer Payment Voucher + advance credit on Customer

-- Add advance_credit to Customer
ALTER TABLE "Customer" ADD COLUMN "advance_credit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CustomerPaymentVoucher header
CREATE TABLE "CustomerPaymentVoucher" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "advanceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankLedgerId" INTEGER NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "closedStatus" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "CustomerPaymentVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPaymentVoucher_receiptNumber_key" ON "CustomerPaymentVoucher"("receiptNumber");
CREATE INDEX "CustomerPaymentVoucher_customerId_idx" ON "CustomerPaymentVoucher"("customerId");
CREATE INDEX "CustomerPaymentVoucher_paymentDate_idx" ON "CustomerPaymentVoucher"("paymentDate");

ALTER TABLE "CustomerPaymentVoucher" ADD CONSTRAINT "CustomerPaymentVoucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentVoucher" ADD CONSTRAINT "CustomerPaymentVoucher_bankLedgerId_fkey" FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentVoucher" ADD CONSTRAINT "CustomerPaymentVoucher_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentVoucher" ADD CONSTRAINT "CustomerPaymentVoucher_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CustomerPaymentVoucherItem lines
CREATE TABLE "CustomerPaymentVoucherItem" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CustomerPaymentVoucherItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerPaymentVoucherItem_voucherId_idx" ON "CustomerPaymentVoucherItem"("voucherId");

ALTER TABLE "CustomerPaymentVoucherItem" ADD CONSTRAINT "CustomerPaymentVoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "CustomerPaymentVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentVoucherItem" ADD CONSTRAINT "CustomerPaymentVoucherItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link Payment rows to parent voucher
ALTER TABLE "Payment" ADD COLUMN "voucherId" INTEGER;
CREATE INDEX "Payment_voucherId_idx" ON "Payment"("voucherId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "CustomerPaymentVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
