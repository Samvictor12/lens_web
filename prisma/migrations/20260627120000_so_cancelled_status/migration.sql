-- Add CANCELLED to SaleOrderStatus enum
ALTER TYPE "SaleOrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
