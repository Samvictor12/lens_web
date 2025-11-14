# Authentication System Refactor - Username-Based Login

## Overview
Refactored the authentication system to use username-based login instead of email/usercode, with comprehensive validation checks and refresh token implementation.

## Backend Changes

### 1. authService.js
**Location:** `/src/backend/services/authService.js`

**Changes:**
- Updated `login()` method:
  - Changed parameter from `emailOrUsercode` to `username`
  - Changed Prisma query to `findFirst({ where: { username } })`
  - Added four-level validation with specific error messages:
    1. `delete_status === true` → Error: "You do not have login access. Please contact administrator." (Code: NO_LOGIN_ACCESS)
    2. `active_status === false` → Error: "Your account is inactive. Please contact administrator for login access." (Code: ACCOUNT_INACTIVE)
    3. `is_login === false` → Error: "Login is not enabled for this account. Please contact administrator." (Code: LOGIN_NOT_ENABLED)
    4. Invalid password → Error: "Invalid username or password" (Code: INVALID_CREDENTIALS)

- Updated `generateTokens()` method:
  - Added `username` to JWT payload
  - Changed `roleId` to `role_id` for consistency
  - Changed JWT issuer from 'lens-project' to 'lens-management'

- Updated refresh token generation:
  - Changed issuer from 'lens-project' to 'lens-management'

**JWT Payload Structure:**
```javascript
{
  userId: user.id,
  email: user.email,
  usercode: user.usercode,
  username: user.username,
  role_id: user.role_id,
  roleName: user.role?.role_name || 'User'
}
```

### 2. authControllerNew.js
**Location:** `/src/backend/controllers/authControllerNew.js`

**Changes:**
- Updated `login()` method:
  - Changed validation data access from `validation.data.emailOrUsercode` to `validation.data.username`
  - Updated console log to use `authResult.user.username`

### 3. authDto.js
**Location:** `/src/backend/middleware/authDto.js` (assumed location)

**Changes:**
- Updated `validateLogin()` function:
  - Changed field validation from `emailOrUsercode` to `username`
  - Added minimum 3 character validation for username
  - Updated error messages to reference "Username" instead of "Email or Usercode"
  - Returns `{ username, password }` in validated data

### 4. auth.js (Routes)
**Location:** `/src/backend/routes/auth.js`

**Changes:**
- Updated Swagger documentation:
  - Changed `LoginRequest` schema from `emailOrUsercode` to `username`
  - Updated field description and example
  - Added `minLength: 3` validation

**Existing Endpoints:**
- POST `/api/auth/login` - Login with username and password
- POST `/api/auth/refresh` - Refresh access token using refresh token

## Frontend Changes

### 1. api.js (Axios Instance)
**Location:** `/src/services/api.js`

**Changes:**
- Changed token storage key from `crs_token` to `lens_management_token`
- Changed refresh token key to `lens_management_refresh_token`
- Changed user storage key from `crs_user` to `lens_management_user`

- Implemented refresh token logic:
  - Added queue mechanism to prevent multiple simultaneous refresh attempts
  - On 401 error, attempts to refresh token automatically
  - If refresh succeeds, retries original request with new token
  - If refresh fails, clears all tokens and redirects to login
  - Uses `isRefreshing` flag and `failedQueue` to handle concurrent requests

**Token Flow:**
1. Request fails with 401
2. Check if already refreshing (if yes, queue request)
3. Attempt token refresh with stored refresh token
4. On success: Update tokens, retry request, process queue
5. On failure: Clear tokens, redirect to login

### 2. auth.js (Service)
**Location:** `/src/services/auth.js` (NEW FILE)

**Functions:**
- `login(username, password)` - Login and store tokens
- `logout()` - Clear all auth data
- `getCurrentUser()` - Get user from localStorage
- `isAuthenticated()` - Check if user has valid token
- `refreshAccessToken()` - Refresh access token

**Token Storage:**
- `lens_management_token` - Access token (JWT)
- `lens_management_refresh_token` - Refresh token
- `lens_management_user` - User profile data (JSON)

### 3. AuthContext.jsx
**Location:** `/src/contexts/AuthContext.jsx`

**Changes:**
- Removed dummy user authentication
- Integrated with real auth service
- Updated `login()` to be async and use username
- Added `isLoading` state
- Added `isAuthenticated()` helper
- Added storage event listener to sync auth state across tabs
- Updated `hasPermission()` to use `user.roleName`

