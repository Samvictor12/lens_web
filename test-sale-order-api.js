import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api/sale-orders';

// Test data
const testSaleOrder = {
  customerId: 1,
  customerRefNo: 'TEST-SO-001',
  type: 'Standard',
  lensPrice: 5000,
  discount: 10,
  rightEye: true,
  leftEye: true,
  rightSpherical: '-2.00',
  rightCylindrical: '-0.50',
  rightAxis: '90',
  leftSpherical: '-2.25',
  leftCylindrical: '-0.75',
  leftAxis: '85',
  createdBy: 1
};

async function testCreateSaleOrder() {
  console.log('\n📝 Testing: Create Sale Order (POST /api/sale-orders)');
  console.log('Request Body:', JSON.stringify(testSaleOrder, null, 2));
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSaleOrder),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      return data.data.id;
    }
    return null;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testListSaleOrders() {
  console.log('\n📋 Testing: List Sale Orders (GET /api/sale-orders)');
  
  try {
    const response = await fetch(`${BASE_URL}?page=1&limit=5`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testGetSaleOrderById(id) {
  if (!id) {
    console.log('\n⚠️  Skipping: Get Sale Order by ID (no ID available)');
    return;
  }
  
  console.log(`\n🔍 Testing: Get Sale Order by ID (GET /api/sale-orders/${id})`);
  
  try {
    const response = await fetch(`${BASE_URL}/${id}`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testUpdateSaleOrder(id) {
  if (!id) {
    console.log('\n⚠️  Skipping: Update Sale Order (no ID available)');
    return;
  }
  
  console.log(`\n✏️  Testing: Update Sale Order (PUT /api/sale-orders/${id})`);
  
  const updateData = {
    lensPrice: 5500,
    discount: 15,
    remark: 'Updated order with better discount',
    updatedBy: 1
  };
  
  console.log('Update Data:', JSON.stringify(updateData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testUpdateStatus(id) {
  if (!id) {
    console.log('\n⚠️  Skipping: Update Status (no ID available)');
    return;
  }
  
  console.log(`\n🔄 Testing: Update Status (PATCH /api/sale-orders/${id}/status)`);
  
  const statusData = {
    status: 'CONFIRMED'
  };
  
  console.log('Status Data:', JSON.stringify(statusData, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(statusData),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testGetStats() {
  console.log('\n📊 Testing: Get Statistics (GET /api/sale-orders/stats)');
  
  try {
    const response = await fetch(`${BASE_URL}/stats`);
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting Sale Order API Tests...\n');
  console.log('='.repeat(60));
  
  // Test 1: Create Sale Order
  const createdId = await testCreateSaleOrder();
  
  // Test 2: List Sale Orders
  await testListSaleOrders();
  
  // Test 3: Get Sale Order by ID
  await testGetSaleOrderById(createdId);
  
  // Test 4: Update Sale Order
  await testUpdateSaleOrder(createdId);
  
  // Test 5: Update Status
  await testUpdateStatus(createdId);
  
  // Test 6: Get Statistics
  await testGetStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
}

runAllTests();
