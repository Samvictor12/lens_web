# Feature Roadmap

> This document tracks what is **built**, what is **in progress**, and what is **planned** for the Lens Management System.  
> Last Updated: May 2026

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Completed & in production |
| 🔄 | In progress |
| 📋 | Planned — defined and ready to build |
| 💡 | Idea — under consideration |
| ❌ | Cancelled / Descoped |

---

## Phase 1 — Foundation (Completed ✅)

| Feature | Status | Migration Reference |
|---|---|---|
| User authentication (JWT + Refresh Token) | ✅ | Initial |
| Role-based access control (RBAC) | ✅ | Initial |
| Department management | ✅ | Initial |
| User management | ✅ | Initial |
| Business category master | ✅ | Initial |
| Customer management | ✅ | Initial |
| Vendor management | ✅ | Initial |
| Lens Category master | ✅ | Initial |
| Lens Material master | ✅ | Initial |
| Lens Brand master | ✅ | Initial |
| Lens Type master | ✅ | Initial |
| Lens Coating master | ✅ | Initial |
| Lens Product master (with optical ranges) | ✅ | Initial |
| Lens Price master | ✅ | Initial |
| Basic sale order creation | ✅ | Initial |
| Swagger API documentation | ✅ | Initial |
| Audit log system | ✅ | 20251126191657 |
| Error log system | ✅ | 20251126191657 |

---

## Phase 2 — Operations (Completed ✅)

| Feature | Status | Migration Reference |
|---|---|---|
| Lens Fitting master (with fitting_price) | ✅ | 20251126172459 |
| Lens Tinting master (with tinting_price) | ✅ | 20251217201055 |
| Lens Dia master | ✅ | Initial |
| Sale order — urgent order flag | ✅ | 20251122212203 |
| Sale order — free fitting flag | ✅ | 20251122212203 |
| Sale order — right/left eye extra charge fields | ✅ | 20251217210220 |
| Sale order — tinting price field | ✅ | 20251217201055 |
| Sale order print feature (A5 spec sheet) | ✅ | — |
| Create & Print workflow | ✅ | — |
| Purchase Order module (Single PO) | ✅ | 20251128064238 |
| Purchase Order — order type (Single/Bulk) | ✅ | 20251205180956 |
| Purchase Order — bulk lens selection (JSON) | ✅ | 20251209174256 |
| Multi-receipt partial delivery (PurchaseOrderReceipt) | ✅ | 20251209174256 |
| Purchase Receipt Log (immutable audit) | ✅ | 20251209174256 |
| Price mapping (customer-specific discounts) | ✅ | 20251115060618 |
| Location master | ✅ | 20260325120000 |
| Tray master | ✅ | Initial |
| Dispatch Copy (DC) module | ✅ | 20251123170244 |
| Dispatch — delivery person assignment | ✅ | 20260325120000 |
| Dispatch — delivery signature capture (Base64) | ✅ | 20260325120000 |
| Inventory module (InventoryItem, Stock, Transactions, Alerts) | ✅ | Post 20260322163701 |
| Sale Order — ON_HOLD status | ✅ | 20260414204133 |
| Sale Order — AWAITING_QUALITY status | ✅ | 20260414210000 |
| Production Operator workflow | ✅ | — |
| Quality Operator workflow | ✅ | — |

---

## Phase 3 — Advanced Features (Completed ✅)

| Feature | Status | Migration Reference |
|---|---|---|
| Lens Offers — VALUE type | ✅ | 20260322163701 |
| Lens Offers — PERCENTAGE type | ✅ | 20260322163701 |
| Lens Offers — EXCHANGE_PRODUCT type | ✅ | 20260322163701 |
| Lens Offers — EXCHANGE_COATING_PRICE type | ✅ | 20260325000000 |
| Sale Order — parent/child relationship (Close & Create) | ✅ | — |
| Financial Accounting — Ledger (Chart of Accounts) | ✅ | 20260507120000 |
| Financial Accounting — Double-entry transactions | ✅ | 20260507120000 |
| Financial Accounting — TransactionEntry (Debit/Credit) | ✅ | 20260507120000 |
| Financial Reports routes | ✅ | — |
| Expense tracking routes | ✅ | — |
| Invoice management routes | ✅ | — |
| Logs Viewer UI (AuditLog + ErrorLog) | ✅ | — |
| Excel import for bulk PO | ✅ | — |
| Discount Management UI | ✅ | — |

