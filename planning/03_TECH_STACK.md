# Technology Stack

> Detailed breakdown of every technology used in the Lens Management System.

---

## 1. Runtime & Language

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Backend Runtime | Node.js | 20 (LTS) | Server-side JavaScript execution |
| Frontend Language | JavaScript (JSX) | ES2022+ | React component authoring |
| Database | PostgreSQL | 15 | Primary relational data store |

---

## 2. Backend Stack

| Library | Version | Purpose |
|---|---|---|
| **express** | ^5.1.0 | HTTP server framework |
| **@prisma/client** | ^6.17.1 | Type-safe PostgreSQL ORM (runtime) |
| **prisma** | ^6.17.1 | CLI for migrations and schema management |
| **jsonwebtoken** | ^9.0.2 | JWT creation and verification |
| **bcrypt** | ^6.0.0 | Password hashing (salted) |
| **helmet** | ^8.1.0 | HTTP security headers |
| **cors** | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| **morgan** | ^1.10.1 | HTTP request logging |
| **dotenv** | ^17.2.3 | Environment variable loading |
| **express-validator** | ^7.3.0 | Request input validation middleware |
| **swagger-jsdoc** | ^6.2.8 | OpenAPI spec generation from JSDoc |
| **swagger-ui-express** | ^5.0.1 | Swagger UI served at /api-docs |
| **exceljs** | ^4.4.0 | Excel file parsing (bulk PO upload) |
| **nodemon** | ^3.1.10 | Dev server auto-restart |
| **chalk** | ^5.6.2 | Colored terminal output |
| **node-fetch** | ^3.3.2 | HTTP client for service calls |

---

## 3. Frontend Stack

| Library | Version | Purpose |
|---|---|---|
| **react** | ^18.3.1 | UI framework |
| **react-dom** | ^18.3.1 | React DOM renderer |
| **react-router-dom** | ^6.30.1 | Client-side routing |
| **@tanstack/react-query** | ^5.83.0 | Server state, caching, background refetch |
| **axios** | ^1.13.2 | HTTP client for API calls |
| **react-hook-form** | ^7.61.1 | Performant form state management |
| **@hookform/resolvers** | ^3.10.0 | Zod schema resolvers for RHF |
| **zod** | ^3.25.76 | Schema validation (frontend + shared) |
| **next-themes** | ^0.3.0 | Dark/light theme switching |
| **lucide-react** | ^0.462.0 | Icon library |
| **react-icons** | ^5.5.0 | Additional icon sets |
| **recharts** | ^2.15.4 | Charts for dashboard & reports |
| **react-select** | ^5.10.2 | Searchable select dropdowns |
| **react-day-picker** | ^8.10.1 | Date picker component |
| **date-fns** | ^3.6.0 | Date utility functions |
| **sonner** | ^1.7.4 | Toast notifications |
| **cmdk** | ^1.1.1 | Command menu component |
| **embla-carousel-react** | ^8.6.0 | Carousel component |
| **vaul** | ^0.9.9 | Drawer component |
| **input-otp** | ^1.4.2 | OTP input component |
| **react-resizable-panels** | ^2.1.9 | Resizable panel layout |

### ShadcnUI / Radix UI Components

All accessible, unstyled primitives from `@radix-ui/*` (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, progress, radio-group, select, separator, slider, switch, tabs, toast, toggle, tooltip, etc.)

---

## 4. UI & Styling

| Technology | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | ^3.x | Utility-first CSS framework |
| **tailwindcss-animate** | ^1.0.7 | Animation utilities |
| **tailwind-merge** | ^2.6.0 | Conditional class merging |
| **class-variance-authority** | ^0.7.1 | Variant-based component styling |
| **clsx** | ^2.1.1 | Conditional className helper |
| **@tailwindcss/typography** | ^0.5.16 | Prose typography plugin |
| **postcss** | ^8.5.6 | CSS transformation pipeline |
| **autoprefixer** | ^10.4.21 | CSS vendor-prefix automation |
| **ShadcnUI** | (local) | Design system built on Radix + Tailwind |

---

## 5. Build & Dev Tools

| Tool | Version | Purpose |
|---|---|---|
| **Vite** | ^5.x | Frontend build tool & dev server |
| **@vitejs/plugin-react-swc** | ^3.11.0 | Fast React transform using SWC |
| **ESLint** | ^9.32.0 | JavaScript linting |
| **eslint-plugin-react-hooks** | ^5.2.0 | React hooks rules enforcement |
| **eslint-plugin-react-refresh** | ^0.4.20 | HMR compatibility lint rules |
| **lovable-tagger** | ^1.1.11 | Component tagging utility |
| **nodemon** | ^3.1.10 | Backend hot reload during development |

---

## 6. Infrastructure & Deployment

| Technology | Purpose |
|---|---|
| **Docker** | Container runtime |
| **Docker Compose** | Multi-service orchestration (PostgreSQL + Backend + Frontend) |
| **Nginx** | Static file serving + reverse proxy for API |
| **PostgreSQL 15 Alpine** | Lightweight production database image |
| **Node.js 20 Alpine** | Lightweight backend image |

---

## 7. Security Libraries

| Library | Purpose |
|---|---|
| `helmet` | Sets secure HTTP headers (CSP, HSTS, XSS protection) |
| `cors` | Restricts cross-origin requests to allowed origins |
| `bcrypt` | Password hashing with configurable salt rounds |
| `jsonwebtoken` | Signed JWT tokens (RS256 recommended for production) |
| `express-validator` | Input sanitization and validation at API boundary |
| `zod` | Schema-level validation on frontend forms |

---

## 8. API Documentation

- **Swagger UI** served at: `GET /api-docs`
- **Spec format:** OpenAPI 3.0
- **Generation:** JSDoc annotations in `src/backend/routes/*.js`
- **Auth scheme:** BearerAuth (JWT)

---

## 9. Environment Variables (Key)

```
DATABASE_URL           — Prisma PostgreSQL connection string
PORT                   — Backend server port (default 3001)
JWT_SECRET             — JWT signing secret
ACCESS_TOKEN_EXPIRY    — e.g., 15m
REFRESH_TOKEN_EXPIRY   — e.g., 7d
SUPER_ADMIN_EMAIL      — Initial admin user email
SUPER_ADMIN_PASSWORD   — Initial admin user password
CORS_ORIGINS           — Allowed CORS origins
NODE_ENV               — development | production
APP_TIMEZONE           — e.g., Asia/Kolkata
```

---

## 10. Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite frontend dev server |
| `npm run dev:server` | Start backend with nodemon |
| `npm run build` | Production frontend build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed initial data |
| `npm run lint` | Run ESLint |
| `docker compose up` | Start all services (PostgreSQL + Backend + Frontend) |
