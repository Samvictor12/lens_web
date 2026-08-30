# KB-002 — Income and loans workspace

**Refs:** PRD-4.2, SD-2.2, req-002  
**Date:** 2026-08-27

## Pattern
Treat Loans as filtered `Income` rows where `IncomeCategory.name === 'Loan'` — no separate Loan model. Summary API returns `totalIncome` / `totalLoans` / `monthIncome` / `monthLoans`; list uses `categoryId` or `excludeCategoryId`.

## Gotchas
- Seed must keep a category named exactly `Loan` for tab/summary split.
- Income ledger deep-link prefers Bank Transfer category `ledger_id`, else first non-loan with ledger.
