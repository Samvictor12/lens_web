/**
 * Test script for Lens Tinting Master API endpoints
 * Run this after starting the backend server
 */

const API_BASE = 'http://localhost:5001/api';

// You'll need to replace this with a valid JWT token from login
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

async function testLensTintingAPI() {
  console.log('🧪 Testing Lens Tinting Master API Endpoints\n');
  console.log('⚠️  Make sure backend server is running on port 5001');
  console.log('⚠️  Update AUTH_TOKEN in this file with a valid JWT token\n');

  try {
    // Test 1: Get all tintings
    console.log('1️⃣  GET /v1/lens-tintings - Get all tintings');
    const response1 = await fetch(`${API_BASE}/v1/lens-tintings?page=1&limit=10`, {
      headers
    });
    const data1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Records found: ${data1.data?.length || 0}`);
    console.log(`   Total: ${data1.pagination?.total || 0}\n`);

    // Test 2: Get dropdown
    console.log('2️⃣  GET /v1/lens-tintings/dropdown - Get dropdown data');
    const response2 = await fetch(`${API_BASE}/v1/lens-tintings/dropdown`, {
      headers
    });
    const data2 = await response2.json();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Dropdown items: ${data2.data?.length || 0}\n`);

    // Test 3: Get statistics
    console.log('3️⃣  GET /v1/lens-tintings/statistics - Get statistics');
    const response3 = await fetch(`${API_BASE}/v1/lens-tintings/statistics`, {
      headers
    });
    const data3 = await response3.json();
    console.log(`   Status: ${response3.status}`);
    console.log(`   Stats:`, data3.data || {});
    console.log();

    // Test 4: Create new tinting (commented out to avoid creating test data)
    /*
    console.log('4️⃣  POST /v1/lens-tintings - Create new tinting');
    const response4 = await fetch(`${API_BASE}/v1/lens-tintings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Tinting',
        short_name: 'TST',
        description: 'Test tinting created by API test',
        activeStatus: true
      })
    });
    const data4 = await response4.json();
    console.log(`   Status: ${response4.status}`);
    console.log(`   Created ID: ${data4.data?.id}\n`);
    */

    console.log('✅ API Tests Complete!\n');
    console.log('💡 Uncomment Test 4 in the script to test POST endpoint');
    console.log('💡 Use Postman or similar tool for UPDATE and DELETE tests');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('fetch')) {
      console.log('\n⚠️  Make sure:');
      console.log('   1. Backend server is running (npm run dev)');
      console.log('   2. Server is listening on port 5001');
      console.log('   3. AUTH_TOKEN is set with a valid JWT token');
    }
  }
}

// Check if AUTH_TOKEN is set
if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('⚠️  Please update AUTH_TOKEN in this file before running tests\n');
  console.log('To get a token:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Login via POST /api/auth/login');
  console.log('3. Copy the access token from response');
  console.log('4. Update AUTH_TOKEN in this script\n');
} else {
  testLensTintingAPI();
}
