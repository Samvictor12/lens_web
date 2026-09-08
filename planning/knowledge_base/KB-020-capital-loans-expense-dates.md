# KB-020 Capital/Loans liability COA and expense dates

**Refs:** PRD-4.11, DD-2.1, SD-2.2, req-003 (2026-09-08)

Capital (`GRP-CAPITAL`, AC-5001/AC-5002) is LIABILITY under `GRP-LIABILITIES`, not EQUITY. Loans is `GRP-LOANS` + `AC-2004`. Balance Sheet roots are Assets + Liabilities only — do not list Capital as a sibling equity root (double-count).

Income From = `GET /api/ledgers/capital-posting`. Loan From = `GET /api/ledgers/loans-posting`. To = Cash/Bank. AC-3004 stays INCOME classification (tab discriminator only).

Mark/cash: `expenseDate` must be on or before `dueDate`; pass that date as `transactionDate`. Pay: use `paymentDate`.