---

## Phase 4 — In Progress 🔄

| Feature | Status | Notes |
|---|---|---|
| Financial Accounting — UI for Ledger management | 🔄 | Backend done, UI in development |
| Financial Accounting — UI for Transaction entry | 🔄 | Backend done, UI in development |
| Financial Reports — UI (Trial Balance, P&L) | 🔄 | Route exists, UI pending |
| Invoice — full payment workflow | 🔄 | Routes exist, full flow integration in progress |
| Bank Reconciliation UI | 🔄 | `isReconciled` flag ready in schema |
| Dashboard analytics enhancement | 🔄 | Adding financial KPIs to dashboard |

---

## Phase 5 — Planned 📋

| Feature | Priority | Notes |
|---|---|---|
| **GST / Tax calculation engine** | HIGH | India GST CGST/SGST/IGST per transaction based on `placeOfSupply` |
| **Customer outstanding balance auto-calculation** | HIGH | Sync `outstanding_credit` from financial transactions |
| **Credit limit enforcement on sale orders** | HIGH | Block order if customer exceeds credit limit |
| **Vendor payment tracking** | HIGH | Mark POs as paid, track vendor payables |
| **SMS / Email notifications** | MEDIUM | Order status changes, dispatch alerts |
| **Barcode / QR code for inventory items** | MEDIUM | Scan-to-track in warehouse |
| **Mobile-responsive dispatch view** | MEDIUM | Delivery person mobile UI |
| **Report export to PDF / Excel** | MEDIUM | Sales, purchase, financial reports |
| **Bulk sale order import** | MEDIUM | Import orders from Excel file |
| **Customer portal** | LOW | Self-service order status tracking |
| **Vendor portal** | LOW | Vendor self-service PO acknowledgment |
| **Multi-currency support** | LOW | For international lens procurement |
| **Automated low stock alert email** | LOW | Trigger email when `InventoryAlert` is created |
| **API rate limiting** | MEDIUM | Protect APIs from abuse |
| **Automated database backups** | HIGH | Scheduled pg_dump to cloud storage |
| **Production health dashboard** | MEDIUM | Uptime, error rate, latency monitoring |

---

## Phase 6 — Future Considerations 💡

| Idea | Notes |
|---|---|
| Mobile app (React Native) | Field sales and delivery tracking |
| Optical prescription management | Store patient prescriptions linked to customers |
| Vendor EDI integration | Electronic data interchange for PO automation |
| ML-based demand forecasting | Predict lens stock requirements |
| Multi-branch support | Manage multiple store locations |
| Customer loyalty program | Points-based system for repeat orders |
| Integration with accounting software | Tally / QuickBooks sync |

---

## Known Technical Debt

| Item | Impact | Priority |
|---|---|---|
| Password hashing rounds should be environment-configured | Security | HIGH |
| JWT_SECRET should use RS256 asymmetric key in production | Security | HIGH |
| `outstanding_credit` on Customer not auto-updated from transactions | Data integrity | HIGH |
| LogsViewer.jsx.backup file should be removed | Code hygiene | LOW |
| Some controllers need input validation via express-validator | Robustness | MEDIUM |
| No automated test suite (unit/integration) | Quality | HIGH |
| Prisma N+1 query review needed for list endpoints with deep includes | Performance | MEDIUM |
| Excel import lacks comprehensive error reporting for bad rows | UX | MEDIUM |
