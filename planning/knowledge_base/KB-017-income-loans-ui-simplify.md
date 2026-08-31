# KB-017 — Income and loans UI simplify

**Refs:** PRD-4.2, FD-2.2, req-017  
**Date:** 2026-09-01

## Pattern
Category is internal only — operators never pick or see it. Income tab uses **Bank Transfer** (else first active non-loan category); Loans tab uses **Loan** category. Table omits Category column; header has Refresh + Add only (no ledger deep-links).

## Gotchas
- Backend still requires `categoryId` on create; dialog resolves it before POST.
- KB-002 loan-as-filtered-Income pattern unchanged for tab split and KPIs.
