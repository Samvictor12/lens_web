-- Allow existing invoices without a bill date (do not require backfill).
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "billDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ALTER COLUMN "billDate" DROP NOT NULL;
