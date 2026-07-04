# Lens Web — Project Documentation

This is the central specification repository for the Lens Web application.

## 1. Functional Requirements

The application provides a comprehensive ERP and management system for an optical lens laboratory/warehouse, covering the following functional domains:
* **Catalog & Master Data:** Lens products, categories, materials, coatings, fittings, diameters, tinting, brands, pricing, and promotional offers.
* **CRM (Customer Management):** Customer profile management and customer portals.
* **Procurement:** Vendor records, purchase orders (PO), vendor payment processing, and inward receipt queues.
* **Sales & Logistics:** Sale order (SO) forms, SO workflows, invoicing/billing, and dispatch/delivery agent routing.
* **Inventory Management:** Physical stock items, tray allocation, FIFO stock-picking, inventory transactions, and stock-level alerting.
* **Quality & Shop Floor:** Check sheets, production operators, quality operator screens, and barcode/QR wedge scanning interfaces.
* **Financial Accounting:** Ledger, **Account Groups & industry Chart of Accounts**, **Customer & Vendor Payment Vouchers** (with allocation breakdown traceability), Bank Reconciliation, Expense Category tracking, Group Summary / Balance Sheet / Profit & Loss reporting.
* **Admin Controls:** User profiles, role-based access control, settings (printers, metadata), and system logs.

---

## 2. Non-Functional Requirements

* **Performance:** Fast loading and responsiveness for high-volume tabular inventory screens.
* **Usability:** Keyboard-wedge scanning support to enable fast shop-floor input without visual interruption.
* **Reliability & Consistency:** Transactional database operations to ensure stock quantities, reservation states, and financial ledgers never diverge.
* **Security:** Role-scoped data filtering (e.g. delivery persons only seeing their assigned dispatches).

---

## 3. Technical Specifications

* **Frontend:** Vite + React (JavaScript, Tailwind CSS, Shadcn UI).
* **Backend:** Node.js + Express 5 (JavaScript).
* **Database:** PostgreSQL.
* **ORM:** Prisma 6.
* **Deployment:** Dockerized development, testing, and production environments.

---

## 4. UI/UX Guidelines

* Sleek dark mode interfaces matching professional dashboard layouts.
* Dense tabular views with expandable summaries for inventory levels.
* Step-by-step wizard forms (e.g., Inventory Initialization) with inline validation badges (such as live tray capacity gauges).

---

## 5. Modules Index

| Module | Area | Status | Link |
|--------|------|--------|------|
| Lens Masters | Catalog | DONE | [LensMasters](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Catalog.md) |
| Customer / Customer Portal | CRM | DONE | [Customer](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/CRM.md) |
| Vendor / Vendor Payments | Procurement | DONE | [Procurement](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Procurement.md) |
| Purchase Order | Procurement | DONE | [PurchaseOrder](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Procurement.md) |
| Sale Order | Sales | DONE | [SaleOrder](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Sales.md) |
| Dispatch | Sales/Logistics | DONE | [Dispatch](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Logistics.md) |
| Billing / Invoices | Sales | DONE | [Billing](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Sales.md) |
| Discount Management | Sales | DONE | [DiscountManagement](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Sales.md) |
| Inventory (items, stock, transactions, alerts) | Inventory | IN_PROGRESS | [Inventory](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Inventory.md) |
| Tray Master / Location Master | Inventory | DONE | [Inventory](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Inventory.md) |
| Accounting — Account Groups & COA Tree | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Payment Traceability Tree | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Chart of Accounts, Ledger, Financial Reports | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Bank Reconciliation | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Expenses / Expense Category | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Vendor Payment Vouchers | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Accounting — Customer Payment Receipts | Accounting | DONE | [Accounting](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Accounting.md) |
| Check Sheet (QA) | Quality | DONE | [Quality](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Quality.md) |
| Production / Quality Operator | Production | DONE | [Production](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Production.md) |
| Business Category / Department | Admin | DONE | [Admin](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Admin.md) |
| User / Role / Permission (auth) | Admin | DONE | [Admin](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Admin.md) |
| Settings (printer config, company settings) | Admin | DONE | [Admin](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Admin.md) |
| Logs (audit / error) | Admin | DONE | [Admin](file:///d:/Personal/workspace/Lens_Project/Sources/lens_web/planning/Modules/Admin.md) |
