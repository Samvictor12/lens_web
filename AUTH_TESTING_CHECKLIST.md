# Authentication Testing Checklist

## Pre-Test Setup

### 1. Ensure Database Has Test Users
Create test users with different scenarios:

```sql
-- User with login enabled and active
INSERT INTO user_master (username, password, is_login, active_status, delete_status, email, usercode, role_id)
VALUES ('testuser', '$hashed_password', true, true, false, 'test@example.com', 'USR001', 1);

-- User with login disabled
INSERT INTO user_master (username, password, is_login, active_status, delete_status, email, usercode, role_id)
VALUES ('nologin', '$hashed_password', false, true, false, 'nologin@example.com', 'USR002', 1);

-- User with inactive account
INSERT INTO user_master (username, password, is_login, active_status, delete_status, email, usercode, role_id)
VALUES ('inactive', '$hashed_password', true, false, false, 'inactive@example.com', 'USR003', 1);

-- User with deleted status
INSERT INTO user_master (username, password, is_login, active_status, delete_status, email, usercode, role_id)
VALUES ('deleted', '$hashed_password', true, true, true, 'deleted@example.com', 'USR004', 1);
```

### 2. Backend Server Running
```bash
cd /Users/kavin/Documents/Project/lens/lens_web
npm run dev  # or your backend start command
```

### 3. Frontend Server Running
```bash
cd /Users/kavin/Documents/Project/lens/lens_web
npm run dev  # Vite development server
```

---

## Test Cases

### ✅ Test 1: Successful Login
**Prerequisites:** User with `is_login=true`, `active_status=true`, `delete_status=false`

**Steps:**
1. Navigate to `/login`
2. Enter valid username (e.g., "admin")
3. Enter valid password (e.g., "demo")
4. Click "Sign In"

**Expected Result:**
- ✅ Success toast: "Login successful - Welcome back!"
- ✅ Redirect to `/dashboard`
- ✅ localStorage contains:
  - `lens_management_token`
  - `lens_management_refresh_token`
  - `lens_management_user`
- ✅ User info displayed in header/sidebar

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 2: Login Not Enabled
**Prerequisites:** User with `is_login=false`

**Steps:**
1. Navigate to `/login`
2. Enter username of user with `is_login=false`
3. Enter correct password
4. Click "Sign In"

**Expected Result:**
- ✅ Error toast: "Login is not enabled for this account. Please contact administrator."
- ✅ No redirect
- ✅ No tokens stored

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 3: Inactive Account
**Prerequisites:** User with `active_status=false`

**Steps:**
1. Navigate to `/login`
2. Enter username of inactive user
3. Enter correct password
4. Click "Sign In"

**Expected Result:**
- ✅ Error toast: "Your account is inactive. Please contact administrator for login access."
- ✅ No redirect
- ✅ No tokens stored

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 4: Deleted/No Access Account
**Prerequisites:** User with `delete_status=true`

**Steps:**
1. Navigate to `/login`
2. Enter username of deleted user
3. Enter correct password
4. Click "Sign In"

**Expected Result:**
- ✅ Error toast: "You do not have login access. Please contact administrator."
- ✅ No redirect
- ✅ No tokens stored

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 5: Invalid Username
**Prerequisites:** None

**Steps:**
1. Navigate to `/login`
2. Enter non-existent username (e.g., "nonexistentuser123")
3. Enter any password
4. Click "Sign In"

**Expected Result:**
- ✅ Error toast: "Invalid username or password"
- ✅ No redirect
- ✅ No tokens stored

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 6: Invalid Password
**Prerequisites:** Valid user exists

**Steps:**
1. Navigate to `/login`
2. Enter valid username
3. Enter incorrect password
4. Click "Sign In"

**Expected Result:**
- ✅ Error toast: "Invalid username or password"
- ✅ No redirect
- ✅ No tokens stored

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 7: Empty Fields Validation
**Prerequisites:** None

**Steps:**
1. Navigate to `/login`
2. Leave username empty
3. Enter password
4. Click "Sign In"

**Expected Result:**
- ✅ HTML5 validation error (required field)
- ✅ No API call made

**Repeat with:**
- [ ] Empty password
- [ ] Both fields empty

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 8: Username Minimum Length
**Prerequisites:** None

**Steps:**
1. Navigate to `/login`
2. Enter username with 2 characters (e.g., "ab")
3. Enter password
4. Click "Sign In"

**Expected Result:**
- ✅ HTML5 validation error (minLength=3)
- ✅ No API call made

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 9: Access Protected Route Without Token
**Prerequisites:** No tokens in localStorage

**Steps:**
1. Clear localStorage
2. Navigate directly to `/dashboard`

**Expected Result:**
- ✅ Redirect to `/login`
- ✅ No data loaded

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 10: Token Auto-Refresh on Expiry
**Prerequisites:** Logged in user, access token expired

**Steps:**
1. Login successfully
2. Wait for access token to expire (15 minutes) OR manually expire token
3. Make any API request (e.g., navigate to customers page)

**Expected Result:**
- ✅ API call intercepts 401 error
- ✅ Refresh token automatically used
- ✅ New access token obtained
- ✅ Original request retries successfully
- ✅ No redirect to login
- ✅ localStorage updated with new tokens

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 11: Refresh Token Expired
**Prerequisites:** Logged in user, refresh token expired

**Steps:**
1. Login successfully
2. Manually expire refresh token (or wait 7 days)
3. Make any API request

**Expected Result:**
- ✅ Refresh attempt fails
- ✅ All tokens cleared from localStorage
- ✅ Alert: "Session expired. Please login again."
- ✅ Redirect to `/login`

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 12: Logout Functionality
**Prerequisites:** Logged in user

