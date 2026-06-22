-- CreateEnum: ExpenseClassification (DIRECT → COGS, INDIRECT → Operating Expenses)
CREATE TYPE "ExpenseClassification" AS ENUM ('DIRECT', 'INDIRECT');

-- AlterTable: Add expenseType to ExpenseCategory
ALTER TABLE "ExpenseCategory" ADD COLUMN "expenseType" "ExpenseClassification" NOT NULL DEFAULT 'INDIRECT';
