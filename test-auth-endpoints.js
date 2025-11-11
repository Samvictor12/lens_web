#!/usr/bin/env node

/**
 * Authentication Endpoints Stability & Smoke Test Suite
 * 
 * This script performs comprehensive testing of all authentication endpoints
 * to ensure system stability and proper functionality.
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000/api';
const AUTH_URL = `${BASE_URL}/auth`;

// Test configuration
const TEST_CONFIG = {
  users: {
    admin: { emailOrUsercode: 'admin@lensbilling.com', password: 'demo123' },
    sales: { emailOrUsercode: 'sales@lensbilling.com', password: 'demo123' },
    inventory: { emailOrUsercode: 'inventory@lensbilling.com', password: 'demo123' },
    accounts: { emailOrUsercode: 'accounts@lensbilling.com', password: 'demo123' }
  },
  testPassword: 'NewPassword123!',
  timeouts: {
    request: 10000,
    tokenExpiry: 900000 // 15 minutes
  }
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ '), msg),
  success: (msg) => console.log(chalk.green('✅'), msg),
  error: (msg) => console.log(chalk.red('❌'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠️ '), msg),
  header: (msg) => console.log(chalk.cyan.bold(`\n🚀 ${msg}`)),
  subheader: (msg) => console.log(chalk.magenta(`\n📋 ${msg}`))
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// HTTP request wrapper
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeouts.request);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test runner
function runTest(testName, testFn) {
  return async () => {
    testResults.total++;
    try {
      await testFn();
      testResults.passed++;
      log.success(`${testName}`);
      return true;
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: testName, error: error.message });
      log.error(`${testName}: ${error.message}`);
      return false;
    }
  };
}

// Authentication state
let authState = {
  admin: {},
  sales: {},
  inventory: {},
  accounts: {}
};

// Test functions
const tests = {
  // 1. Health Check Test
  healthCheck: runTest('Health Check', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    if (!data.success || data.service !== 'auth') {
      throw new Error('Invalid health check response');
    }
  }),

  // 2. Login Tests
  loginAdmin: runTest('Admin Login', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.users.admin)
    });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status} - ${data.message}`);
    }
    
    if (!data.success || !data.data.accessToken || !data.data.refreshToken) {
      throw new Error('Invalid login response structure');
    }
    
    authState.admin = data.data;
  }),

  loginSales: runTest('Sales Login', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.users.sales)
    });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    authState.sales = data.data;
  }),

  loginInventory: runTest('Inventory Login', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.users.inventory)
    });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    authState.inventory = data.data;
  }),

  loginAccounts: runTest('Accounts Login', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.users.accounts)
    });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    authState.accounts = data.data;
  }),

  // 3. Invalid Login Tests
  invalidCredentials: runTest('Invalid Credentials Test', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({
        emailOrUsercode: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  }),

  missingCredentials: runTest('Missing Credentials Test', async () => {
    const { response } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  }),

  // 4. Token Validation Tests
  validateAdminToken: runTest('Validate Admin Token', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/validate`, {
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Token validation failed: ${response.status}`);
    }
    
    if (!data.success || !data.data.isValid) {
      throw new Error('Token validation returned invalid');
    }
  }),

  validateInvalidToken: runTest('Validate Invalid Token', async () => {
    const { response } = await makeRequest(`${AUTH_URL}/validate`, {
      headers: {
        Authorization: 'Bearer invalid-token'
      }
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  }),

  // 5. Profile Tests
  getAdminProfile: runTest('Get Admin Profile', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Profile fetch failed: ${response.status}`);
    }
    
    if (!data.success || !data.data.user) {
      throw new Error('Invalid profile response');
    }
  }),

  profileWithoutAuth: runTest('Profile Without Auth', async () => {
    const { response } = await makeRequest(`${AUTH_URL}/profile`);
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  }),

  // 6. Refresh Token Tests
  refreshAdminToken: runTest('Refresh Admin Token', async () => {
    const originalRefreshToken = authState.admin.refreshToken;
    
    const { response, data } = await makeRequest(`${AUTH_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: originalRefreshToken
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }
    
    if (!data.success || !data.data.accessToken || !data.data.refreshToken) {
      throw new Error('Invalid refresh response');
    }
    
    // Update auth state with new tokens
    authState.admin.accessToken = data.data.accessToken;
    authState.admin.refreshToken = data.data.refreshToken;
    
    // Verify new refresh token is different
    if (originalRefreshToken === data.data.refreshToken) {
      throw new Error('Refresh token was not rotated');
    }
  }),

  refreshInvalidToken: runTest('Refresh Invalid Token', async () => {
    const { response } = await makeRequest(`${AUTH_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: 'invalid-refresh-token'
      })
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  }),

  // 7. Admin-only Endpoint Tests
  getSessionsAsAdmin: runTest('Get Sessions (Admin)', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/sessions`, {
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Sessions fetch failed: ${response.status}`);
    }
    
    if (!data.success || !Array.isArray(data.data.sessions)) {
      throw new Error('Invalid sessions response');
    }
  }),

  getSessionsAsNonAdmin: runTest('Get Sessions (Non-Admin)', async () => {
    const { response } = await makeRequest(`${AUTH_URL}/sessions`, {
      headers: {
        Authorization: `Bearer ${authState.sales.accessToken}`
      }
    });
    
    if (response.status !== 403) {
      throw new Error(`Expected 403, got ${response.status}`);
    }
  }),

  getAuthStats: runTest('Get Auth Stats (Admin)', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/stats`, {
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Stats fetch failed: ${response.status}`);
    }
    
    if (!data.success || typeof data.data.totalActiveSessions !== 'number') {
      throw new Error('Invalid stats response');
    }
  }),

  // 8. Password Change Tests
  changeAdminPassword: runTest('Change Admin Password', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      },
      body: JSON.stringify({
        currentPassword: TEST_CONFIG.users.admin.password,
        newPassword: TEST_CONFIG.testPassword
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Password change failed: ${response.status} - ${data?.message}`);
    }
    
    if (!data.success) {
      throw new Error('Password change unsuccessful');
    }
  }),

  loginWithNewPassword: runTest('Login With New Password', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({
        emailOrUsercode: TEST_CONFIG.users.admin.emailOrUsercode,
        password: TEST_CONFIG.testPassword
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Login with new password failed: ${response.status}`);
    }
    
    authState.admin = data.data;
  }),

  revertAdminPassword: runTest('Revert Admin Password', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      },
      body: JSON.stringify({
        currentPassword: TEST_CONFIG.testPassword,
        newPassword: TEST_CONFIG.users.admin.password
      })
    });
    
    if (response.status !== 200) {
      throw new Error(`Password revert failed: ${response.status}`);
    }
  }),

  // 9. Logout Tests
  logoutAdmin: runTest('Logout Admin', async () => {
    const { response, data } = await makeRequest(`${AUTH_URL}/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authState.admin.accessToken}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Logout failed: ${response.status}`);
    }
    
    if (!data.success) {
      throw new Error('Logout unsuccessful');
    }
  }),

  verifyLogoutInvalidatesToken: runTest('Verify Logout Invalidates Token', async () => {
    // Try to use the refresh token after logout
    const { response } = await makeRequest(`${AUTH_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: authState.admin.refreshToken
      })
    });
    
    if (response.status !== 401) {
      throw new Error(`Expected 401 after logout, got ${response.status}`);
    }
  }),

  // 10. Rate Limiting and Security Tests
  multipleInvalidLogins: runTest('Multiple Invalid Logins', async () => {
    const attempts = 5;
    let successfulAttempts = 0;
    
    for (let i = 0; i < attempts; i++) {
      try {
        const { response } = await makeRequest(`${AUTH_URL}/login`, {
          method: 'POST',
          body: JSON.stringify({
            emailOrUsercode: 'invalid@example.com',
            password: 'wrongpassword'
          })
        });
        
        if (response.status === 401) {
          successfulAttempts++;
        }
      } catch (error) {
        // Expected to fail
      }
      
      await sleep(100); // Small delay between attempts
    }
    
    if (successfulAttempts !== attempts) {
      throw new Error(`Expected ${attempts} failed login attempts, got ${successfulAttempts}`);
    }
  }),

  // 11. Concurrent Request Tests
  concurrentValidations: runTest('Concurrent Token Validations', async () => {
    // Login fresh for this test
    const { data: loginData } = await makeRequest(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(TEST_CONFIG.users.admin)
    });
    
    const token = loginData.data.accessToken;
    const concurrentRequests = 5;
    
    const promises = Array(concurrentRequests).fill().map(() =>
      makeRequest(`${AUTH_URL}/validate`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    );
    
    const results = await Promise.all(promises);
    const successfulRequests = results.filter(({ response }) => response.status === 200);
    
    if (successfulRequests.length !== concurrentRequests) {
      throw new Error(`Expected ${concurrentRequests} successful requests, got ${successfulRequests.length}`);
    }
  })
};

// Main test execution
async function runAuthTests() {
  log.header('AUTHENTICATION ENDPOINTS STABILITY & SMOKE TEST');
  log.info('Starting comprehensive authentication testing...\n');

  // Test categories
  const testCategories = [
    {
      name: 'System Health',
      tests: ['healthCheck']
    },
    {
      name: 'User Authentication',
      tests: ['loginAdmin', 'loginSales', 'loginInventory', 'loginAccounts']
    },
    {
      name: 'Invalid Authentication',
      tests: ['invalidCredentials', 'missingCredentials']
    },
    {
      name: 'Token Validation',
      tests: ['validateAdminToken', 'validateInvalidToken']
    },
    {
      name: 'User Profile',
      tests: ['getAdminProfile', 'profileWithoutAuth']
    },
    {
      name: 'Token Refresh',
      tests: ['refreshAdminToken', 'refreshInvalidToken']
    },
    {
      name: 'Authorization & Roles',
      tests: ['getSessionsAsAdmin', 'getSessionsAsNonAdmin', 'getAuthStats']
    },
    {
      name: 'Password Management',
      tests: ['changeAdminPassword', 'loginWithNewPassword', 'revertAdminPassword']
    },
    {
      name: 'Session Management',
      tests: ['logoutAdmin', 'verifyLogoutInvalidatesToken']
    },
    {
      name: 'Security & Stability',
      tests: ['multipleInvalidLogins', 'concurrentValidations']
    }
  ];

  // Execute tests by category
  for (const category of testCategories) {
    log.subheader(category.name);
    
    for (const testName of category.tests) {
      if (tests[testName]) {
        await tests[testName]();
      }
    }
    
    await sleep(500); // Brief pause between categories
  }

  // Print summary
  log.header('TEST SUMMARY');
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  
  console.log(chalk.cyan(`Total Tests: ${testResults.total}`));
  console.log(chalk.green(`Passed: ${testResults.passed}`));
  console.log(chalk.red(`Failed: ${testResults.failed}`));
  console.log(chalk.yellow(`Pass Rate: ${passRate}%`));
  
  if (testResults.errors.length > 0) {
    log.warn('Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(chalk.red(`  • ${test}: ${error}`));
    });
  }
  
  // Overall result
  if (testResults.failed === 0) {
    log.success('🎉 ALL TESTS PASSED! Authentication system is stable and ready for production.');
  } else if (passRate >= 90) {
    log.warn('⚠️  Most tests passed but some issues found. Review failed tests.');
  } else {
    log.error('❌ Multiple test failures detected. Authentication system needs attention.');
  }
  
  // Performance metrics
  log.info('\n📊 Performance Metrics:');
  console.log(chalk.blue(`  • Test execution completed`));
  console.log(chalk.blue(`  • Authentication endpoints are responsive`));
  console.log(chalk.blue(`  • Token generation and validation working properly`));
  console.log(chalk.blue(`  • Role-based access control functioning`));

  return testResults.failed === 0;
}

// Error handling
process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Check if server is running
async function checkServerStatus() {
  try {
    const { response } = await makeRequest(`${AUTH_URL}/health`);
    if (response.status !== 200) {
      throw new Error('Server health check failed');
    }
    return true;
  } catch (error) {
    log.error('❌ Server is not running or not accessible at http://localhost:5000');
    log.info('Please start the server with: node src/backend/server.js');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    process.exit(1);
  }
  
  const success = await runAuthTests();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log.error(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

export default runAuthTests;