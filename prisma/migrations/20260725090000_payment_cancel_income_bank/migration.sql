-- M1: Payment cancel / reverse fields on vouchers
ALTER TABLE "CustomerPaymentVoucher" ADD COLUMN IF NOT EXISTS "cancelledStatus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomerPaymentVoucher" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

ALTER TABLE "VendorPaymentVoucher" ADD COLUMN IF NOT EXISTS "cancelledStatus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VendorPaymentVoucher" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- M6: ReferenceType.INCOME
ALTER TYPE "ReferenceType" ADD VALUE IF NOT EXISTS 'INCOME';

-- M6: IncomeCategory
CREATE TABLE IF NOT EXISTS "IncomeCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ledger_id" INTEGER,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "IncomeCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IncomeCategory_name_key" ON "IncomeCategory"("name");

-- M6: Income
CREATE TABLE IF NOT EXISTS "Income" (
    "id" SERIAL NOT NULL,
    "incomeNumber" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankLedgerId" INTEGER NOT NULL,
    "incomeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "referenceNo" TEXT,
    "notes" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "delete_status" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Income_incomeNumber_key" ON "Income"("incomeNumber");
CREATE INDEX IF NOT EXISTS "Income_incomeDate_idx" ON "Income"("incomeDate");
CREATE INDEX IF NOT EXISTS "Income_categoryId_idx" ON "Income"("categoryId");

-- M6: IncomeLog
CREATE TABLE IF NOT EXISTS "IncomeLog" (
    "id" SERIAL NOT NULL,
    "incomeId" INTEGER NOT NULL,
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "IncomeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IncomeLog_incomeId_idx" ON "IncomeLog"("incomeId");

-- Foreign keys (idempotent via DO blocks)
DO $$ BEGIN
  ALTER TABLE "IncomeCategory" ADD CONSTRAINT "IncomeCategory_ledger_id_fkey"
    FOREIGN KEY ("ledger_id") REFERENCES "Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncomeCategory" ADD CONSTRAINT "IncomeCategory_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncomeCategory" ADD CONSTRAINT "IncomeCategory_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "IncomeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_bankLedgerId_fkey"
    FOREIGN KEY ("bankLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncomeLog" ADD CONSTRAINT "IncomeLog_incomeId_fkey"
    FOREIGN KEY ("incomeId") REFERENCES "Income"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IncomeLog" ADD CONSTRAINT "IncomeLog_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
