# KB-018 — Per-device refresh tokens

**Refs:** PRD-5.1, DD-1.1, SD-1.1, req-001 (2026-09-06)

## Lesson

A unique `RefreshToken.userId` plus upsert-on-login makes the second device overwrite the first. The first device’s next `POST /auth/refresh` fails and the UI reports **session timeout**.

## Pattern

- `User.refreshTokens` 1:n; unique on `token`; index `userId`.
- Login: `create` a row. Refresh: find by presented token + JWT `userId`; reuse the same refresh JWT.
- Logout / failed renew: delete only that token. Use a separate `revokeAllUserSessions` for password change or admin revoke.
- `auth:session-expired` only after **this** device’s refresh fails.

## Reuse

Do not upsert session rows by `userId` when concurrent devices are required.