**Context Values:**
- `user` - Current user object
- `login(username, password)` - Async login function
- `logout()` - Logout function
- `hasPermission(allowedRoles)` - Check user role permissions
- `isAuthenticated()` - Check auth status
- `isLoading` - Loading state for async operations

### 4. Login.jsx
**Location:** `/src/pages/Login.jsx`

**Changes:**
- Changed state from `email` to `username`
- Updated form field:
  - Changed type from "email" to "text"
  - Changed label from "Email" to "Username"
  - Changed placeholder to "Enter your username"
  - Added `minLength={3}` validation
  - Added `autoComplete="username"`

- Updated `handleSubmit()`:
  - Made async to handle Promise from login
  - Added loading state
  - Added comprehensive error handling with error code mapping:
    - `NO_LOGIN_ACCESS` → "You do not have login access..."
    - `ACCOUNT_INACTIVE` → "Your account is inactive..."
    - `LOGIN_NOT_ENABLED` → "Login is not enabled..."
    - `INVALID_CREDENTIALS` → "Invalid username or password"

- Updated demo credentials:
  - Changed from email-based to username-based
  - Examples: admin, rahul, priya, amit

## Error Handling

### Backend Error Codes
1. `NO_LOGIN_ACCESS` - User has delete_status = true
2. `ACCOUNT_INACTIVE` - User has active_status = false
3. `LOGIN_NOT_ENABLED` - User has is_login = false
4. `INVALID_CREDENTIALS` - Wrong username or password

### Frontend Error Mapping
The Login.jsx component maps backend error codes to user-friendly messages with specific guidance (contact administrator).

## Token Management

### Token Lifecycle
1. **Login:** Receive access token (15m) and refresh token (7d)
2. **Request:** Include access token in Authorization header
3. **Expiry:** On 401, automatically refresh using refresh token
4. **Refresh:** Get new access and refresh tokens
5. **Logout:** Clear all tokens from storage

### Security Features
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens stored in localStorage with new namespace
- JWT issuer: 'lens-management'
- Automatic token refresh on expiry
- Queue mechanism prevents refresh stampede

## Migration Guide

### For Users
- Use **username** to login instead of email
- Demo usernames: admin, rahul, priya, amit
- Password remains the same

### For Developers
1. Update any hardcoded token references from `crs_token` to `lens_management_token`
2. User object structure now includes `username` field
3. Check for `user.roleName` instead of `user.role` for permissions
4. Handle new error codes in API error handling

## Testing Checklist

- [ ] Login with valid username and password (is_login=true)
- [ ] Login with valid credentials but is_login=false
- [ ] Login with valid credentials but active_status=false
- [ ] Login with valid credentials but delete_status=true
- [ ] Login with invalid username
- [ ] Login with invalid password
- [ ] Access protected route without token
- [ ] Token auto-refresh on expiry
- [ ] Token refresh failure (expired refresh token)
- [ ] Logout and clear all tokens
- [ ] Multiple tabs - logout in one tab affects others
- [ ] Concurrent requests during token refresh

## Database Requirements

Ensure User model has these fields:
- `username` (String, unique, required)
- `password` (String, hashed, required for login-enabled users)
- `is_login` (Boolean, default: false)
- `active_status` (Boolean, required)
- `delete_status` (Boolean, default: false)
- `email` (String, unique, required)
- `usercode` (String, unique, required)
- `role_id` (Int, foreign key to Role)

## Files Modified Summary

**Backend (4 files):**
1. `/src/backend/services/authService.js` - Core auth logic
2. `/src/backend/controllers/authControllerNew.js` - HTTP handlers
3. `/src/backend/middleware/authDto.js` - Request validation
4. `/src/backend/routes/auth.js` - Swagger docs

**Frontend (5 files):**
1. `/src/services/api.js` - Axios interceptors + refresh logic
2. `/src/services/auth.js` - Auth service (NEW)
3. `/src/contexts/AuthContext.jsx` - Auth state management
4. `/src/pages/Login.jsx` - Login form UI

## Next Steps

1. Test complete authentication flow
2. Update any existing code that references old token names
3. Create database migration if username field doesn't exist
4. Update user seed data with usernames
5. Test refresh token expiration handling
6. Add password reset functionality (future)
7. Add remember me functionality (future)
