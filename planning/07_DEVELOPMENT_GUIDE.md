# Development Guide

> Setup, run, and develop the Lens Management System locally.

---

## 1. Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | (bundled with Node.js) |
| PostgreSQL | 15 | https://www.postgresql.org or via Docker |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Git | Latest | https://git-scm.com |

---

## 2. Project Setup

### Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd lens_web

# Install all dependencies
npm install
```

### Environment Configuration

Copy the example environment file and configure it:

```bash
cp src/backend/.env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/lens_db?schema=public"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=lens_db
POSTGRES_PORT=5432

# Server
PORT=3001
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Admin User (created on first seed)
SUPER_ADMIN_EMAIL=admin@lensproject.com
SUPER_ADMIN_PASSWORD=Admin@123

# CORS
CORS_ORIGINS=http://localhost:5173

# App
APP_TIMEZONE=Asia/Kolkata
SWAGGER_URL=http://localhost:3001
```

---

## 3. Database Setup

### Option A — PostgreSQL via Docker (Recommended)

```bash
# Start only the database container
docker compose up postgres -d

# Verify it's running
docker compose ps
```

### Option B — Local PostgreSQL

Ensure PostgreSQL 15 is installed and running. Create the database:

```sql
CREATE DATABASE lens_db;
```

### Run Migrations

```bash
# Apply all Prisma migrations
npm run db:migrate
```

### Seed Initial Data

```bash
# Seed admin user, roles, and master data
npm run db:seed
```

---

## 4. Running the Application

### Development Mode (Frontend + Backend separately)

**Terminal 1 — Backend:**
```bash
npm run dev:server
# Starts Express.js on http://localhost:3001
# Auto-restarts on file changes (nodemon)
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# Starts Vite dev server on http://localhost:5173
# HMR enabled
```

### Access Points (Development)
| Service | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Swagger API Docs | http://localhost:3001/api-docs |

---

## 5. Docker — Full Stack (Production-like)

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d

# Stop all services
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Docker Access Points
| Service | URL |
|---|---|
| Frontend (Nginx) | http://localhost:80 |
| Backend API | http://localhost:3001 |
| Swagger API Docs | http://localhost:3001/api-docs |
| PostgreSQL | localhost:5432 |

---

## 6. Available Scripts

| Script | Command | Description |
|---|---|---|
| Start frontend dev | `npm run dev` | Vite dev server with HMR |
| Start backend dev | `npm run dev:server` | Express + nodemon |
| Build frontend | `npm run build` | Production Vite build → dist/ |
| Build (dev mode) | `npm run build:dev` | Build with dev env vars |
| Run backend prod | `npm run build:server` | Start Express in production |
| Lint | `npm run lint` | ESLint check |
| Database migrate | `npm run db:migrate` | Apply pending Prisma migrations |
| Database seed | `npm run db:seed` | Run seed scripts |

---

## 7. Project Conventions

### Naming Conventions
- **Files:** camelCase for JS files (`saleOrderController.js`), PascalCase for React components (`SaleOrderForm.jsx`)
- **Database:** camelCase fields in Prisma schema, underscore for legacy fields
- **API routes:** kebab-case (`/api/sale-orders`, `/api/lens-categories`)
- **Variables/functions:** camelCase
- **Constants/Enums:** UPPER_SNAKE_CASE

### Soft Delete Pattern
Every entity uses:
```js
// Never hard delete — always soft delete
await prisma.customer.update({
  where: { id },
  data: { delete_status: true, active_status: false }
});
```

### Audit Fields Pattern
Every write operation should record:
```js
data: {
  ...payload,
  createdBy: req.user.id,   // on create
  updatedBy: req.user.id,   // on update
}
```

### Controller Pattern
```js
// controllers/saleOrderController.js
export const createSaleOrder = async (req, res, next) => {
  try {
    const data = await prisma.saleOrder.create({ data: { ...req.body, createdBy: req.user.id } });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error); // Global error handler takes over
  }
};
```

### Frontend API Service Pattern
```js
// services/saleOrderService.js
import axiosInstance from './axiosInstance';

export const getSaleOrders = (params) => axiosInstance.get('/sale-orders', { params });
export const createSaleOrder = (data) => axiosInstance.post('/sale-orders', data);
export const updateSaleOrder = (id, data) => axiosInstance.put(`/sale-orders/${id}`, data);
```

---

## 8. Adding a New Module

Follow this checklist to add a new domain module consistently:

1. **Schema** — Add model in `prisma/schema.prisma`
2. **Migration** — `npm run db:migrate` with a descriptive name
3. **Controller** — Create `src/backend/controllers/newModule.controller.js`
4. **Routes** — Create `src/backend/routes/newModule.routes.js` with Swagger JSDoc
5. **Register Route** — Import and mount in `src/backend/server.js`
6. **Frontend Service** — Create `src/services/newModuleService.js`
7. **Page** — Create `src/pages/NewModule/` with list and detail views
8. **Navigation** — Add to sidebar in App router and nav component

---

## 9. Testing

### Manual API Testing
- Use Swagger UI at `/api-docs` for interactive testing
- Test scripts available: `test-login.js`, `test-bulk-po-api.js`

```bash
# Test login
node test-login.js

# Test bulk PO API
node test-bulk-po-api.js
```

### Database Verification
```bash
# Connect to PostgreSQL
docker exec -it tm_postgres psql -U postgres -d lens_db

# Verify tables
\dt

# Check user count
SELECT count(*) FROM "User";
```

---

## 10. Troubleshooting

| Problem | Solution |
|---|---|
| `P2002` Prisma unique constraint | Check for duplicate `email`, `username`, `usercode`, `code` |
| JWT `TokenExpiredError` | Token expired — frontend should auto-refresh via `/api/auth/refresh` |
| `CORS error` | Ensure `CORS_ORIGINS` in `.env` matches the frontend URL |
| Prisma Client not generated | Run `npx prisma generate` |
| Migration out of sync | Run `npx prisma migrate dev` — resolve drift |
| Port 3001 already in use | Kill existing process or change `PORT` in `.env` |
| Docker PostgreSQL won't start | Check `postgres_data/` folder permissions; remove volume with `docker compose down -v` |

---

## 11. Environment Branches

| Environment | Config | Notes |
|---|---|---|
| **Development** | `.env` local | Vite + nodemon, hot reload |
| **Staging** | Docker Compose | Mirror of production |
| **Production** | Docker Compose + secrets manager | Never commit secrets to git |
