-- Vendor & Payments hub (req-004): due dates, advance credit, indirect vendor expenses

ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "credit_days" INTEGER;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "advance_credit" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "VendorInvoice" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

ALTER TABLE "VendorPaymentVoucher" ADD COLUMN IF NOT EXISTS "advanceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;

ALTER TABLE "VendorPaymentVoucherItem" ADD COLUMN IF NOT EXISTS "expenseId" INTEGER;
CREATE INDEX IF NOT EXISTS "VendorPaymentVoucherItem_expenseId_idx" ON "VendorPaymentVoucherItem"("expenseId");
ALTER TABLE "VendorPaymentVoucherItem" ADD CONSTRAINT "VendorPaymentVoucherItem_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "VendorExpenseStatus" AS ENUM ('MARKED', 'PARTIALLY_PAID', 'PAID');

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendorId" INTEGER;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendorExpenseStatus" "VendorExpenseStatus";
ALTER TABLE "Expense" ALTER COLUMN "paymentMethod" DROP NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "bankLedgerId" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "Expense_vendorId_idx" ON "Expense"("vendorId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
