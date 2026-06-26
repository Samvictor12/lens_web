# Lens Web — System Architecture

This document details the system architecture and architectural boundaries of the Lens Web application.

## 1. Architectural Overview

Lens Web is built on a standard three-tier architecture:

```mermaid
graph TD
    subgraph Presentation Layer
        UI[React / Vite SPA]
        Tailwind[Tailwind CSS & Shadcn UI]
    end

    subgraph Application Layer
        Express[Node.js / Express 5 API Server]
        Routes[Routes / Controllers]
        Services[Business Logic Services]
    end

    subgraph Persistence Layer
        Prisma[Prisma 6 Client]
        Postgres[(PostgreSQL Database)]
    end

    UI -->|REST HTTP Requests| Express
    Express --> Routes
    Routes --> Services
    Services --> Prisma
    Prisma --> Postgres
```

---

## 2. Key Modules & Interactions

### A. Procurement & Inventory Inward
* **Manual Inward Wizard:** Pre-calculates range specifications using increment cartesian logic. Generates lists grouped by Lens Coating, with quantity splits allocated to physical locations and trays.
* **PO Inward:** Receives purchase orders and allocates physical items into `TrayMaster` bins. Live tray occupancy is calculated client-side to dynamically prevent tray capacity overflows.
* **DB Entry:** Uses bulk-inserts and updates database records inside atomic database transactions via Prisma `$transaction`.

### B. Sales & FIFO Stock Picking
* **Sale Order Queue:** Aggregates orders ready for QC/issue.
* **Stock Allocation:** Performs a FIFO-matching inventory lookup using `getMatchingInventoryFIFO` to identify physical available items.
* **Status Updates:** Invokes `reserveInventoryForSale` which performs a quantity-aware item status flip (available -> reserved) and writes to `InventoryTransaction` inside transaction scopes.

### C. Financial Ledgers
* **Chart of Accounts (COA):** Holds assets, liabilities, income, and expenses.
* **Double-Entry Postings:** Transactions write debit/credit lines into `Ledger` to ensure balanced sheets. 
* **P&L Reporting:** Filters ledgers by direct/indirect categories to generate revenue/cost reports.

---

## 3. Transaction Threading & Concurrency

To prevent race conditions and inventory mismatches:
* All database lookups and updates within an allocation or reservation pipeline must accept a `dbClient` (Prisma Transaction Client) parameter.
* Database operations are executed inside `prisma.$transaction(...)` contexts, allowing rollbacks if any individual item allocation fails.
