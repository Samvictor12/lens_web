---
v: 1
sections:
  - id: TSD-1.1
    title: Stack
  - id: TSD-1.2
    title: Environment
  - id: TSD-1.3
    title: Deploy
---

# Technical Specification Document

## TSD-1.1 Stack

| Layer | Technology |
|-------|------------|
| Client | Vite + React (JavaScript, JSX), Tailwind CSS, Shadcn UI |
| Server | Node.js + Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | JWT access + refresh tokens |

## TSD-1.2 Environment

Dockerized **dev / test / prod** under `Docker/`. Env via `.env` (not committed). Default API under `/api`. Frontend Vite SPA.

## TSD-1.3 Deploy

Docker compose for each environment. Role/permission seeds must stay in sync with `src/constants/role.constants.js` and `scripts/role-seed.js` (KB pattern from lean archive).
