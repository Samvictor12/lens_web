-- Add CLOSED value to SaleOrderStatus enum
ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

-- Add parentId column for parent/child SO relationship
ALTER TABLE "SaleOrder" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;

-- Add foreign key constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'SaleOrder_parentId_fkey'
  ) THEN
    ALTER TABLE "SaleOrder" 
      ADD CONSTRAINT "SaleOrder_parentId_fkey" 
      FOREIGN KEY ("parentId") REFERENCES "SaleOrder"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
