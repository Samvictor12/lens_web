# Migration Guide: Old Auth → New Username-Based Auth

## Quick Reference

### What Changed?
| Aspect | Before | After |
|--------|--------|-------|
| **Login Field** | Email or Usercode | Username only |
| **Token Storage** | `crs_token` | `lens_management_token` |
| **Refresh Token** | `crs_refresh_token` (if existed) | `lens_management_refresh_token` |
| **User Storage** | `crs_user` | `lens_management_user` |
| **JWT Issuer** | `lens-project` | `lens-management` |
| **JWT Payload** | No username | Includes username |
| **Validation Checks** | Basic password check | 4-level validation |
| **Auto-Refresh** | Manual/not implemented | Automatic via interceptor |

---

## For End Users

### Login Changes
**Old Way:**
- Use email (e.g., `admin@lensbilling.com`) or usercode (e.g., `ADM001`)

**New Way:**
- Use username only (e.g., `admin`)
- Password remains the same

### Error Messages
You'll now see clearer error messages:
- ❌ "Login is not enabled for this account" - Contact administrator to enable login
- ❌ "Your account is inactive" - Contact administrator to activate
- ❌ "You do not have login access" - Account marked as deleted
- ❌ "Invalid username or password" - Wrong credentials

### Session Management
- Sessions automatically refresh (no need to re-login for 15 minutes)
- If inactive for 7 days, you'll need to login again
- Logging out in one tab logs you out everywhere

---

## For Developers

### 1. Update Any Hardcoded Token References

**Old Code:**
```javascript
const token = localStorage.getItem('crs_token');
const user = JSON.parse(localStorage.getItem('crs_user'));
```

**New Code:**
```javascript
const token = localStorage.getItem('lens_management_token');
const user = JSON.parse(localStorage.getItem('lens_management_user'));
```

**Better Approach:**
```javascript
import { getCurrentUser, isAuthenticated } from '@/services/auth';

const user = getCurrentUser();
const isLoggedIn = isAuthenticated();
```

---

### 2. Update Login API Calls

**Old Code:**
```javascript
// Backend endpoint
POST /api/auth/login
Body: {
  emailOrUsercode: "admin@lensbilling.com",
  password: "password123"
}
```

**New Code:**
```javascript
// Backend endpoint
POST /api/auth/login
Body: {
  username: "admin",
  password: "password123"
}
```

**Frontend:**
```javascript
import { login } from '@/services/auth';

// Old way
await apiClient('post', '/auth/login', {
  data: {
    emailOrUsercode: email,
    password: password
  }
});

// New way
await login(username, password);  // Handles token storage automatically
```

---

### 3. Handle New Error Codes

**Backend Errors:**
```javascript
// Old: Generic "Invalid credentials"
// New: Specific error codes

switch (error.errorCode) {
  case 'NO_LOGIN_ACCESS':
    // User deleted or no access
    message = "Contact administrator - account access removed";
    break;
  
  case 'ACCOUNT_INACTIVE':
    // User inactive
    message = "Contact administrator - account inactive";
    break;
  
  case 'LOGIN_NOT_ENABLED':
    // Login not enabled for user
    message = "Contact administrator - login not enabled";
    break;
  
  case 'INVALID_CREDENTIALS':
    // Wrong username or password
    message = "Invalid username or password";
    break;
}
```

---

### 4. Use AuthContext Hooks

**Old Code:**
```javascript
// Checking user manually
const userStr = localStorage.getItem('lensUser');
const user = userStr ? JSON.parse(userStr) : null;

if (user && user.role === 'Admin') {
  // Do something
}
```

**New Code:**
```javascript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, hasPermission, isAuthenticated, logout } = useAuth();
  
  // Check authentication
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  // Check permissions
  if (hasPermission(['Admin', 'Manager'])) {
    return <AdminPanel />;
  }
  
  // Use user data
  return <div>Welcome {user.username}!</div>;
}
```

---

### 5. JWT Decoding Changes

**Old JWT Payload:**
```json
{
  "userId": 1,
  "email": "admin@lensbilling.com",
  "usercode": "ADM001",
  "roleId": 1,
  "roleName": "Admin",
  "iss": "lens-project",
  "exp": 1234567890
}
```

**New JWT Payload:**
```json
{
  "userId": 1,
  "email": "admin@lensbilling.com",
  "usercode": "ADM001",
  "username": "admin",
  "role_id": 1,
  "roleName": "Admin",
  "iss": "lens-management",
  "exp": 1234567890
}
```

**Changes:**
- ✅ Added `username` field
- ✅ Changed `roleId` to `role_id` (snake_case)
- ✅ Changed issuer from `lens-project` to `lens-management`

---

### 6. Automatic Token Refresh

**Old Way:**
```javascript
// Manual refresh or redirect to login on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crs_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**New Way:**
```javascript
// Automatic refresh built into api.js
// On 401:
// 1. Checks if already refreshing
// 2. Attempts refresh with stored refresh token
// 3. Retries original request with new token
// 4. Only redirects to login if refresh fails

// No changes needed - it's automatic!
// But you can import refresh function if needed:
import { refreshAccessToken } from '@/services/auth';

