# Lens Management System — Project Overview

> **Project Name:** Lens Management System (LMS)  
> **Version:** 1.0.0  
> **Last Updated:** May 2026  
> **Status:** Active Development

---

## 1. Purpose & Business Context

The **Lens Management System** is a full-stack enterprise web application built to manage end-to-end operations of an optical lens distribution business. It covers:

- **Sales operations** — creating, tracking, and fulfilling lens orders for customers
- **Procurement** — raising and receiving purchase orders from vendors
- **Inventory management** — real-time stock tracking across locations and trays
- **Financial accounting** — double-entry ledger system with full transaction history
- **Dispatch & delivery** — dispatching orders and capturing delivery signatures
- **Master data management** — configuring lens products, pricing, coatings, fittings, etc.
- **RBAC security** — role-based access control for all system actions

---

## 2. Business Domains Covered

| Domain | Key Activities |
|---|---|
| Customer Management | Register, classify, credit-limit, discount mapping |
| Vendor Management | Register vendors, link purchase orders |
| Lens Masters | Category, Material, Brand, Type, Coating, Fitting, Dia, Tinting |
| Pricing | Base price master + per-customer discount/price mapping |
| Offers & Promotions | VALUE, PERCENTAGE, EXCHANGE_PRODUCT, EXCHANGE_COATING_PRICE offer types |
| Sale Orders | Full order lifecycle from DRAFT → DELIVERED/CLOSED |
| Purchase Orders | Single & Bulk PO, multi-receipt partial fulfillment |
| Inventory | Inward, outward, transfer, adjustment, damage write-off |
| Dispatch | Dispatch copy (DC), delivery person assignment, signature capture |
| Financial Accounting | Chart of accounts (ledger), double-entry transactions, reports |
| Reporting | Sales, purchase, inventory, financial reports |
| Audit & Monitoring | AuditLog, ErrorLog with full request context |

---

## 3. Key Stakeholders & Roles

| Role | Responsibilities |
|---|---|
| **Admin** | Full system access, user management, master data |
| **Sales** | Create/manage sale orders, customer interaction |
| **Inventory** | Manage stock, process PO receipts, transfers |
| **Accounts** | Financial ledger management, payments, receipts |
| **Production Operator** | Move orders through production stages |
| **Quality Operator** | Mark orders as AWAITING_QUALITY → READY_FOR_DISPATCH |
| **Dispatch** | Assign delivery, update dispatch status, capture signatures |

---

## 4. High-Level System Flow

```
Customer Request
       │
       ▼
  Sale Order Created (DRAFT)
       │
       ▼
  Confirmed → Purchase Order raised (if stock not available)
       │                    │
       │                    ▼
       │           PO Received → Inventory Inward
       │                    │
       ▼                    ▼
  IN_PRODUCTION ◄─── Stock Reserved for Sale Order
       │
       ▼
  AWAITING_QUALITY → Quality Check
       │
       ▼
  READY_FOR_DISPATCH
       │
       ▼
  Dispatch Copy (DC) created → Assigned Delivery Person
       │
       ▼
  DELIVERED (Signature Captured)
       │
       ▼
  CLOSED → Financial Transaction Posted
```

---

## 5. Non-Functional Requirements

| Category | Target |
|---|---|
| **Availability** | 99.9% (≤ 43 min/month downtime) |
| **Authentication** | JWT Access Token + Refresh Token rotation |
| **Authorization** | Role-based permissions per entity/action |
| **Security** | Helmet, CORS, input validation (express-validator + Zod), bcrypt password hashing |
| **Observability** | AuditLog + ErrorLog on every significant operation |
| **API Documentation** | Swagger/OpenAPI 3.0 auto-generated |
| **Containerization** | Docker + Docker Compose for all services |
| **Data Integrity** | Soft delete pattern (`delete_status = false`), audit trail on all tables |

---

## 6. Project Files Index

| File / Folder | Purpose |
|---|---|
| `src/backend/server.js` | Express server entry point |
| `src/backend/routes/` | All API route definitions |
| `src/backend/controllers/` | Request handlers / business logic |
| `src/backend/middleware/` | Auth, error handling, validation |
| `src/backend/services/` | Reusable service layer |
| `prisma/schema.prisma` | Full database schema (PostgreSQL via Prisma ORM) |
| `prisma/migrations/` | Prisma migration history |
| `prisma/seed/` | Database seed scripts |
| `src/pages/` | React page components |
| `src/components/` | Shared UI components |
| `src/contexts/` | React context providers |
| `src/hooks/` | Custom React hooks |
| `src/services/` | Frontend API service layer |
| `docker-compose.yml` | Docker Compose for PostgreSQL, Backend, Frontend |
| `Dockerfile.backend` | Backend container definition |
| `Dockerfile.frontend` | Frontend (Nginx) container definition |
| `nginx.conf` | Nginx reverse-proxy configuration |
| `vite.config.js` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `planning/` | **This folder — all project planning documents** |
