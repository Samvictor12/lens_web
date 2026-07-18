# Admin Module

User administration, RBAC, settings, and authentication/session handling.

## Authentication & sessions (2026-07-14)

| Concern | Behavior |
|--------|----------|
| Access token | `JWT_EXPIRES_IN` (default **15m**) |
| Refresh token | `REFRESH_TOKEN_EXPIRES_IN` (default **7d**); one `RefreshToken` row per user |
| Silent renew | Axios 401 interceptor + proactive refresh (~60s before `exp`) |
| Forced logout | Refresh expired/invalid → clear local auth, revoke via `POST /api/auth/logout` `{ refreshToken }`, `auth:session-expired` |
| Logout without live access | Public logout accepts refresh body; deletes matching DB row after verify |

### Linkages
- **Frontend:** `src/services/api.js`, `src/services/auth.js`, `src/contexts/AuthContext.jsx`, `SessionExpiryHandler` in `src/App.jsx`
- **Backend:** `auth.routes.js`, `authControllerNew.js`, `auth.service.js`, `utils/duration.js`, `middleware/auth.js`
- **DB:** `RefreshToken` (unchanged schema shape; `expiresAt` now env-aligned)
- **Env:** `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` (names unchanged)

### Other Admin surfaces
- Users / Roles / Permissions — `userMaster.routes.js`, role seed
- Settings (printers, company) — settings services
- Logs — audit / error logging
