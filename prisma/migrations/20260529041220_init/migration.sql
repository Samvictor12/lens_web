-- DropIndex
DROP INDEX "public"."idx_LensProductMaster_minThreshold";

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "reconciledBy" INTEGER,
ADD COLUMN     "reconciledNote" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "bankLedgerId" INTEGER,
ADD COLUMN     "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CheckSheetMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "check_key" TEXT NOT NULL,
    "description" TEXT,
    "primary_colour" TEXT,
    "class" TEXT DEFAULT 'General',
    "type" TEXT,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "CheckSheetMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckSheetItem" (
    "id" SERIAL NOT NULL,
    "checkSheetMasterId" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_code" TEXT,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckSheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" SERIAL NOT NULL,
    "config_type" TEXT NOT NULL,
    "printer_name" TEXT,
    "paper_size" TEXT,
    "label_width" INTEGER,
    "label_height" INTEGER,
    "extra_config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'My Company',
    "gstin" TEXT,
    "logo" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "tagline" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPaymentVoucher" (
    "id" SERIAL NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankLedgerId" INTEGER NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "VendorPaymentVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPaymentVoucherItem" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "VendorPaymentVoucherItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ledger_id" INTEGER,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankLedgerId" INTEGER NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "referenceNo" TEXT,
    "paidTo" TEXT,
    "notes" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLog" (
    "id" SERIAL NOT NULL,
    "expenseId" INTEGER NOT NULL,
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "ExpenseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckSheetMaster_name_key" ON "CheckSheetMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CheckSheetMaster_check_key_key" ON "CheckSheetMaster"("check_key");

-- CreateIndex
CREATE UNIQUE INDEX "CheckSheetItem_item_code_key" ON "CheckSheetItem"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "CheckSheetItem_checkSheetMasterId_item_name_key" ON "CheckSheetItem"("checkSheetMasterId", "item_name");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterConfig_config_type_key" ON "PrinterConfig"("config_type");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPaymentVoucher_voucherNumber_key" ON "VendorPaymentVoucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "VendorPaymentVoucher_vendorId_idx" ON "VendorPaymentVoucher"("vendorId");

-- CreateIndex
CREATE INDEX "VendorPaymentVoucher_paymentDate_idx" ON "VendorPaymentVoucher"("paymentDate");

-- CreateIndex
CREATE INDEX "VendorPaymentVoucherItem_voucherId_idx" ON "VendorPaymentVoucherItem"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseNumber_key" ON "Expense"("expenseNumber");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseLog_expenseId_idx" ON "ExpenseLog"("expenseId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bankLedgerId_fkey" FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetMaster" ADD CONSTRAINT "CheckSheetMaster_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetMaster" ADD CONSTRAINT "CheckSheetMaster_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetItem" ADD CONSTRAINT "CheckSheetItem_checkSheetMasterId_fkey" FOREIGN KEY ("checkSheetMasterId") REFERENCES "CheckSheetMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterConfig" ADD CONSTRAINT "PrinterConfig_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucher" ADD CONSTRAINT "VendorPaymentVoucher_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucher" ADD CONSTRAINT "VendorPaymentVoucher_bankLedgerId_fkey" FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucher" ADD CONSTRAINT "VendorPaymentVoucher_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucher" ADD CONSTRAINT "VendorPaymentVoucher_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucherItem" ADD CONSTRAINT "VendorPaymentVoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "VendorPaymentVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentVoucherItem" ADD CONSTRAINT "VendorPaymentVoucherItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bankLedgerId_fkey" FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLog" ADD CONSTRAINT "ExpenseLog_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLog" ADD CONSTRAINT "ExpenseLog_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
