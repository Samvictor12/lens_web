# Lens Web — Project Docs Index

Stack: Vite + React (JS/JSX) · Express 5 · PostgreSQL + Prisma 6. See [WORKFLOW.md](WORKFLOW.md) for process rules.

This is an **index only**. Feature bodies live in `planning/features/{id}.md`. Rows below with `Feature File: —` are pre-existing modules (built before this lean workflow existed); they get a feature file the next time they're modified.

## Module inventory

| Module | Area | Status | Feature File | Notes |
|--------|------|--------|---------------|-------|
| Lens Masters (Category, Material, Coating, Fitting, Dia, Tinting, Type, Brand, Product, Price, Offers) | Catalog | DONE | — | `src/pages/Lens*`, `src/backend/routes/lens*.routes.js` |
| Customer / Customer Portal | CRM | DONE | — | `src/pages/Customer`, `src/pages/CustomerPortal` |
| Vendor / Vendor Payments | Procurement | DONE | — | `src/pages/Vendor`, `src/pages/Accounting/VendorPayments` |
| Purchase Order | Procurement | DONE | — | `src/pages/PurchaseOrder`, `purchaseOrder.routes.js` |
| Sale Order | Sales | DONE | — | `src/pages/SaleOrder`, `saleOrders.routes.js` |
| Dispatch | Sales/Logistics | DONE | — | `src/pages/Dispatch`, `dispatch.routes.js`, `dispatchService.js` |
| Billing / Invoices | Sales | DONE | — | `src/pages/Billing`, `invoices.routes.js` |
| Discount Management | Sales | DONE | — | `src/pages/DiscountManagement`, `priceMappings.routes.js` |
| Inventory (items, stock, transactions, alerts) | Inventory | DONE | — | `src/pages/Inventory`, `inventory.routes.js` |
| Tray Master / Location Master | Inventory | DONE | — | `src/pages/TrayMaster`, `src/pages/LocationMaster` |
| Accounting — Chart of Accounts, Ledger, Financial Reports | Accounting | DONE | — | `src/pages/Accounting`, `ledger.routes.js`, `financialReports.routes.js` |
| Accounting — Bank Reconciliation | Accounting | DONE | — | `src/pages/Accounting/BankReconciliation`, `bankReconciliation.routes.js` |
| Accounting — Expenses / Expense Category | Accounting | DONE | — | `src/pages/Accounting/Expenses`, `src/pages/ExpenseCategory`, `expenses.routes.js`, `expenseCategory.routes.js` |
| Accounting — Vendor Payment Vouchers | Accounting | DONE | — | `src/pages/Accounting/VendorPayments`, `vendorPayment.routes.js` |
| Check Sheet (QA) | Quality | DONE | — | `src/pages/CheckSheet`, `checkSheet.routes.js` |
| Production / Quality Operator | Production | DONE | — | `src/pages/ProductionOperator`, `src/pages/QualityOperator` |
| Business Category / Department | Admin | DONE | — | `src/pages/BusinessCategory`, `src/pages/Department` |
| User / Role / Permission (auth) | Admin | DONE | — | `src/pages/User`, `auth.routes.js`, `userMaster.routes.js` |
| Settings (printer config, company settings) | Admin | DONE | — | `src/pages/Settings`, `settings.routes.js`, `printerConfig.routes.js` |
| Logs (audit / error) | Admin | DONE | — | `logs.routes.js` |

## Active feature log

| ID | Title | Status | Feature File | Last Updated |
|----|-------|--------|---------------|---------------|
| inventory-module-flow-gaps | Close gaps in Product Inward, Dashboard analytics, and Stock Summary | APPROVED (contract v3, BUILD restarting) | `planning/features/inventory-module-flow-gaps.md` | 2026-06-26 |
| vendor-customer-ledger | Per-vendor/customer subsidiary ledgers shown on Vendor & Customer forms | DONE | `planning/features/vendor-customer-ledger.md` | 2026-06-25 |
| dispatch-delivery-agent-filter | Filter dispatches by delivery agent | DONE | `planning/features/dispatch-delivery-agent-filter.md` | 2026-06-21 |
| invoice-preview | Invoice preview before finalizing/printing | DONE | `planning/features/invoice-preview.md` | 2026-06-21 |
| vendor-payment-receipt-voucher | Printable receipt voucher to close vendor payments | DONE | `planning/features/vendor-payment-receipt-voucher.md` | 2026-06-21 |
| expense-direct-indirect-categories | Direct/Indirect expense classification + P&L filtering | DONE | `planning/features/expense-direct-indirect-categories.md` | 2026-06-21 |
| invoice-quick-close | Faster invoice close/settle action | DONE | `planning/features/invoice-quick-close.md` | 2026-06-21 |
| pnl-asset-liability-fix | Keep Asset/Liability ledgers out of the P&L | DONE | `planning/features/pnl-asset-liability-fix.md` | 2026-06-21 |
| dashboard-sales-widgets | Real sales widgets on Dashboard | DONE | `planning/features/dashboard-sales-widgets.md` | 2026-06-21 |
| production-quality-scanning | Barcode/QR scanning in Production and Quality modules | DONE | `planning/features/production-quality-scanning.md` | 2026-06-21 |
| coa-hide-balance-values | Hide balance values on Chart of Accounts cards/masters | DONE | `planning/features/coa-hide-balance-values.md` | 2026-06-21 |
| inventory-module-bugfixes | Fix dashboard crash, broken reserve/transfer flows, dead stock columns, missing validations | DONE | `planning/features/inventory-module-bugfixes.md` | 2026-06-24 |
| docker-folder-consolidation | Move Dev_lens/PROD_Lens into Docker/dev, Docker/prod; add Docker/test; stop tracking .env secrets | DONE | `planning/features/docker-folder-consolidation.md` | 2026-06-26 |
