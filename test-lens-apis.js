/**
 * Manual Test Script for Lens Master APIs
 * Run this with: node test-lens-apis.js
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Test data storage
const testData = {
  categoryId: null,
  materialId: null,
  coatingId: null,
  brandId: null,
  typeId: null,
  productId: null,
  priceId: null
};

// Helper function to make API calls
async function apiCall(method, endpoint, body = null, skipAuth = false) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(skipAuth ? {} : { 'Authorization': `Bearer ${authToken}` })
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Test result logger
function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(chalk.green('✓'), testName);
  } else {
    testResults.failed++;
    console.log(chalk.red('✗'), testName, details ? `- ${details}` : '');
  }
}

// Test suite functions
async function testLogin() {
  console.log(chalk.blue('\n=== Testing Authentication ==='));
  
  try {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      email: 'admin@example.com',
      password: 'Admin@123'
    }, true);

    if (status === 200 && data.token) {
      authToken = data.token;
      logTest('Login successful', true);
      return true;
    } else {
      logTest('Login failed', false, `Status: ${status}`);
      return false;
    }
  } catch (error) {
    logTest('Login failed', false, error.message);
    return false;
  }
}

async function testLensCategories() {
  console.log(chalk.blue('\n=== Testing Lens Categories API ==='));

  try {
    // Create Category
    const createRes = await apiCall('POST', '/api/v1/lens-categories', {
      name: 'Test Single Vision',
      description: 'Test category for single vision lenses'
    });
    
    logTest('Create Category', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.categoryId = createRes.data.data.id;
    }

    // Get All Categories
    const getAllRes = await apiCall('GET', '/api/v1/lens-categories?page=1&limit=10');
    logTest('Get All Categories', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-categories/dropdown');
    logTest('Get Categories Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

    // Get Statistics
    const statsRes = await apiCall('GET', '/api/v1/lens-categories/statistics');
    logTest('Get Categories Statistics', statsRes.status === 200, `Status: ${statsRes.status}`);

    // Get By ID
    if (testData.categoryId) {
      const getByIdRes = await apiCall('GET', `/api/v1/lens-categories/${testData.categoryId}`);
      logTest('Get Category By ID', getByIdRes.status === 200, `Status: ${getByIdRes.status}`);

      // Update Category
      const updateRes = await apiCall('PUT', `/api/v1/lens-categories/${testData.categoryId}`, {
        name: 'Test Single Vision Updated',
        description: 'Updated description'
      });
      logTest('Update Category', updateRes.status === 200, `Status: ${updateRes.status}`);
    }

  } catch (error) {
    logTest('Category API Error', false, error.message);
  }
}

async function testLensMaterials() {
  console.log(chalk.blue('\n=== Testing Lens Materials API ==='));

  try {
    // Create Material
    const createRes = await apiCall('POST', '/api/v1/lens-materials', {
      name: 'Test CR39',
      description: 'Test material for CR39 plastic'
    });
    
    logTest('Create Material', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.materialId = createRes.data.data.id;
    }

    // Get All Materials
    const getAllRes = await apiCall('GET', '/api/v1/lens-materials');
    logTest('Get All Materials', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-materials/dropdown');
    logTest('Get Materials Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

    // Get Statistics
    const statsRes = await apiCall('GET', '/api/v1/lens-materials/statistics');
    logTest('Get Materials Statistics', statsRes.status === 200, `Status: ${statsRes.status}`);

  } catch (error) {
    logTest('Material API Error', false, error.message);
  }
}

async function testLensCoatings() {
  console.log(chalk.blue('\n=== Testing Lens Coatings API ==='));

  try {
    // Create Coating
    const createRes = await apiCall('POST', '/api/v1/lens-coatings', {
      name: 'Test Anti-Reflective',
      short_name: 'TAR',
      description: 'Test coating for anti-reflective'
    });
    
    logTest('Create Coating', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.coatingId = createRes.data.data.id;
    }

    // Get All Coatings
    const getAllRes = await apiCall('GET', '/api/v1/lens-coatings');
    logTest('Get All Coatings', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-coatings/dropdown');
    logTest('Get Coatings Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

  } catch (error) {
    logTest('Coating API Error', false, error.message);
  }
}

async function testLensBrands() {
  console.log(chalk.blue('\n=== Testing Lens Brands API ==='));

  try {
    // Create Brand
    const createRes = await apiCall('POST', '/api/v1/lens-brands', {
      name: 'Test Essilor',
      description: 'Test brand for Essilor'
    });
    
    logTest('Create Brand', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.brandId = createRes.data.data.id;
    }

    // Get All Brands
    const getAllRes = await apiCall('GET', '/api/v1/lens-brands');
    logTest('Get All Brands', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-brands/dropdown');
    logTest('Get Brands Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

  } catch (error) {
    logTest('Brand API Error', false, error.message);
  }
}

async function testLensTypes() {
  console.log(chalk.blue('\n=== Testing Lens Types API ==='));

  try {
    // Create Type
    const createRes = await apiCall('POST', '/api/v1/lens-types', {
      name: 'Test Progressive',
      description: 'Test type for progressive lenses'
    });
    
    logTest('Create Type', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.typeId = createRes.data.data.id;
    }

    // Get All Types
    const getAllRes = await apiCall('GET', '/api/v1/lens-types');
    logTest('Get All Types', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-types/dropdown');
    logTest('Get Types Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

  } catch (error) {
    logTest('Type API Error', false, error.message);
  }
}

async function testLensProducts() {
  console.log(chalk.blue('\n=== Testing Lens Products API ==='));

  try {
    // Wait for all master data to be created
    if (!testData.brandId || !testData.categoryId || !testData.materialId || !testData.typeId) {
      logTest('Product Test Skipped', false, 'Required master data not created');
      return;
    }

    // Create Product
    const createRes = await apiCall('POST', '/api/v1/lens-products', {
      brand_id: testData.brandId,
      category_id: testData.categoryId,
      material_id: testData.materialId,
      type_id: testData.typeId,
      product_code: 'TEST-SV-001',
      lens_name: 'Test Single Vision Lens',
      sphere_from: -6.0,
      sphere_to: 6.0,
      cylinder_from: -2.0,
      cylinder_to: 0.0,
      range_text: 'Standard test range'
    });
    
    logTest('Create Product', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.productId = createRes.data.data.id;
    }

    // Get All Products
    const getAllRes = await apiCall('GET', '/api/v1/lens-products');
    logTest('Get All Products', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-products/dropdown');
    logTest('Get Products Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

    // Filter by Brand
    const filterRes = await apiCall('GET', `/api/v1/lens-products?brand_id=${testData.brandId}`);
    logTest('Filter Products by Brand', filterRes.status === 200, `Status: ${filterRes.status}`);

    // Get Statistics
    const statsRes = await apiCall('GET', '/api/v1/lens-products/statistics');
    logTest('Get Products Statistics', statsRes.status === 200, `Status: ${statsRes.status}`);

  } catch (error) {
    logTest('Product API Error', false, error.message);
  }
}

async function testLensPrices() {
  console.log(chalk.blue('\n=== Testing Lens Prices API ==='));

  try {
    // Wait for product and coating to be created
    if (!testData.productId || !testData.coatingId) {
      logTest('Price Test Skipped', false, 'Required product/coating data not created');
      return;
    }

    // Create Price
    const createRes = await apiCall('POST', '/api/v1/lens-prices', {
      lens_id: testData.productId,
      coating_id: testData.coatingId,
      price: 2999.99
    });
    
    logTest('Create Price', createRes.status === 201, `Status: ${createRes.status}`);
    if (createRes.data.data) {
      testData.priceId = createRes.data.data.id;
    }

    // Get All Prices
    const getAllRes = await apiCall('GET', '/api/v1/lens-prices');
    logTest('Get All Prices', getAllRes.status === 200, `Status: ${getAllRes.status}`);

    // Get Dropdown
    const dropdownRes = await apiCall('GET', '/api/v1/lens-prices/dropdown');
    logTest('Get Prices Dropdown', dropdownRes.status === 200, `Status: ${dropdownRes.status}`);

    // Get by Lens and Coating
    const byComboRes = await apiCall('GET', 
      `/api/v1/lens-prices/by-lens-coating?lens_id=${testData.productId}&coating_id=${testData.coatingId}`
    );
    logTest('Get Price by Lens-Coating', byComboRes.status === 200, `Status: ${byComboRes.status}`);

    // Get by Lens
    const byLensRes = await apiCall('GET', `/api/v1/lens-prices/by-lens/${testData.productId}`);
    logTest('Get Prices by Lens', byLensRes.status === 200, `Status: ${byLensRes.status}`);

    // Get Statistics
    const statsRes = await apiCall('GET', '/api/v1/lens-prices/statistics');
    logTest('Get Prices Statistics', statsRes.status === 200, `Status: ${statsRes.status}`);

  } catch (error) {
    logTest('Price API Error', false, error.message);
  }
}

async function testValidations() {
  console.log(chalk.blue('\n=== Testing Validations ==='));

  try {
    // Test missing required field
    const missingFieldRes = await apiCall('POST', '/api/v1/lens-categories', {
      description: 'No name provided'
    });
    logTest('Validation: Missing required field', missingFieldRes.status === 400, 
      `Expected 400, got ${missingFieldRes.status}`);

    // Test invalid coating (missing short_name)
    const missingShortNameRes = await apiCall('POST', '/api/v1/lens-coatings', {
      name: 'Test Coating'
    });
    logTest('Validation: Missing short_name in coating', missingShortNameRes.status === 400,
      `Expected 400, got ${missingShortNameRes.status}`);

    // Test negative price
    if (testData.productId && testData.coatingId) {
      const negPriceRes = await apiCall('POST', '/api/v1/lens-prices', {
        lens_id: testData.productId,
        coating_id: testData.coatingId,
        price: -100
      });
      logTest('Validation: Negative price', negPriceRes.status === 400,
        `Expected 400, got ${negPriceRes.status}`);
    }

  } catch (error) {
    logTest('Validation Test Error', false, error.message);
  }
}

async function cleanupTestData() {
  console.log(chalk.blue('\n=== Cleaning Up Test Data ==='));

  try {
    // Delete in reverse order of dependencies
    if (testData.priceId) {
      const res = await apiCall('DELETE', `/api/v1/lens-prices/${testData.priceId}`);
      logTest('Cleanup: Delete Price', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.productId) {
      const res = await apiCall('DELETE', `/api/v1/lens-products/${testData.productId}`);
      logTest('Cleanup: Delete Product', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.typeId) {
      const res = await apiCall('DELETE', `/api/v1/lens-types/${testData.typeId}`);
      logTest('Cleanup: Delete Type', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.brandId) {
      const res = await apiCall('DELETE', `/api/v1/lens-brands/${testData.brandId}`);
      logTest('Cleanup: Delete Brand', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.coatingId) {
      const res = await apiCall('DELETE', `/api/v1/lens-coatings/${testData.coatingId}`);
      logTest('Cleanup: Delete Coating', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.materialId) {
      const res = await apiCall('DELETE', `/api/v1/lens-materials/${testData.materialId}`);
      logTest('Cleanup: Delete Material', res.status === 200, `Status: ${res.status}`);
    }

    if (testData.categoryId) {
      const res = await apiCall('DELETE', `/api/v1/lens-categories/${testData.categoryId}`);
      logTest('Cleanup: Delete Category', res.status === 200, `Status: ${res.status}`);
    }

  } catch (error) {
    logTest('Cleanup Error', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.yellow.bold('\n╔═══════════════════════════════════════════════╗'));
  console.log(chalk.yellow.bold('║   LENS MASTER APIs - COMPREHENSIVE TEST      ║'));
  console.log(chalk.yellow.bold('╚═══════════════════════════════════════════════╝'));

  try {
    // Step 1: Login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log(chalk.red('\n⚠ Login failed. Cannot proceed with tests.'));
      console.log(chalk.yellow('Please ensure:'));
      console.log(chalk.yellow('1. Server is running: npm run dev:server'));
      console.log(chalk.yellow('2. Database is migrated: npm run db:migrate'));
      console.log(chalk.yellow('3. Admin user exists in database'));
      return;
    }

    // Step 2: Test all master APIs
    await testLensCategories();
    await testLensMaterials();
    await testLensCoatings();
    await testLensBrands();
    await testLensTypes();
    
    // Step 3: Test complex APIs (Product & Price)
    await testLensProducts();
    await testLensPrices();

    // Step 4: Test validations
    await testValidations();

    // Step 5: Cleanup
    await cleanupTestData();

  } catch (error) {
    console.log(chalk.red('\n⚠ Test execution error:'), error.message);
  } finally {
    // Display summary
    console.log(chalk.yellow.bold('\n╔═══════════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('║              TEST SUMMARY                     ║'));
    console.log(chalk.yellow.bold('╚═══════════════════════════════════════════════╝'));
    console.log(chalk.cyan(`Total Tests: ${testResults.total}`));
    console.log(chalk.green(`Passed: ${testResults.passed}`));
    console.log(chalk.red(`Failed: ${testResults.failed}`));
    
    const percentage = testResults.total > 0 
      ? ((testResults.passed / testResults.total) * 100).toFixed(2)
      : 0;
    console.log(chalk.yellow(`Success Rate: ${percentage}%`));

    if (testResults.failed === 0) {
      console.log(chalk.green.bold('\n✓ ALL TESTS PASSED! 🎉\n'));
    } else {
      console.log(chalk.red.bold('\n✗ Some tests failed. Please review the output above.\n'));
    }
  }
}

// Run the tests
runAllTests().catch(console.error);
