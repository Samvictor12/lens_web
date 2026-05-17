# System Architecture

> This document describes the high-level architecture, component boundaries, and integration patterns of the Lens Management System.

---

## 1. Architecture Style

The application uses a **Modular Monolith** architecture for the backend (single Express.js process with well-separated modules by domain) and a **Single Page Application (SPA)** for the frontend.

This is the correct choice for the current team size and domain complexity — it avoids the operational overhead of microservices while maintaining clean internal module boundaries that would allow future extraction if needed.

---

## 2. C4 — Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LENS MANAGEMENT SYSTEM                   │
│                                                                 │
│  ┌──────────┐    HTTPS     ┌──────────────────────────────────┐ │
│  │  Browser │◄────────────►│     React SPA (Vite)            │ │
│  │  (User)  │              │     Port 80 (Nginx)              │ │
│  └──────────┘              └──────────────┬───────────────────┘ │
│                                           │ REST API (JSON)     │
│                            ┌──────────────▼───────────────────┐ │
│                            │   Express.js Backend API         │ │
│                            │   Port 3001                      │ │
│                            │   JWT Auth + Role-Based Access   │ │
│                            └──────────────┬───────────────────┘ │
│                                           │ Prisma ORM          │
│                            ┌──────────────▼───────────────────┐ │
│                            │   PostgreSQL 15                  │ │
│                            │   Port 5432                      │ │
│                            └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. C4 — Container Diagram

```
┌──────────────────────── Docker Network: tm_network ────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────┐                                   │
│  │       Frontend Container            │                                   │
│  │  Image: nginx:alpine                │                                   │
│  │  Built: Vite (React 18 + ShadcnUI) │                                   │
│  │  Port: 80 (ext) → 80 (int)         │                                   │
│  │  Serves: Static SPA build           │                                   │
│  │  Proxies: /api/* → Backend:3001     │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
│  ┌─────────────────────────────────────┐                                   │
│  │       Backend Container             │                                   │
│  │  Image: node:20-alpine              │                                   │
│  │  Runtime: Express.js 5             │                                   │
│  │  Port: 3001                         │                                   │
│  │  ORM: Prisma Client                 │                                   │
│  │  Auth: JWT (Access + Refresh)       │                                   │
│  │  Docs: Swagger UI (/api-docs)       │                                   │
│  └─────────────────────────────────────┘                                   │
│                                                                             │
│  ┌─────────────────────────────────────┐                                   │
│  │       PostgreSQL Container          │                                   │
│  │  Image: postgres:15-alpine          │                                   │
│  │  Port: 5432                         │                                   │
│  │  Volume: ./postgres_data            │                                   │
│  │  Health: pg_isready check           │                                   │
│  └─────────────────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend Module Structure

```
src/backend/
├── server.js              ← Express app entry point
├── config/                ← Environment, Prisma client, Swagger
├── routes/                ← Route definitions (28 route files)
├── controllers/           ← Business logic per domain (24 controllers)
├── middleware/
│   ├── auth.middleware.js         ← JWT verify + role check
│   ├── errorHandler.js            ← Global error handler
│   └── validation.js              ← express-validator chains
├── services/              ← Shared service utilities
├── dto/                   ← Data Transfer Objects (input/output shapes)
├── utils/                 ← Helper functions
└── examples/              ← Example payloads / test scripts
```

---

## 5. Frontend Module Structure

```
src/
├── App.jsx                ← Root router (React Router v6)
├── main.jsx               ← Entry, QueryClient, ThemeProvider
├── index.css              ← Global styles
├── pages/                 ← Feature pages (one folder per domain)
│   ├── Dashboard.jsx
│   ├── SaleOrder/
│   ├── PurchaseOrder/
│   ├── Inventory/
│   ├── Dispatch/
│   ├── Customer/
│   ├── Vendor/
│   ├── LensProductMaster/
│   ├── LensBrandMaster/
│   ├── LensCategory/
│   ├── LensCoating/
│   ├── LensMaterial/
│   ├── LensTypeMaster/
│   ├── LensFittingMaster/
│   ├── LensTinting/
│   ├── LensOffers/
│   ├── DiscountManagement/
│   ├── User/
│   ├── Department/
│   ├── BusinessCategory/
│   ├── LocationMaster/
│   ├── TrayMaster/
│   ├── ProductionOperator/
│   ├── QualityOperator/
│   └── Login.jsx
├── components/            ← Reusable UI components (ShadcnUI-based)
├── contexts/              ← AuthContext, ThemeContext
├── hooks/                 ← Custom React hooks
├── services/              ← Axios API client layer (one file per domain)
├── lib/                   ← Utility libraries
└── types/                 ← Shared TypeScript-compatible type definitions
```

---

## 6. Authentication & Authorization Flow

```
Login Request
    │
    ▼
POST /api/auth/login
    │ (validate credentials, bcrypt compare)
    ▼
Generate Access Token (JWT, 15m)  +  Refresh Token (JWT, 7d)
    │
    ▼
Store Refresh Token in DB (RefreshToken table)
    │
    ▼
Client stores tokens → Sends Authorization: Bearer <accessToken>
    │
    ▼
auth.middleware.js → verifyJWT → attach req.user
    │
    ▼
Role/Permission check → proceed or 403
    │
    ▼
Access Token expires → POST /api/auth/refresh
    │
    ▼
Verify Refresh Token in DB → Issue new Access Token
```

---

## 7. Data Flow — Sale Order Lifecycle

```
POST /api/sale-orders  (DRAFT)
         │
         ▼
PUT /api/sale-orders/:id/status → CONFIRMED
         │
         ▼
[Optional] POST /api/purchase-orders  (linked to SO)
         │
         ▼
PUT /api/sale-orders/:id/status → IN_PRODUCTION
         │
         ▼
PUT /api/sale-orders/:id/status → ON_HOLD  (optional)
         │
         ▼
PUT /api/sale-orders/:id/status → AWAITING_QUALITY
         │
         ▼
PUT /api/sale-orders/:id/status → READY_FOR_DISPATCH
         │
         ▼
POST /api/dispatch  (creates DispatchCopy, links SaleOrders)
         │
         ▼
PUT /api/dispatch/:id/status → DELIVERED  (+ signature)
         │
         ▼
PUT /api/sale-orders/:id/status → DELIVERED → CLOSED
         │
         ▼
FinancialTransaction posted (SALE type, double-entry)
```

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Modular Monolith | Right-sized for team; avoids distributed complexity |
| Database | PostgreSQL 15 | ACID compliance needed for financial double-entry |
| ORM | Prisma 6 | Type-safe queries, excellent migration tooling |
| Auth | JWT (Access + Refresh) | Stateless scaling with revocable refresh tokens |
| Frontend | React 18 + Vite | Fast DX, large ecosystem |
| UI | ShadcnUI + Tailwind CSS | Consistent design system, accessible components |
| Container | Docker + Compose | Reproducible dev/prod environments |
| API Docs | Swagger/OpenAPI 3.0 | Auto-generated, stays in sync with code |
| Soft Delete | `delete_status` flag | Data retention, audit compliance |
| Accounting | Double-entry ledger | Correct financial model; prevents balance errors |
| PO Receipts | Multi-receipt per PO | Real-world partial deliveries supported |
| Offers | 4 offer types via enum | Flexible promotion engine without schema changes |
