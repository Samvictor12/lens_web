-- M2: Income From/To ledgers (Cash / Bank / Capital transfer posting)
-- Prefer backfill toLedgerId = bankLedgerId; keep bankLedgerId nullable for dual-read.

ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "fromLedgerId" INTEGER;
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "toLedgerId" INTEGER;

-- Backfill existing rows: To = former deposit account; From = Cash in Hand (AC-1001) when available, else same as To
UPDATE "Income" i
SET "toLedgerId" = i."bankLedgerId"
WHERE i."toLedgerId" IS NULL AND i."bankLedgerId" IS NOT NULL;

UPDATE "Income" i
SET "fromLedgerId" = COALESCE(
  (SELECT l.id FROM "Ledger" l WHERE l."ledgerCode" = 'AC-1001' AND l.delete_status = false LIMIT 1),
  i."bankLedgerId"
)
WHERE i."fromLedgerId" IS NULL AND i."bankLedgerId" IS NOT NULL;

-- If From ended up equal to To after cash fallback missing, leave as-is (historical); new creates enforce distinct.

-- Make From/To required once backfilled (only if no nulls remain)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Income" WHERE "fromLedgerId" IS NULL OR "toLedgerId" IS NULL) THEN
    ALTER TABLE "Income" ALTER COLUMN "fromLedgerId" SET NOT NULL;
    ALTER TABLE "Income" ALTER COLUMN "toLedgerId" SET NOT NULL;
  END IF;
END $$;

-- Relax legacy bankLedgerId (nullable for dual-read / new rows may omit)
ALTER TABLE "Income" ALTER COLUMN "bankLedgerId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "Income_fromLedgerId_idx" ON "Income"("fromLedgerId");
CREATE INDEX IF NOT EXISTS "Income_toLedgerId_idx" ON "Income"("toLedgerId");

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_fromLedgerId_fkey"
    FOREIGN KEY ("fromLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Income" ADD CONSTRAINT "Income_toLedgerId_fkey"
    FOREIGN KEY ("toLedgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
