-- M5: Invoice-first vendor payment workflow — VendorInvoice registered against PO(s),
-- payments then allocate against outstanding VendorInvoice rows. Vendor CN/DN documents.

-- CreateEnum
CREATE TYPE "VendorInvoiceStatus" AS ENUM ('OUTSTANDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- AlterEnum: ReferenceType gains vendor invoice / note reference kinds
ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'VENDOR_INVOICE';
ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'VENDOR_CREDIT_NOTE';
ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'VENDOR_DEBIT_NOTE';

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "supplierInvoiceNo" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalAmount" DECIMAL(15,2) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "invoiceCopyPath" TEXT,
    "notes" TEXT,
    "status" "VendorInvoiceStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "activeStatus" BOOLEAN NOT NULL DEFAULT true,
    "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoiceItem" (
    "id" SERIAL NOT NULL,
    "vendorInvoiceId" INTEGER NOT NULL,
    "purchaseOrderId" INTEGER NOT NULL,
    "subtotalAmount" DECIMAL(15,2) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "VendorInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorCreditNote" (
    "id" SERIAL NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "vendorInvoiceId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "noteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NoteStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "VendorCreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDebitNote" (
    "id" SERIAL NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "vendorInvoiceId" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "noteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NoteStatus" NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "VendorDebitNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VendorInvoice_invoiceNumber_key" ON "VendorInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "VendorInvoice_vendorId_idx" ON "VendorInvoice"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorInvoice_status_idx" ON "VendorInvoice"("status");

CREATE INDEX IF NOT EXISTS "VendorInvoiceItem_vendorInvoiceId_idx" ON "VendorInvoiceItem"("vendorInvoiceId");
CREATE INDEX IF NOT EXISTS "VendorInvoiceItem_purchaseOrderId_idx" ON "VendorInvoiceItem"("purchaseOrderId");

CREATE UNIQUE INDEX IF NOT EXISTS "VendorCreditNote_noteNumber_key" ON "VendorCreditNote"("noteNumber");
CREATE INDEX IF NOT EXISTS "VendorCreditNote_vendorId_idx" ON "VendorCreditNote"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorCreditNote_vendorInvoiceId_idx" ON "VendorCreditNote"("vendorInvoiceId");

CREATE UNIQUE INDEX IF NOT EXISTS "VendorDebitNote_noteNumber_key" ON "VendorDebitNote"("noteNumber");
CREATE INDEX IF NOT EXISTS "VendorDebitNote_vendorId_idx" ON "VendorDebitNote"("vendorId");
CREATE INDEX IF NOT EXISTS "VendorDebitNote_vendorInvoiceId_idx" ON "VendorDebitNote"("vendorInvoiceId");

ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorInvoiceItem" ADD CONSTRAINT "VendorInvoiceItem_vendorInvoiceId_fkey"
    FOREIGN KEY ("vendorInvoiceId") REFERENCES "VendorInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorInvoiceItem" ADD CONSTRAINT "VendorInvoiceItem_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendorCreditNote" ADD CONSTRAINT "VendorCreditNote_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorCreditNote" ADD CONSTRAINT "VendorCreditNote_vendorInvoiceId_fkey"
    FOREIGN KEY ("vendorInvoiceId") REFERENCES "VendorInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorCreditNote" ADD CONSTRAINT "VendorCreditNote_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorCreditNote" ADD CONSTRAINT "VendorCreditNote_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorDebitNote" ADD CONSTRAINT "VendorDebitNote_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorDebitNote" ADD CONSTRAINT "VendorDebitNote_vendorInvoiceId_fkey"
    FOREIGN KEY ("vendorInvoiceId") REFERENCES "VendorInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorDebitNote" ADD CONSTRAINT "VendorDebitNote_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorDebitNote" ADD CONSTRAINT "VendorDebitNote_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: VendorPaymentVoucherItem now allocates against a VendorInvoice (M5).
-- purchaseOrderId kept nullable for backward-compat with pre-M5 vouchers.
ALTER TABLE "VendorPaymentVoucherItem" ALTER COLUMN "purchaseOrderId" DROP NOT NULL;
ALTER TABLE "VendorPaymentVoucherItem" ADD COLUMN IF NOT EXISTS "vendorInvoiceId" INTEGER;

CREATE INDEX IF NOT EXISTS "VendorPaymentVoucherItem_vendorInvoiceId_idx" ON "VendorPaymentVoucherItem"("vendorInvoiceId");

ALTER TABLE "VendorPaymentVoucherItem" ADD CONSTRAINT "VendorPaymentVoucherItem_vendorInvoiceId_fkey"
    FOREIGN KEY ("vendorInvoiceId") REFERENCES "VendorInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
