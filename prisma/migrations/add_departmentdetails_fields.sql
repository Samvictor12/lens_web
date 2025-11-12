-- Migration: Add missing fields to DepartmentDetails table
-- This migration adds active_status, delete_status, createdBy, updatedAt, and updatedBy columns

-- Step 1: Add columns with nullable constraints first
ALTER TABLE "DepartmentDetails" 
ADD COLUMN IF NOT EXISTS "active_status" BOOLEAN,
ADD COLUMN IF NOT EXISTS "delete_status" BOOLEAN,
ADD COLUMN IF NOT EXISTS "createdBy" INTEGER,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedBy" INTEGER;

-- Step 2: Set default values for existing rows (assuming user with id=1 exists)
UPDATE "DepartmentDetails" 
SET 
  "active_status" = true,
  "delete_status" = false,
  "createdBy" = 1,
  "updatedAt" = NOW(),
  "updatedBy" = NULL
WHERE "active_status" IS NULL;

-- Step 3: Add NOT NULL constraints and defaults for future inserts
ALTER TABLE "DepartmentDetails" 
ALTER COLUMN "active_status" SET NOT NULL,
ALTER COLUMN "active_status" SET DEFAULT true,
ALTER COLUMN "delete_status" SET NOT NULL,
ALTER COLUMN "delete_status" SET DEFAULT false,
ALTER COLUMN "createdBy" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Add foreign key constraints for user relations
ALTER TABLE "DepartmentDetails"
ADD CONSTRAINT "DepartmentDetails_createdBy_fkey" 
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DepartmentDetails"
ADD CONSTRAINT "DepartmentDetails_updatedBy_fkey" 
FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: If you need to set a different user ID for existing rows, 
-- modify the UPDATE statement above before running this migration.