**Steps:**
1. Login successfully
2. Click logout button

**Expected Result:**
- ✅ All tokens removed from localStorage:
  - `lens_management_token`
  - `lens_management_refresh_token`
  - `lens_management_user`
- ✅ Redirect to `/login`
- ✅ User state cleared in AuthContext

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 13: Multiple Tabs Sync
**Prerequisites:** Logged in user

**Steps:**
1. Login in Tab 1
2. Open Tab 2 with same app
3. Logout in Tab 1
4. Check Tab 2

**Expected Result:**
- ✅ Tab 2 detects storage change
- ✅ Tab 2 updates user state to null
- ✅ Tab 2 redirects to login (if on protected route)

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 14: Concurrent Requests During Refresh
**Prerequisites:** Logged in user, token about to expire

**Steps:**
1. Login successfully
2. Expire access token
3. Make multiple simultaneous API requests (e.g., load dashboard with multiple data calls)

**Expected Result:**
- ✅ Only one refresh attempt made
- ✅ Other requests queued
- ✅ After refresh, all queued requests retry successfully
- ✅ No duplicate refresh calls

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 15: Demo Credentials Quick Fill
**Prerequisites:** None

**Steps:**
1. Navigate to `/login`
2. Click on any demo credential button (Admin, Sales, Inventory, Accounts)

**Expected Result:**
- ✅ Username field auto-filled with demo username
- ✅ Password field auto-filled with "demo"
- ✅ Can click "Sign In" to login

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 16: Loading State
**Prerequisites:** None

**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In"
4. Observe button during API call

**Expected Result:**
- ✅ Button shows "Signing In..." text
- ✅ Button is disabled during API call
- ✅ Loading state clears after response

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 17: JWT Payload Verification
**Prerequisites:** Logged in user

**Steps:**
1. Login successfully
2. Copy access token from localStorage
3. Decode JWT at https://jwt.io

**Expected Result:**
JWT payload contains:
- ✅ `userId`
- ✅ `email`
- ✅ `usercode`
- ✅ `username`
- ✅ `role_id`
- ✅ `roleName`
- ✅ `iss: "lens-management"`
- ✅ `exp` (expiration timestamp)

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

### ✅ Test 18: Role-Based Permissions
**Prerequisites:** Users with different roles

**Steps:**
1. Login with Admin user
2. Check accessible routes/features
3. Logout
4. Login with Sales user
5. Check accessible routes/features

**Expected Result:**
- ✅ `hasPermission()` correctly restricts access
- ✅ Different roles see different menu items
- ✅ Unauthorized access redirected or blocked

**Actual Result:**
- [ ] Pass
- [ ] Fail (Details: _________________)

---

## Browser Console Checks

### On Successful Login:
```javascript
// Check localStorage
localStorage.getItem('lens_management_token')  // Should return JWT string
localStorage.getItem('lens_management_refresh_token')  // Should return JWT string
localStorage.getItem('lens_management_user')  // Should return JSON user object

// Parse user data
JSON.parse(localStorage.getItem('lens_management_user'))
// Should show: { id, email, usercode, username, roleName, ... }
```

### On Logout:
```javascript
// All should be null
localStorage.getItem('lens_management_token')
localStorage.getItem('lens_management_refresh_token')
localStorage.getItem('lens_management_user')
```

---

## Network Tab Checks

### Login Request:
```
POST /api/auth/login
Request Body: { username: "admin", password: "demo" }
Response: { success: true, data: { user, accessToken, refreshToken } }
```

### Protected Route Request:
```
GET /api/customers (or any protected route)
Request Headers: Authorization: Bearer <token>
```

### Refresh Request (on token expiry):
```
POST /api/auth/refresh
Request Body: { refreshToken: "<refresh_token>" }
Response: { success: true, data: { accessToken, refreshToken } }
```

---

## Known Issues / Notes

1. **Token Expiry Testing:** To test without waiting 15 minutes:
   - Manually change JWT exp time in authService.js to 1 minute
   - Or use browser dev tools to modify token

2. **Refresh Token Queue:** The queue mechanism prevents refresh stampede but may queue requests briefly

3. **Storage Events:** Only work across different tabs, not same tab

---

## Test Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Successful Login | ⏳ Pending | |
| 2. Login Not Enabled | ⏳ Pending | |
| 3. Inactive Account | ⏳ Pending | |
| 4. Deleted Account | ⏳ Pending | |
| 5. Invalid Username | ⏳ Pending | |
| 6. Invalid Password | ⏳ Pending | |
| 7. Empty Fields | ⏳ Pending | |
| 8. Username Min Length | ⏳ Pending | |
| 9. Protected Route | ⏳ Pending | |
| 10. Token Auto-Refresh | ⏳ Pending | |
| 11. Refresh Token Expired | ⏳ Pending | |
| 12. Logout | ⏳ Pending | |
| 13. Multi-Tab Sync | ⏳ Pending | |
| 14. Concurrent Requests | ⏳ Pending | |
| 15. Demo Credentials | ⏳ Pending | |
| 16. Loading State | ⏳ Pending | |
| 17. JWT Payload | ⏳ Pending | |
| 18. Role Permissions | ⏳ Pending | |

**Total Tests:** 18
**Passed:** 0
**Failed:** 0
**Pending:** 18

---

## Next Steps After Testing

1. [ ] Document any bugs found
2. [ ] Update user documentation with username login
3. [ ] Train users on new login flow
4. [ ] Monitor production for auth-related errors
5. [ ] Set up alerts for failed login attempts
6. [ ] Consider implementing:
   - [ ] Password reset via email
   - [ ] Remember me functionality
   - [ ] Account lockout after failed attempts
   - [ ] Two-factor authentication
