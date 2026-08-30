-- req-007: liability-ledger-centric indirect expenses

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "liabilityLedgerId" INTEGER;
CREATE INDEX IF NOT EXISTS "Expense_liabilityLedgerId_idx" ON "Expense"("liabilityLedgerId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_liabilityLedgerId_fkey"
  FOREIGN KEY ("liabilityLedgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill liabilityLedgerId from vendor AP sub-ledger for existing indirect expenses
UPDATE "Expense" e
SET "liabilityLedgerId" = v."ledgerId"
FROM "Vendor" v
WHERE e."vendorId" = v.id
  AND e."vendorExpenseStatus" IS NOT NULL
  AND e."liabilityLedgerId" IS NULL
  AND v."ledgerId" IS NOT NULL;

-- Clear vendorId on migrated indirect expense rows (liability is now the identity)
UPDATE "Expense"
SET "vendorId" = NULL
WHERE "vendorExpenseStatus" IS NOT NULL
  AND "liabilityLedgerId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "IndirectExpensePaymentVoucher" (
  "id" SERIAL NOT NULL,
  "voucherNumber" TEXT NOT NULL,
  "liabilityLedgerId" INTEGER NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalAmount" DECIMAL(15,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "bankLedgerId" INTEGER NOT NULL,
  "referenceNo" TEXT,
  "notes" TEXT,
  "active_status" BOOLEAN NOT NULL DEFAULT true,
  "delete_status" BOOLEAN NOT NULL DEFAULT false,
  "cancelledStatus" BOOLEAN NOT NULL DEFAULT false,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" INTEGER,
  CONSTRAINT "IndirectExpensePaymentVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IndirectExpensePaymentVoucher_voucherNumber_key"
  ON "IndirectExpensePaymentVoucher"("voucherNumber");
CREATE INDEX IF NOT EXISTS "IndirectExpensePaymentVoucher_liabilityLedgerId_idx"
  ON "IndirectExpensePaymentVoucher"("liabilityLedgerId");
CREATE INDEX IF NOT EXISTS "IndirectExpensePaymentVoucher_paymentDate_idx"
  ON "IndirectExpensePaymentVoucher"("paymentDate");

ALTER TABLE "IndirectExpensePaymentVoucher" ADD CONSTRAINT "IndirectExpensePaymentVoucher_liabilityLedgerId_fkey"
  FOREIGN KEY ("liabilityLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndirectExpensePaymentVoucher" ADD CONSTRAINT "IndirectExpensePaymentVoucher_bankLedgerId_fkey"
  FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndirectExpensePaymentVoucher" ADD CONSTRAINT "IndirectExpensePaymentVoucher_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndirectExpensePaymentVoucher" ADD CONSTRAINT "IndirectExpensePaymentVoucher_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "IndirectExpensePaymentVoucherItem" (
  "id" SERIAL NOT NULL,
  "voucherId" INTEGER NOT NULL,
  "expenseId" INTEGER NOT NULL,
  "allocatedAmount" DECIMAL(15,2) NOT NULL,
  CONSTRAINT "IndirectExpensePaymentVoucherItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IndirectExpensePaymentVoucherItem_voucherId_idx"
  ON "IndirectExpensePaymentVoucherItem"("voucherId");
CREATE INDEX IF NOT EXISTS "IndirectExpensePaymentVoucherItem_expenseId_idx"
  ON "IndirectExpensePaymentVoucherItem"("expenseId");

ALTER TABLE "IndirectExpensePaymentVoucherItem" ADD CONSTRAINT "IndirectExpensePaymentVoucherItem_voucherId_fkey"
  FOREIGN KEY ("voucherId") REFERENCES "IndirectExpensePaymentVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IndirectExpensePaymentVoucherItem" ADD CONSTRAINT "IndirectExpensePaymentVoucherItem_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
