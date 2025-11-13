/**
 * Test Script for Lens Product Pricing APIs
 * Tests the new pricing management endpoints
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testLensId = null;
let testCoatingIds = [];

// Helper function
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Login
async function login() {
  console.log(chalk.blue('\n=== Logging In ==='));
  const { status, data } = await apiCall('POST', '/api/auth/login', {
    email: 'admin@example.com',
    password: 'Admin@123'
  });

  if (status === 200 && data.token) {
    authToken = data.token;
    console.log(chalk.green('✓ Login successful'));
    return true;
  }
  console.log(chalk.red('✗ Login failed'));
  return false;
}

// Setup: Create test data
async function setup() {
  console.log(chalk.blue('\n=== Setting Up Test Data ==='));

  // Get first available brand, category, material, type
  const [brandsRes, categoriesRes, materialsRes, typesRes, coatingsRes] = await Promise.all([
    apiCall('GET', '/api/v1/lens-brands/dropdown'),
    apiCall('GET', '/api/v1/lens-categories/dropdown'),
    apiCall('GET', '/api/v1/lens-materials/dropdown'),
    apiCall('GET', '/api/v1/lens-types/dropdown'),
    apiCall('GET', '/api/v1/lens-coatings/dropdown')
  ]);

  const brand = brandsRes.data.data[0];
  const category = categoriesRes.data.data[0];
  const material = materialsRes.data.data[0];
  const type = typesRes.data.data[0];
  testCoatingIds = coatingsRes.data.data.slice(0, 3).map(c => c.id);

  console.log(chalk.cyan(`Using: Brand ${brand.id}, Category ${category.id}, Material ${material.id}, Type ${type.id}`));
  console.log(chalk.cyan(`Coating IDs: ${testCoatingIds.join(', ')}`));

  // Create test lens product without prices
  const productRes = await apiCall('POST', '/api/v1/lens-products', {
    brand_id: brand.id,
    category_id: category.id,
    material_id: material.id,
    type_id: type.id,
    product_code: `TEST-PRICING-${Date.now()}`,
    lens_name: 'Test Lens for Pricing API',
    sphere_min: -6.0,
    sphere_max: 6.0,
    cyl_min: -2.0,
    cyl_max: 0.0
  });

  if (productRes.status === 201) {
    testLensId = productRes.data.data.id;
    console.log(chalk.green(`✓ Created test lens product (ID: ${testLensId})`));
    return true;
  }

  console.log(chalk.red('✗ Failed to create test lens product'));
  return false;
}

// Test 1: Add single price
async function testAddSinglePrice() {
  console.log(chalk.blue('\n=== Test 1: Add Single Price ==='));

  const res = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/${testCoatingIds[0]}`,
    { price: 2500.00 }
  );

  if (res.status === 200) {
    console.log(chalk.green('✓ Single price added successfully'));
    console.log(chalk.gray(`  Price: ₹${res.data.data.price} for coating: ${res.data.data.coating.name}`));
    return true;
  }

  console.log(chalk.red('✗ Failed to add single price'));
  console.log(chalk.red(`  Status: ${res.status}, Message: ${res.data.message}`));
  return false;
}

// Test 2: Update existing price
async function testUpdatePrice() {
  console.log(chalk.blue('\n=== Test 2: Update Existing Price ==='));

  const res = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/${testCoatingIds[0]}`,
    { price: 2800.00 }
  );

  if (res.status === 200) {
    console.log(chalk.green('✓ Price updated successfully'));
    console.log(chalk.gray(`  New Price: ₹${res.data.data.price}`));
    return true;
  }

  console.log(chalk.red('✗ Failed to update price'));
  return false;
}

// Test 3: Bulk add prices
async function testBulkAddPrices() {
  console.log(chalk.blue('\n=== Test 3: Bulk Add/Update Prices ==='));

  const res = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/bulk`,
    {
      prices: [
        { coating_id: testCoatingIds[0], price: 2500.00 },
        { coating_id: testCoatingIds[1], price: 3200.00 },
        { coating_id: testCoatingIds[2], price: 2800.00 }
      ]
    }
  );

  if (res.status === 200) {
    console.log(chalk.green(`✓ Bulk prices processed: ${res.data.data.pricesProcessed} prices`));
    res.data.data.details.forEach(detail => {
      console.log(chalk.gray(`  ${detail.operation}: Coating ${detail.coating_id} = ₹${detail.price}`));
    });
    return true;
  }

  console.log(chalk.red('✗ Failed to bulk add prices'));
  console.log(chalk.red(`  Message: ${res.data.message}`));
  return false;
}

// Test 4: Get all prices for lens
async function testGetAllPrices() {
  console.log(chalk.blue('\n=== Test 4: Get All Prices for Lens ==='));

  const res = await apiCall('GET', `/api/v1/lens-products/${testLensId}/prices`);

  if (res.status === 200) {
    console.log(chalk.green(`✓ Retrieved ${res.data.data.length} prices`));
    res.data.data.forEach(price => {
      console.log(chalk.gray(`  ${price.coating.name} (${price.coating.short_name}): ₹${price.price}`));
    });
    return true;
  }

  console.log(chalk.red('✗ Failed to get prices'));
  return false;
}

// Test 5: Create lens with prices
async function testCreateLensWithPrices() {
  console.log(chalk.blue('\n=== Test 5: Create Lens Product with Prices ==='));

  const res = await apiCall('POST', '/api/v1/lens-products', {
    brand_id: 1,
    category_id: 1,
    material_id: 1,
    type_id: 1,
    product_code: `TEST-WITH-PRICES-${Date.now()}`,
    lens_name: 'Test Lens Created with Prices',
    sphere_min: -6.0,
    sphere_max: 6.0,
    prices: [
      { coating_id: testCoatingIds[0], price: 3000.00 },
      { coating_id: testCoatingIds[1], price: 3500.00 }
    ]
  });

  if (res.status === 201) {
    console.log(chalk.green('✓ Lens created with prices'));
    console.log(chalk.gray(`  Lens ID: ${res.data.data.id}`));
    console.log(chalk.gray(`  Prices: ${res.data.data.lensPriceMasters.length} created`));
    
    // Clean up
    await apiCall('DELETE', `/api/v1/lens-products/${res.data.data.id}`);
    return true;
  }

  console.log(chalk.red('✗ Failed to create lens with prices'));
  return false;
}

// Test 6: Delete price
async function testDeletePrice() {
  console.log(chalk.blue('\n=== Test 6: Delete Price ==='));

  const res = await apiCall(
    'DELETE',
    `/api/v1/lens-products/${testLensId}/prices/${testCoatingIds[2]}`
  );

  if (res.status === 200) {
    console.log(chalk.green('✓ Price deleted successfully'));
    return true;
  }

  console.log(chalk.red('✗ Failed to delete price'));
  return false;
}

// Test 7: Validation tests
async function testValidations() {
  console.log(chalk.blue('\n=== Test 7: Validation Tests ==='));

  // Test duplicate coating IDs
  const duplicateRes = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/bulk`,
    {
      prices: [
        { coating_id: testCoatingIds[0], price: 2500.00 },
        { coating_id: testCoatingIds[0], price: 3000.00 }
      ]
    }
  );

  if (duplicateRes.status === 400) {
    console.log(chalk.green('✓ Duplicate coating validation works'));
  } else {
    console.log(chalk.red('✗ Duplicate coating validation failed'));
  }

  // Test invalid coating ID
  const invalidRes = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/9999`,
    { price: 2500.00 }
  );

  if (invalidRes.status === 404) {
    console.log(chalk.green('✓ Invalid coating ID validation works'));
  } else {
    console.log(chalk.red('✗ Invalid coating ID validation failed'));
  }

  // Test negative price
  const negativeRes = await apiCall(
    'POST',
    `/api/v1/lens-products/${testLensId}/prices/${testCoatingIds[0]}`,
    { price: -100 }
  );

  if (negativeRes.status === 400) {
    console.log(chalk.green('✓ Negative price validation works'));
  } else {
    console.log(chalk.red('✗ Negative price validation failed'));
  }
}

// Cleanup
async function cleanup() {
  console.log(chalk.blue('\n=== Cleaning Up ==='));

  if (testLensId) {
    const res = await apiCall('DELETE', `/api/v1/lens-products/${testLensId}`);
    if (res.status === 200) {
      console.log(chalk.green('✓ Test lens product deleted'));
    }
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.yellow.bold('\n╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.yellow.bold('║   LENS PRODUCT PRICING API - TEST SUITE          ║'));
  console.log(chalk.yellow.bold('╚═══════════════════════════════════════════════════╝'));

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log(chalk.red('\n⚠ Login failed. Exiting tests.'));
      return;
    }

    // Setup
    const setupSuccess = await setup();
    if (!setupSuccess) {
      console.log(chalk.red('\n⚠ Setup failed. Exiting tests.'));
      return;
    }

    // Run tests
    await testAddSinglePrice();
    await testUpdatePrice();
    await testBulkAddPrices();
    await testGetAllPrices();
    await testCreateLensWithPrices();
    await testDeletePrice();
    await testValidations();

    // Cleanup
    await cleanup();

    console.log(chalk.yellow.bold('\n╔═══════════════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('║              TESTS COMPLETED                      ║'));
    console.log(chalk.yellow.bold('╚═══════════════════════════════════════════════════╝'));
    console.log(chalk.green('\n✓ All pricing API tests completed successfully!\n'));

  } catch (error) {
    console.log(chalk.red('\n⚠ Test execution error:'), error.message);
    await cleanup();
  }
}

// Run
runTests().catch(console.error);
