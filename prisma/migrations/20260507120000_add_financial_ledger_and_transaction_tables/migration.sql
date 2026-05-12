-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'JOURNAL', 'CONTRA', 'OPENING_BALANCE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('SALE_ORDER', 'PURCHASE_ORDER', 'INVOICE', 'PAYMENT', 'RECEIPT', 'MANUAL');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "Ledger" (
    "id" SERIAL NOT NULL,
    "ledgerCode" TEXT NOT NULL,
    "ledgerName" TEXT NOT NULL,
    "ledgerType" "LedgerType" NOT NULL,
    "parentLedgerId" INTEGER,
    "openingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "isSystemLedger" BOOLEAN NOT NULL DEFAULT false,
    "bankDetails" JSONB,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" SERIAL NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" "TransactionType" NOT NULL,
    "referenceType" "ReferenceType",
    "referenceId" INTEGER,
    "referenceNumber" TEXT,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "attachments" JSONB,
    "notes" TEXT,
    "isPosted" BOOLEAN NOT NULL DEFAULT true,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionEntry" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "ledgerId" INTEGER NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "costCenter" TEXT,
    "projectCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "TransactionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_ledgerCode_key" ON "Ledger"("ledgerCode");

-- CreateIndex
CREATE INDEX "Ledger_ledgerType_idx" ON "Ledger"("ledgerType");

-- CreateIndex
CREATE INDEX "Ledger_parentLedgerId_idx" ON "Ledger"("parentLedgerId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_transactionNumber_key" ON "FinancialTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionDate_idx" ON "FinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "FinancialTransaction_transactionType_idx" ON "FinancialTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "FinancialTransaction_referenceType_referenceId_idx" ON "FinancialTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_isPosted_idx" ON "FinancialTransaction"("isPosted");

-- CreateIndex
CREATE INDEX "TransactionEntry_transactionId_idx" ON "TransactionEntry"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionEntry_ledgerId_idx" ON "TransactionEntry"("ledgerId");

-- CreateIndex
CREATE INDEX "TransactionEntry_entryType_idx" ON "TransactionEntry"("entryType");

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_parentLedgerId_fkey" FOREIGN KEY ("parentLedgerId") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
