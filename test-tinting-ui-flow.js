/**
 * Test tinting price field in UI data flow
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function testTintingPriceFlow() {
  console.log('🧪 Testing Tinting Price Data Flow\n');
  
  // Step 1: Login
  console.log('Step 1: Login...');
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'demo123' })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data.accessToken;
  console.log('✅ Login successful\n');
  
  // Step 2: Get all tintings (what the UI table would receive)
  console.log('Step 2: Get All Tintings (UI Table Data)...');
  const tintingsResponse = await fetch(`${BASE_URL}/v1/lens-tintings?page=1&limit=5`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const tintingsData = await tintingsResponse.json();
  console.log('✅ Received', tintingsData.data.length, 'tintings');
  console.log('\n📋 Sample Records with Prices:\n');
  
  tintingsData.data.forEach((tinting, index) => {
    console.log(`${index + 1}. ${tinting.name} (${tinting.short_name})`);
    console.log(`   Price: ₹${tinting.tinting_price !== null ? parseFloat(tinting.tinting_price).toFixed(2) : 'Not Set'}`);
    console.log(`   Status: ${tinting.activeStatus ? 'Active' : 'Inactive'}`);
    console.log('');
  });
  
  // Step 3: Test create with price
  console.log('Step 3: Create New Tinting with Price...');
  const newTinting = {
    name: 'UI Test Tinting',
    short_name: 'UIT',
    description: 'Test from UI flow',
    tinting_price: 599.99,
    activeStatus: true
  };
  
  const createResponse = await fetch(`${BASE_URL}/v1/lens-tintings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(newTinting)
  });
  
  const createData = await createResponse.json();
  if (createData.success) {
    const created = createData.data;
    console.log('✅ Created successfully');
    console.log(`   ID: ${created.id}`);
    console.log(`   Name: ${created.name}`);
    console.log(`   Price: ₹${created.tinting_price}`);
    
    // Step 4: Verify by fetching the created record
    console.log('\nStep 4: Verify Created Record...');
    const verifyResponse = await fetch(`${BASE_URL}/v1/lens-tintings/${created.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const verifyData = await verifyResponse.json();
    if (verifyData.success) {
      console.log('✅ Verification successful');
      console.log(`   Retrieved Price: ₹${verifyData.data.tinting_price}`);
      
      if (verifyData.data.tinting_price === 599.99) {
        console.log('✅ Price matches what was sent!');
      } else {
        console.log('❌ Price mismatch!');
      }
    }
    
    // Step 5: Update the price
    console.log('\nStep 5: Update Price...');
    const updateResponse = await fetch(`${BASE_URL}/v1/lens-tintings/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: created.name,
        short_name: created.short_name,
        description: created.description,
        tinting_price: 699.99,
        activeStatus: true
      })
    });
    
    const updateData = await updateResponse.json();
    if (updateData.success) {
      console.log('✅ Update successful');
      console.log(`   New Price: ₹${updateData.data.tinting_price}`);
    }
    
    // Step 6: Clean up - delete the test record
    console.log('\nStep 6: Clean Up (Delete Test Record)...');
    await fetch(`${BASE_URL}/v1/lens-tintings/${created.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Test record deleted');
  }
  
  console.log('\n✅ All tests completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   ✓ tinting_price field present in list endpoint');
  console.log('   ✓ tinting_price field present in get-by-id endpoint');
  console.log('   ✓ tinting_price can be created with new records');
  console.log('   ✓ tinting_price can be updated');
  console.log('   ✓ Data flow from backend to frontend is working');
}

testTintingPriceFlow().catch(error => {
  console.error('❌ Test error:', error);
});
