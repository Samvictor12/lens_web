/**
 * Simple test to check if lens-tintings API is working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function test() {
  console.log('🧪 Step 1: Login...');
  
  // Step 1: Login
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'demo123'
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login response:', JSON.stringify(loginData, null, 2));
  
  if (!loginData.success) {
    console.log('❌ Login failed');
    return;
  }
  
  const token = loginData.data.accessToken;
  console.log('✅ Token received:', token.substring(0, 20) + '...');
  
  // Step 2: Get all tintings
  console.log('\n🧪 Step 2: Get All Tintings...');
  const tintingsResponse = await fetch(`${BASE_URL}/v1/lens-tintings?page=1&limit=10`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const tintingsData = await tintingsResponse.json();
  console.log('Tintings response status:', tintingsData.success);
  
  if (!tintingsData.success) {
    console.log('❌ Get tintings failed');
    return;
  }
  
  const tintings = tintingsData.data; // data is an array directly
  console.log(`✅ Found ${tintings.length} tintings`);
  
  // Check if tinting_price field exists
  if (tintings.length > 0) {
    const firstTinting = tintings[0];
    console.log('\n📋 First tinting record:');
    console.log(JSON.stringify(firstTinting, null, 2));
    
    if ('tinting_price' in firstTinting) {
      console.log('✅ tinting_price field is present with value:', firstTinting.tinting_price);
    } else {
      console.log('❌ tinting_price field is MISSING');
    }
  }
  
  // Step 3: Test dropdown endpoint
  console.log('\n🧪 Step 3: Test Dropdown Endpoint...');
  const dropdownResponse = await fetch(`${BASE_URL}/v1/lens-tintings/dropdown`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const dropdownData = await dropdownResponse.json();
  console.log('Dropdown response:', JSON.stringify(dropdownData, null, 2));
  
  if (dropdownData.success && dropdownData.data.length > 0) {
    console.log(`✅ Dropdown returned ${dropdownData.data.length} items`);
    console.log('First dropdown item:', dropdownData.data[0]);
    
    if ('tinting_price' in dropdownData.data[0]) {
      console.log('✅ tinting_price field is present in dropdown');
    } else {
      console.log('❌ tinting_price field is MISSING in dropdown');
    }
  }
  
  // Step 4: Test dropdown with filters
  console.log('\n🧪 Step 4: Test Dropdown with Filter (name="Brown")...');
  const filterResponse = await fetch(`${BASE_URL}/v1/lens-tintings/dropdown?name=Brown`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const filterData = await filterResponse.json();
  console.log('Filtered dropdown response:', JSON.stringify(filterData, null, 2));
  
  if (filterData.success) {
    console.log(`✅ Filter returned ${filterData.data.length} items`);
  }
  
  // Step 5: Test statistics
  console.log('\n🧪 Step 5: Test Statistics Endpoint...');
  const statsResponse = await fetch(`${BASE_URL}/v1/lens-tintings/statistics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const statsData = await statsResponse.json();
  console.log('Statistics response:', JSON.stringify(statsData, null, 2));
  
  console.log('\n✅ All basic tests completed!');
}

test().catch(error => {
  console.error('❌ Test error:', error);
});
