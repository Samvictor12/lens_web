# Security Architecture

> Security decisions, implemented controls, and recommendations for the Lens Management System.

---

## 1. Authentication

### JWT Strategy
- **Access Token** — Short-lived (15 min default), sent in `Authorization: Bearer` header
- **Refresh Token** — Long-lived (7 days), stored in `RefreshToken` DB table (one per user)
- **Token Rotation** — On every refresh, old token is invalidated and a new one issued
- **Logout** — Deletes refresh token from DB, access token expires naturally

### Password Security
- Passwords hashed with **bcrypt** (salted, adaptive cost factor)
- Never stored or logged in plaintext
- Admin creation via `create-admin-user.js` script — password set via env var

### Recommendations
- [ ] Use RS256 (asymmetric key pair) instead of HS256 for JWT in production
- [ ] Store refresh tokens as httpOnly cookies instead of local storage (XSS protection)
- [ ] Add brute-force protection (rate limit on `/api/auth/login`)

---

## 2. Authorization

### Role-Based Access Control (RBAC)
- Roles: **Admin**, **Sales**, **Inventory**, **Accounts**
- `Permission` model: `{ action: create|read|update|delete, subject: SaleOrder|... }`
- `auth.middleware.js` verifies:
  1. Valid JWT token
  2. User is active (`active_status = true`)
  3. User has required permission for the action

### Privilege Levels
| Role | Access |
|---|---|
| Admin | Full system access |
| Sales | Sale orders, customers, pricing |
| Inventory | Inventory, PO receipt, location/tray management |
| Accounts | Financial ledger, invoices, payments |
| Production Operator | Update sale order to IN_PRODUCTION |
| Quality Operator | Update sale order to AWAITING_QUALITY |

---

## 3. HTTP Security (Helmet)

Helmet is configured on Express with the following protections:

| Header | Protection |
|---|---|
| `X-XSS-Protection` | Legacy XSS filter |
| `X-Content-Type-Options: nosniff` | MIME type sniffing prevention |
| `X-Frame-Options: DENY` | Clickjacking prevention |
| `Content-Security-Policy` | Restricts content sources |
| `Strict-Transport-Security` | HTTPS enforcement (production) |
| `Referrer-Policy` | Referrer information control |

---

## 4. CORS Configuration

- Allowed origins configured via `CORS_ORIGINS` environment variable
- Restricts API access to known frontend origins
- In production, must be set to the exact domain (not `*`)

---

## 5. Input Validation

### Backend (API Boundary)
- **express-validator** middleware on all write endpoints
- Validates and sanitizes: required fields, types, lengths, formats (email, phone)
- Returns structured `400` responses with per-field errors

### Frontend (Form Boundary)
- **Zod** schema validation via `@hookform/resolvers`
- React Hook Form validates before submission
- Prevents malformed data from reaching the API

---

## 6. Data Security

### Soft Delete
- Records are never hard-deleted from the database
- `delete_status = true` marks records as deleted
- This ensures audit trail integrity and supports data recovery

### Sensitive Fields
- Passwords: bcrypt hashed, never returned in API responses
- Delivery signatures: stored as Base64 in DB (consider moving to object storage)
- Bank details on Ledger: stored as JSON (consider field-level encryption)

### Audit Trail
- Every significant operation writes an `AuditLog` with:
  - Acting user ID
  - Action type (CREATE/UPDATE/DELETE/READ)
  - Before/after values
  - IP address, HTTP method, endpoint

---

## 7. Infrastructure Security

| Layer | Control |
|---|---|
| Docker networking | Isolated `tm_network`; DB not exposed externally in production |
| Environment variables | Secrets via `.env` file (never committed), Docker env in compose |
| Nginx | Serves static files; proxies API; should enforce HTTPS in production |
| PostgreSQL | Password-protected; not exposed on public port in production |

---

## 8. OWASP Top 10 Compliance

| Risk | Status | Mitigation |
|---|---|---|
| A01: Broken Access Control | ✅ Mitigated | RBAC on all endpoints |
| A02: Cryptographic Failures | ⚠️ Partial | bcrypt ✅; JWT HS256 (upgrade to RS256 recommended) |
| A03: Injection | ✅ Mitigated | Prisma parameterized queries; express-validator sanitization |
| A04: Insecure Design | ✅ Mitigated | Soft delete; audit logs; permission model |
| A05: Security Misconfiguration | ⚠️ Partial | Helmet ✅; CORS ✅; HTTPS enforcement pending |
| A06: Vulnerable Components | 🔄 Ongoing | npm audit should be run regularly |
| A07: Identity & Auth Failures | ⚠️ Partial | JWT rotation ✅; brute-force protection pending |
| A08: Software & Data Integrity Failures | ✅ Mitigated | JWT signature verification; no unsigned deserialization |
| A09: Security Logging & Monitoring | ✅ Mitigated | AuditLog + ErrorLog + Morgan HTTP logging |
| A10: Server-Side Request Forgery | ✅ N/A | No user-controlled URLs fetched by server |

---

## 9. Security Checklist for Production Deployment

- [ ] Set strong `JWT_SECRET` (minimum 64 random chars) or switch to RS256 key pair
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGINS` to exact production domain
- [ ] Enable HTTPS on Nginx (Let's Encrypt / cert manager)
- [ ] Restrict PostgreSQL port to internal Docker network only
- [ ] Run `npm audit` and fix HIGH/CRITICAL vulnerabilities
- [ ] Set up automated DB backups (pg_dump to S3 or similar)
- [ ] Configure rate limiting on auth endpoints
- [ ] Review and remove `LogsViewer.jsx.backup` file
- [ ] Rotate initial admin password after first login
- [ ] Add `httpOnly` cookie option for refresh tokens
