-- Migration: Add missing fields to businessCategory table
-- Date: 2025-11-12
-- Description: Add active_status, delete_status, createdBy, and updatedBy columns

-- Add active_status column with default true
ALTER TABLE "businessCategory" 
ADD COLUMN IF NOT EXISTS "active_status" BOOLEAN NOT NULL DEFAULT true;

-- Add delete_status column with default false
ALTER TABLE "businessCategory" 
ADD COLUMN IF NOT EXISTS "delete_status" BOOLEAN NOT NULL DEFAULT false;

-- Add createdBy column (required, defaulting to 1 for existing records)
ALTER TABLE "businessCategory" 
ADD COLUMN IF NOT EXISTS "createdBy" INTEGER NOT NULL DEFAULT 1;

-- Add updatedBy column (optional, nullable)
ALTER TABLE "businessCategory" 
ADD COLUMN IF NOT EXISTS "updatedBy" INTEGER;

-- Add foreign key constraints for createdBy and updatedBy
ALTER TABLE "businessCategory" 
ADD CONSTRAINT IF NOT EXISTS "businessCategory_createdBy_fkey" 
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "businessCategory" 
ADD CONSTRAINT IF NOT EXISTS "businessCategory_updatedBy_fkey" 
FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
