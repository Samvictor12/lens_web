# Planning Index

> This folder contains the complete project planning documentation for the **Lens Management System (LMS)**.  
> All documents are kept as Markdown files for version control and developer accessibility.

---

## Document Index

| # | Document | Description |
|---|---|---|
| 01 | [PROJECT_OVERVIEW.md](./01_PROJECT_OVERVIEW.md) | Business context, system purpose, stakeholder roles, high-level flow |
| 02 | [ARCHITECTURE.md](./02_ARCHITECTURE.md) | C4 diagrams, container design, module structure, auth flow, key decisions |
| 03 | [TECH_STACK.md](./03_TECH_STACK.md) | Full technology stack — backend, frontend, UI, build tools, infra |
| 04 | [DATABASE_SCHEMA.md](./04_DATABASE_SCHEMA.md) | All Prisma models, relationships, enums, indexes, migration history |
| 05 | [MODULES_AND_FEATURES.md](./05_MODULES_AND_FEATURES.md) | Every module described in detail — what it does and how it works |
| 06 | [API_REFERENCE.md](./06_API_REFERENCE.md) | All API endpoints grouped by domain with method, path, and auth |
| 07 | [DEVELOPMENT_GUIDE.md](./07_DEVELOPMENT_GUIDE.md) | Setup, run, conventions, adding new modules, troubleshooting |
| 08 | [ROADMAP.md](./08_ROADMAP.md) | Phase-by-phase completion status, planned features, technical debt |
| 09 | [SECURITY.md](./09_SECURITY.md) | Auth strategy, RBAC, OWASP mapping, production security checklist |

---

## Quick Reference

### System at a Glance

```
Tech:       React 18 + Vite (frontend) | Express.js 5 (backend) | PostgreSQL 15 + Prisma 6
Deploy:     Docker Compose (postgres + backend + frontend/nginx)
Auth:       JWT Access Token (15m) + Refresh Token (7d, DB-stored)
DB Pattern: Soft delete (delete_status) + full audit fields on every table
Accounting: Double-entry ledger system (Ledger → FinancialTransaction → TransactionEntry)
```

### Key Business Flows

```
Sale Order:   DRAFT → CONFIRMED → IN_PRODUCTION → AWAITING_QUALITY → READY_FOR_DISPATCH → DELIVERED → CLOSED
Purchase Order: DRAFT → RECEIVED → INVOICE_RECEIVED → CLOSED
Inventory:    PO Receipt → INWARD_PO → InventoryItem (AVAILABLE) → RESERVED (SO) → OUTWARD_SALE
Dispatch:     DC created → IN_TRANSIT → DELIVERED (signature captured)
Financial:    Every transaction → FinancialTransaction header + TransactionEntry (DEBIT + CREDIT)
```

### Active Development (May 2026)

The following modules have backend routes but require UI completion:
- Financial Accounting UI (Ledger management, transaction entry, reports)
- Invoice payment workflow
- Bank reconciliation

---

## Conventions Used in These Documents

- **✅** = Implemented and working
- **🔄** = Work in progress
- **📋** = Planned, ready to build
- **💡** = Idea under consideration
- All monetary values are in **Indian Rupees (₹)**
- All timestamps in **Asia/Kolkata (IST)** timezone
- Soft delete is used everywhere — records with `delete_status = true` are hidden from normal queries
