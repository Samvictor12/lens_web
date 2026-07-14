-- Safe additive-only: Expense.dueDate (optional payment due date).
-- Idempotent — safe if column already exists. No data loss.

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
