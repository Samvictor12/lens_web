-- Add tinting_price column to LensTintingMaster table
ALTER TABLE "LensTintingMaster" ADD COLUMN IF NOT EXISTS "tinting_price" DOUBLE PRECISION;
