/**
 * Comprehensive test for all Lens Tinting Master endpoints
 * Tests: CREATE, READ, UPDATE, DELETE, DROPDOWN, STATISTICS
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';
let createdTintingId = null;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function login() {
  log.test('Logging in...');
  const result = await apiRequest('POST', '/auth/login', {
    username: 'admin',
    password: 'demo123'
  });

  if (result.status === 200 && result.data.success) {
    authToken = result.data.data.accessToken;
    log.success(`Logged in successfully as ${result.data.data.user.username}`);
    return true;
  } else {
    log.error(`Login failed: ${result.data.message || 'Unknown error'}`);
    return false;
  }
}

async function testCreateTinting() {
  log.test('\n📝 TEST 1: Create New Tinting');
  
  const newTinting = {
    name: 'Test Tinting ' + Date.now(),
    short_name: 'TST' + Math.floor(Math.random() * 1000),
    description: 'Automated test tinting',
    tinting_price: 299.99
  };

  const result = await apiRequest('POST', '/v1/lens-tintings', newTinting);

  if (result.status === 201 && result.data.success) {
    createdTintingId = result.data.data.id;
    log.success('Created tinting successfully');
    log.info(`   ID: ${result.data.data.id}`);
    log.info(`   Name: ${result.data.data.name}`);
    log.info(`   Short Name: ${result.data.data.short_name}`);
    log.info(`   Price: ₹${result.data.data.tinting_price}`);
    return true;
  } else {
    log.error(`Create failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testGetAllTintings() {
  log.test('\n📋 TEST 2: Get All Tintings (Paginated)');
  
  const result = await apiRequest('GET', '/v1/lens-tintings?page=1&limit=5');

  if (result.status === 200 && result.data.success) {
    log.success(`Retrieved ${result.data.data.length} tintings`);
    log.info(`   Total: ${result.data.pagination.total}`);
    log.info(`   Pages: ${result.data.pagination.pages}`);
    
    if (result.data.data.length > 0) {
      const firstItem = result.data.data[0];
      log.info(`   Sample: ${firstItem.name} - ₹${firstItem.tinting_price || 0}`);
      
      // Check if tinting_price field exists
      if (firstItem.hasOwnProperty('tinting_price')) {
        log.success('   tinting_price field is present ✓');
      } else {
        log.warning('   tinting_price field is MISSING!');
      }
    }
    return true;
  } else {
    log.error(`Get all failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testGetTintingById() {
  log.test('\n🔍 TEST 3: Get Tinting By ID');
  
  if (!createdTintingId) {
    log.warning('No tinting ID available, skipping test');
    return false;
  }

  const result = await apiRequest('GET', `/v1/lens-tintings/${createdTintingId}`);

  if (result.status === 200 && result.data.success) {
    log.success('Retrieved tinting by ID');
    log.info(`   Name: ${result.data.data.name}`);
    log.info(`   Short Name: ${result.data.data.short_name}`);
    log.info(`   Price: ₹${result.data.data.tinting_price || 'N/A'}`);
    log.info(`   Description: ${result.data.data.description || 'None'}`);
    log.info(`   Sale Orders Count: ${result.data.data._count?.saleOrders || 0}`);
    
    // Verify all fields
    const requiredFields = ['id', 'name', 'short_name', 'tinting_price', 'activeStatus', 'deleteStatus'];
    const missingFields = requiredFields.filter(field => !result.data.data.hasOwnProperty(field));
    
    if (missingFields.length === 0) {
      log.success('   All required fields present ✓');
    } else {
      log.error(`   Missing fields: ${missingFields.join(', ')}`);
    }
    
    return true;
  } else {
    log.error(`Get by ID failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testUpdateTinting() {
  log.test('\n✏️  TEST 4: Update Tinting');
  
  if (!createdTintingId) {
    log.warning('No tinting ID available, skipping test');
    return false;
  }

  const updateData = {
    description: 'Updated description ' + Date.now(),
    tinting_price: 399.99,
    activeStatus: true
  };

  const result = await apiRequest('PUT', `/v1/lens-tintings/${createdTintingId}`, updateData);

  if (result.status === 200 && result.data.success) {
    log.success('Updated tinting successfully');
    log.info(`   New Description: ${result.data.data.description}`);
    log.info(`   New Price: ₹${result.data.data.tinting_price}`);
    log.info(`   Active Status: ${result.data.data.activeStatus}`);
    return true;
  } else {
    log.error(`Update failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testDropdownEndpoint() {
  log.test('\n📦 TEST 5: Dropdown Endpoint (No Filter)');
  
  const result = await apiRequest('GET', '/v1/lens-tintings/dropdown');

  if (result.status === 200 && result.data.success) {
    log.success(`Retrieved ${result.data.data.length} dropdown items`);
    
    if (result.data.data.length > 0) {
      const item = result.data.data[0];
      log.info(`   Sample: ${item.label} (${item.short_name})`);
      
      // Check dropdown format
      const requiredProps = ['id', 'label', 'value', 'short_name', 'tinting_price'];
      const missingProps = requiredProps.filter(prop => !item.hasOwnProperty(prop));
      
      if (missingProps.length === 0) {
        log.success('   Dropdown format correct ✓');
        log.info(`   Price included: ₹${item.tinting_price || 0}`);
      } else {
        log.error(`   Missing properties: ${missingProps.join(', ')}`);
      }
    }
    return true;
  } else {
    log.error(`Dropdown failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testDropdownWithFilters() {
  log.test('\n🔎 TEST 6: Dropdown with Filters');
  
  // Test filter by name
  const result1 = await apiRequest('GET', '/v1/lens-tintings/dropdown?name=Brown');
  if (result1.status === 200 && result1.data.success) {
    log.success(`Name filter "Brown": ${result1.data.data.length} results`);
    result1.data.data.slice(0, 2).forEach(item => {
      log.info(`   - ${item.label} (₹${item.tinting_price})`);
    });
  }

  // Test filter by short_name
  const result2 = await apiRequest('GET', '/v1/lens-tintings/dropdown?short_name=PL');
  if (result2.status === 200 && result2.data.success) {
    log.success(`Short name filter "PL": ${result2.data.data.length} results`);
    result2.data.data.forEach(item => {
      log.info(`   - ${item.label} (${item.short_name})`);
    });
  }

  return true;
}

async function testStatisticsEndpoint() {
  log.test('\n📊 TEST 7: Statistics Endpoint');
  
  const result = await apiRequest('GET', '/v1/lens-tintings/statistics');

  if (result.status === 200 && result.data.success) {
    log.success('Statistics retrieved');
    log.info(`   Total: ${result.data.data.total}`);
    log.info(`   Active: ${result.data.data.active}`);
    log.info(`   Inactive: ${result.data.data.inactive}`);
    return true;
  } else {
    log.error(`Statistics failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testSearchFunctionality() {
  log.test('\n🔍 TEST 8: Search Functionality');
  
  const result = await apiRequest('GET', '/v1/lens-tintings?search=photo&page=1&limit=10');

  if (result.status === 200 && result.data.success) {
    log.success(`Search "photo" found: ${result.data.data.length} results`);
    result.data.data.forEach(item => {
      log.info(`   - ${item.name} (${item.short_name}) - ₹${item.tinting_price || 0}`);
    });
    return true;
  } else {
    log.error(`Search failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function testDeleteTinting() {
  log.test('\n🗑️  TEST 9: Delete Tinting (Soft Delete)');
  
  if (!createdTintingId) {
    log.warning('No tinting ID available, skipping test');
    return false;
  }

  const result = await apiRequest('DELETE', `/v1/lens-tintings/${createdTintingId}`);

  if (result.status === 200 && result.data.success) {
    log.success('Tinting deleted (soft delete)');
    
    // Verify it's deleted by trying to get it
    const verifyResult = await apiRequest('GET', `/v1/lens-tintings/${createdTintingId}`);
    if (verifyResult.status === 404) {
      log.success('   Verified: Tinting no longer accessible ✓');
    }
    return true;
  } else {
    log.error(`Delete failed: ${JSON.stringify(result.data)}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪  LENS TINTING MASTER API - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(60));

  try {
    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
      log.error('Cannot proceed without authentication');
      process.exit(1);
    }

    // Run all tests
    const tests = [
      testCreateTinting,
      testGetAllTintings,
      testGetTintingById,
      testUpdateTinting,
      testDropdownEndpoint,
      testDropdownWithFilters,
      testStatisticsEndpoint,
      testSearchFunctionality,
      testDeleteTinting
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test();
        if (result) passed++;
        else failed++;
      } catch (error) {
        log.error(`Test error: ${error.message}`);
        failed++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    log.success(`Passed: ${passed}`);
    if (failed > 0) log.error(`Failed: ${failed}`);
    log.info(`Total: ${passed + failed}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
