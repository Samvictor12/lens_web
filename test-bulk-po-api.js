/**
 * Test script for Bulk Purchase Order API
 * This script tests the new bulk lens selection functionality
 */

const BASE_URL = 'http://localhost:8000/api';

// Test data for bulk purchase order
const testBulkPO = {
  poNumber: 'PO-BULK-001',
  vendorId: 1,
  orderType: 'Bulk',
  lensBulkSelection: [
    {
      lens_id: 1,
      category_id: 1,
      coating_id: 1,
      Type_id: 1,
      quantity: 10,
      unitPrice: 500,
      rightEye: true,
      leftEye: true,
      rightSpherical: '-2.00',
      rightCylindrical: '-0.50',
      rightAxis: '90',
      leftSpherical: '-1.75',
      leftCylindrical: '-0.25',
      leftAxis: '85'
    },
    {
      lens_id: 2,
      category_id: 2,
      coating_id: 2,
      Type_id: 1,
      quantity: 5,
      unitPrice: 750,
      rightEye: true,
      leftEye: false,
      rightSpherical: '+1.50',
      rightCylindrical: '0.00',
      rightAxis: '0'
    },
    {
      lens_id: 3,
      category_id: 1,
      coating_id: 3,
      Type_id: 2,
      quantity: 8,
      unitPrice: 600,
      rightEye: false,
      leftEye: true,
      leftSpherical: '-3.25',
      leftCylindrical: '-1.00',
      leftAxis: '180'
    }
  ],
  discountPercentage: 10,
  taxAmount: 150,
  roundOff: 5,
  createdBy: 1,
  notes: 'Bulk order test - multiple lens types'
};

// Test data for single purchase order
const testSinglePO = {
  poNumber: 'PO-SINGLE-001',
  vendorId: 1,
  orderType: 'Single',
  lens_id: 1,
  category_id: 1,
  coating_id: 1,
  Type_id: 1,
  quantity: 1,
  unitPrice: 500,
  subtotal: 500,
  totalValue: 500,
  rightEye: true,
  leftEye: true,
  rightSpherical: '-2.00',
  rightCylindrical: '-0.50',
  rightAxis: '90',
  leftSpherical: '-1.75',
  leftCylindrical: '-0.25',
  leftAxis: '85',
  createdBy: 1,
  notes: 'Single order test'
};

async function testAPI() {
  console.log('🧪 Testing Bulk Purchase Order API...\n');

  try {
    // Test 1: Calculate bulk totals
    console.log('1️⃣ Testing bulk totals calculation...');
    const bulkTotalsResponse = await fetch(`${BASE_URL}/purchase-orders/calculate-bulk-totals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lensBulkSelection: testBulkPO.lensBulkSelection
      })
    });

    if (bulkTotalsResponse.ok) {
      const bulkTotalsResult = await bulkTotalsResponse.json();
      console.log('✅ Bulk totals calculated:', bulkTotalsResult.data);
    } else {
      console.log('❌ Bulk totals calculation failed:', await bulkTotalsResponse.text());
    }

    // Test 2: Get order types dropdown
    console.log('\n2️⃣ Testing order types dropdown...');
    const orderTypesResponse = await fetch(`${BASE_URL}/purchase-orders/order-types/dropdown`);
    
    if (orderTypesResponse.ok) {
      const orderTypesResult = await orderTypesResponse.json();
      console.log('✅ Order types:', orderTypesResult.data);
    } else {
      console.log('❌ Order types fetch failed:', await orderTypesResponse.text());
    }

    // Test 3: Create bulk purchase order
    console.log('\n3️⃣ Testing bulk purchase order creation...');
    const createBulkResponse = await fetch(`${BASE_URL}/purchase-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBulkPO)
    });

    let bulkPOId = null;
    if (createBulkResponse.ok) {
      const bulkPOResult = await createBulkResponse.json();
      bulkPOId = bulkPOResult.data.id;
      console.log('✅ Bulk PO created:', {
        id: bulkPOId,
        poNumber: bulkPOResult.data.poNumber,
        orderType: bulkPOResult.data.orderType,
        totalQuantity: bulkPOResult.data.quantity,
        totalValue: bulkPOResult.data.totalValue
      });
      
      if (bulkPOResult.data.bulkSummary) {
        console.log('📊 Bulk Summary:', bulkPOResult.data.bulkSummary);
      }
    } else {
      console.log('❌ Bulk PO creation failed:', await createBulkResponse.text());
    }

    // Test 4: Create single purchase order
    console.log('\n4️⃣ Testing single purchase order creation...');
    const createSingleResponse = await fetch(`${BASE_URL}/purchase-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSinglePO)
    });

    let singlePOId = null;
    if (createSingleResponse.ok) {
      const singlePOResult = await createSingleResponse.json();
      singlePOId = singlePOResult.data.id;
      console.log('✅ Single PO created:', {
        id: singlePOId,
        poNumber: singlePOResult.data.poNumber,
        orderType: singlePOResult.data.orderType,
        quantity: singlePOResult.data.quantity,
        totalValue: singlePOResult.data.totalValue
      });
    } else {
      console.log('❌ Single PO creation failed:', await createSingleResponse.text());
    }

    // Test 5: Get purchase order by ID (bulk)
    if (bulkPOId) {
      console.log('\n5️⃣ Testing bulk PO retrieval...');
      const getBulkResponse = await fetch(`${BASE_URL}/purchase-orders/${bulkPOId}`);
      
      if (getBulkResponse.ok) {
        const getBulkResult = await getBulkResponse.json();
        console.log('✅ Bulk PO retrieved:', {
          orderType: getBulkResult.data.orderType,
          bulkItemsCount: getBulkResult.data.lensBulkSelection?.length || 0,
          bulkSummary: getBulkResult.data.bulkSummary
        });
      } else {
        console.log('❌ Bulk PO retrieval failed:', await getBulkResponse.text());
      }
    }

    // Test 6: Get all purchase orders (should include both)
    console.log('\n6️⃣ Testing purchase orders list...');
    const getListResponse = await fetch(`${BASE_URL}/purchase-orders?limit=10`);
    
    if (getListResponse.ok) {
      const getListResult = await getListResponse.json();
      console.log('✅ PO list retrieved:', {
        total: getListResult.pagination?.total || 0,
        bulkOrders: getListResult.data?.filter(po => po.orderType === 'Bulk').length || 0,
        singleOrders: getListResult.data?.filter(po => po.orderType === 'Single').length || 0
      });
    } else {
      console.log('❌ PO list retrieval failed:', await getListResponse.text());
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI();
}

export default testAPI;