try {
  const response = await refreshAccessToken();
  // New tokens automatically stored
} catch (error) {
  // Refresh failed, user needs to re-login
}
```

---

### 7. Database User Records

**Required Fields:**
```javascript
// User Model (Prisma)
model user_master {
  id            Int      @id @default(autoincrement())
  username      String   @unique  // NEW: Required for login
  password      String?  // Hashed, required if is_login = true
  email         String   @unique
  usercode      String   @unique
  is_login      Boolean  @default(false)  // NEW: Must be true to login
  active_status Boolean  @default(true)   // Must be true to login
  delete_status Boolean  @default(false)  // Must be false to login
  role_id       Int
  role          role_master @relation(fields: [role_id], references: [id])
  // ... other fields
}
```

**Login Validation Flow:**
1. ❌ Check `delete_status` = true → "No login access"
2. ❌ Check `active_status` = false → "Account inactive"
3. ❌ Check `is_login` = false → "Login not enabled"
4. ❌ Check password incorrect → "Invalid credentials"
5. ✅ All checks pass → Generate tokens

---

### 8. Testing Existing Features

**Check these areas:**
1. **Protected Routes:** Ensure routes still check auth correctly
2. **API Calls:** All authenticated requests should work
3. **User Display:** Show username instead of email where appropriate
4. **Role Checks:** Verify `hasPermission()` works with new structure
5. **Logout:** Ensure logout clears all new token keys

---

### 9. Breaking Changes Checklist

❗ **Action Required:**
- [ ] Update any references to `crs_token` → `lens_management_token`
- [ ] Update any references to `crs_user` → `lens_management_user`
- [ ] Update login forms to use username field
- [ ] Update user display to show username
- [ ] Test protected routes with new auth
- [ ] Test role-based permissions
- [ ] Verify logout functionality
- [ ] Check any custom auth logic

❗ **Database Changes:**
- [ ] Ensure all users have `username` field populated
- [ ] Set `is_login = true` for users who should be able to login
- [ ] Verify `active_status = true` for active users
- [ ] Ensure `delete_status = false` for non-deleted users

❗ **Frontend Environment:**
- [ ] No changes to `.env` needed
- [ ] Clear localStorage on first deployment (old tokens incompatible)
- [ ] Inform users they'll need to re-login once

---

## Deployment Steps

### Pre-Deployment

1. **Backup Database:**
   ```bash
   pg_dump lens_db > backup_before_auth_update.sql
   ```

2. **Update User Records:**
   ```sql
   -- Ensure all active users have usernames
   SELECT id, email, username FROM user_master WHERE is_login = true AND (username IS NULL OR username = '');
   
   -- Set default usernames if needed
   UPDATE user_master 
   SET username = LOWER(SPLIT_PART(email, '@', 1))
   WHERE username IS NULL OR username = '';
   ```

3. **Test in Development:**
   - Run all tests in AUTH_TESTING_CHECKLIST.md
   - Verify no regressions

### Deployment

1. **Deploy Backend:**
   ```bash
   git pull origin main
   npm install
   npm run build  # if applicable
   pm2 restart lens-backend  # or your process manager
   ```

2. **Deploy Frontend:**
   ```bash
   git pull origin main
   npm install
   npm run build
   # Deploy to hosting (Vercel, Netlify, etc.)
   ```

3. **Clear Old Tokens:**
   - Users must clear browser localStorage OR
   - Add migration script to clear old tokens:
   ```javascript
   // Add to main.jsx or App.jsx temporarily
   if (localStorage.getItem('crs_token')) {
     localStorage.removeItem('crs_token');
     localStorage.removeItem('crs_user');
     localStorage.removeItem('crs_refresh_token');
     window.location.href = '/login';
   }
   ```

### Post-Deployment

1. **Monitor Logs:**
   - Check for auth-related errors
   - Monitor failed login attempts
   - Check refresh token usage

2. **User Support:**
   - Inform users about username login
   - Provide username lookup if needed
   - Handle account activation requests

3. **Verify:**
   - Login works for all user types
   - Token refresh works automatically
   - No old token references exist

---

## Rollback Plan

If issues arise:

1. **Backend Rollback:**
   ```bash
   git checkout <previous-commit>
   npm install
   pm2 restart lens-backend
   ```

2. **Frontend Rollback:**
   ```bash
   git checkout <previous-commit>
   npm install
   npm run build
   # Redeploy
   ```

3. **Database:**
   ```bash
   psql lens_db < backup_before_auth_update.sql
   ```

---

## Support & Troubleshooting

### Common Issues

**Issue: "Invalid username or password" but credentials are correct**
- Check if `is_login = true` for the user
- Check if `active_status = true`
- Check if `delete_status = false`
- Verify username is correct (not email)

**Issue: Token refresh fails**
- Check if refresh token is expired (7 days)
- Verify `/api/auth/refresh` endpoint is working
- Check console for specific error

**Issue: Logged out unexpectedly**
- Check if access token expired (15 min)
- Verify refresh token is present
- Check for localStorage clearing

**Issue: "Login is not enabled for this account"**
- Run this query to enable login:
  ```sql
  UPDATE user_master SET is_login = true WHERE username = 'username';
  ```

---

## API Endpoint Summary

### Authentication Endpoints

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/auth/login` | POST | `{ username, password }` | `{ user, accessToken, refreshToken }` |
| `/api/auth/refresh` | POST | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| `/api/auth/logout` | POST | `{ refreshToken }` | `{ success: true }` |

### User Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user-master/:id/enable-login` | POST | Enable login for user |
| `/api/user-master/:id/update-login` | PUT | Update login credentials |
| `/api/user-master/:id/login-credentials` | GET | Get login status |

---

## Questions?

Contact: Development Team
Documentation: /AUTH_REFACTOR_SUMMARY.md
Testing: /AUTH_TESTING_CHECKLIST.md
