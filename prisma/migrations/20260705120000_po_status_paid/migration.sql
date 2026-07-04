-- PO vendor payment complete → PAID (no partial-paid stage)
ALTER TYPE "POStatus" ADD VALUE IF NOT EXISTS 'PAID';
