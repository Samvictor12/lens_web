/**
 * Discount Management API Test Script
 * 
 * This script tests the discount management endpoints:
 * 1. GET /api/v1/lens-products/discount-hierarchy
 * 2. POST /api/v1/lens-products/apply-discounts
 * 
 * Usage:
 * 1. Update the AUTH_TOKEN with a valid JWT token
 * 2. Run: node test-discount-api.js
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Test configuration
const config = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

// Test 1: Get Discount Hierarchy
async function testGetDiscountHierarchy() {
  log.section('TEST 1: Get Discount Hierarchy');
  
  try {
    log.info('Fetching discount hierarchy...');
    
    const response = await fetch(`${API_BASE_URL}/lens-products/discount-hierarchy`, {
      method: 'GET',
      headers: config.headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      log.error(`HTTP ${response.status}: ${data.message}`);
      return false;
    }
    
    log.success('Successfully fetched discount hierarchy');
    log.info(`Response structure: ${JSON.stringify(Object.keys(data))}`);
    
    if (data.success && Array.isArray(data.data)) {
      const brands = data.data;
      log.success(`Found ${brands.length} brand(s)`);
      
      if (brands.length > 0) {
        const firstBrand = brands[0];
        log.info(`Sample brand: ${firstBrand.name} (ID: ${firstBrand.id})`);
        
        if (firstBrand.products && firstBrand.products.length > 0) {
          const firstProduct = firstBrand.products[0];
          log.info(`  └─ Sample product: ${firstProduct.lens_name} (ID: ${firstProduct.id})`);
          
          if (firstProduct.prices && firstProduct.prices.length > 0) {
            const firstPrice = firstProduct.prices[0];
            log.info(`     └─ Sample coating: ${firstPrice.coating.name} - ₹${firstPrice.price}`);
          } else {
            log.warn('     No prices found for this product');
          }
        } else {
          log.warn('  No products found for this brand');
        }
      }
      
      return true;
    } else {
      log.error('Invalid response structure');
      return false;
    }
  } catch (error) {
    log.error(`Request failed: ${error.message}`);
    return false;
  }
}

// Test 2: Apply Discounts (Dry Run)
async function testApplyDiscounts() {
  log.section('TEST 2: Apply Discounts');
  
  // First, get hierarchy to get valid IDs
  log.info('Fetching hierarchy to get valid IDs...');
  
  try {
    const hierarchyResponse = await fetch(`${API_BASE_URL}/lens-products/discount-hierarchy`, {
      method: 'GET',
      headers: config.headers
    });
    
    const hierarchyData = await hierarchyResponse.json();
    
    if (!hierarchyData.success || !Array.isArray(hierarchyData.data) || hierarchyData.data.length === 0) {
      log.error('No brands available for testing');
      return false;
    }
    
    const firstBrand = hierarchyData.data[0];
    
    if (!firstBrand.products || firstBrand.products.length === 0) {
      log.error('No products available for testing');
      return false;
    }
    
    const firstProduct = firstBrand.products[0];
    
    if (!firstProduct.prices || firstProduct.prices.length === 0) {
      log.error('No prices available for testing');
      return false;
    }
    
    const firstPrice = firstProduct.prices[0];
    
    log.info(`Test data selected:`);
    log.info(`  Brand: ${firstBrand.name} (ID: ${firstBrand.id})`);
    log.info(`  Product: ${firstProduct.lens_name} (ID: ${firstProduct.id})`);
    log.info(`  Coating: ${firstPrice.coating.name} (ID: ${firstPrice.coating.id})`);
    log.info(`  Current Price: ₹${firstPrice.price} (Price ID: ${firstPrice.id})`);
    
    log.warn('\nNOTE: This test will ACTUALLY MODIFY PRICES in the database!');
    log.warn('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test applying a small discount at coating level
    const testDiscount = {
      discounts: [
        {
          type: 'coating',
          brandId: firstBrand.id,
          productId: firstProduct.id,
          coatingId: firstPrice.coating.id,
          priceId: firstPrice.id,
          discount: 1 // 1% test discount
        }
      ]
    };
    
    log.info('Applying 1% test discount at coating level...');
    
    const response = await fetch(`${API_BASE_URL}/lens-products/apply-discounts`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(testDiscount)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      log.error(`HTTP ${response.status}: ${data.message}`);
      if (data.errors) {
        data.errors.forEach(err => log.error(`  - ${err.field}: ${err.message}`));
      }
      return false;
    }
    
    log.success('Successfully applied discount!');
    log.info(`Affected records: ${data.data.affected}`);
    log.info(`Original price: ₹${firstPrice.price}`);
    log.info(`Expected new price: ₹${(firstPrice.price * 0.99).toFixed(2)}`);
    
    // Verify the change
    log.info('\nVerifying the change...');
    const verifyResponse = await fetch(`${API_BASE_URL}/lens-products/discount-hierarchy`, {
      method: 'GET',
      headers: config.headers
    });
    
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const updatedBrand = verifyData.data.find(b => b.id === firstBrand.id);
      if (updatedBrand) {
        const updatedProduct = updatedBrand.products.find(p => p.id === firstProduct.id);
        if (updatedProduct) {
          const updatedPrice = updatedProduct.prices.find(p => p.id === firstPrice.id);
          if (updatedPrice) {
            log.info(`Actual new price: ₹${updatedPrice.price}`);
            
            const expectedPrice = parseFloat((firstPrice.price * 0.99).toFixed(2));
            const actualPrice = parseFloat(updatedPrice.price);
            
            if (Math.abs(expectedPrice - actualPrice) < 0.01) {
              log.success('Price calculation verified correctly!');
              return true;
            } else {
              log.error('Price calculation mismatch!');
              return false;
            }
          }
        }
      }
    }
    
    log.warn('Could not verify the change');
    return false;
    
  } catch (error) {
    log.error(`Request failed: ${error.message}`);
    return false;
  }
}

// Test 3: Validation Tests
async function testValidation() {
  log.section('TEST 3: Validation Tests');
  
  const validationTests = [
    {
      name: 'Empty discounts array',
      payload: { discounts: [] },
      expectedError: true
    },
    {
      name: 'Invalid discount type',
      payload: { 
        discounts: [{ type: 'invalid', discount: 10 }]
      },
      expectedError: true
    },
    {
      name: 'Discount below 0',
      payload: { 
        discounts: [{ type: 'brand', brandId: 1, discount: -5 }]
      },
      expectedError: true
    },
    {
      name: 'Discount above 100',
      payload: { 
        discounts: [{ type: 'brand', brandId: 1, discount: 150 }]
      },
      expectedError: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of validationTests) {
    try {
      log.info(`Testing: ${test.name}...`);
      
      const response = await fetch(`${API_BASE_URL}/lens-products/apply-discounts`, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(test.payload)
      });
      
      const data = await response.json();
      
      if (test.expectedError && !response.ok) {
        log.success(`  ✓ Correctly rejected: ${data.message}`);
        passed++;
      } else if (!test.expectedError && response.ok) {
        log.success(`  ✓ Correctly accepted`);
        passed++;
      } else {
        log.error(`  ✗ Unexpected result`);
        failed++;
      }
    } catch (error) {
      log.error(`  ✗ Test failed: ${error.message}`);
      failed++;
    }
  }
  
  log.info(`\nValidation tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  DISCOUNT MANAGEMENT API TEST SUITE');
  console.log('='.repeat(60));
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    log.error('\n❌ Please update AUTH_TOKEN in the script before running tests');
    log.info('Get your token by:');
    log.info('1. Login to the application');
    log.info('2. Open browser dev tools (F12)');
    log.info('3. Go to Application > Local Storage');
    log.info('4. Copy the "token" value');
    return;
  }
  
  const results = {
    hierarchy: false,
    applyDiscount: false,
    validation: false
  };
  
  // Run tests
  results.hierarchy = await testGetDiscountHierarchy();
  
  if (results.hierarchy) {
    results.applyDiscount = await testApplyDiscounts();
    results.validation = await testValidation();
  } else {
    log.warn('Skipping remaining tests due to hierarchy test failure');
  }
  
  // Summary
  log.section('TEST SUMMARY');
  
  log.info('Results:');
  log[results.hierarchy ? 'success' : 'error'](`  ${results.hierarchy ? '✓' : '✗'} Get Discount Hierarchy`);
  log[results.applyDiscount ? 'success' : 'error'](`  ${results.applyDiscount ? '✓' : '✗'} Apply Discounts`);
  log[results.validation ? 'success' : 'error'](`  ${results.validation ? '✓' : '✗'} Validation Tests`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  console.log('\n' + '='.repeat(60));
  if (passedTests === totalTests) {
    log.success(`ALL TESTS PASSED (${passedTests}/${totalTests})`);
  } else {
    log.error(`SOME TESTS FAILED (${passedTests}/${totalTests} passed)`);
  }
  console.log('='.repeat(60) + '\n');
}

// Run the tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
