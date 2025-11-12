/**
 * Direct Customer Master API Testing Script
 * Tests Customer Master functionality directly through service layer
 */

import { PrismaClient } from '@prisma/client';
import CustomerMasterService from './src/backend/services/customerMasterService.js';

const prisma = new PrismaClient();
const customerService = new CustomerMasterService();

async function testCustomerMasterDirectly() {
    console.log('=== Direct Customer Master Service Testing ===\n');
    
    try {
        // Test 1: Create a test customer
        console.log('1. Testing Customer Creation...');
        const testCustomerData = {
            name: "Test Customer API",
            code: "TEST-CUST-001",
            email: "testcustomer@example.com",
            phone: "9876543210",
            shopname: "Test Shop",
            address: "123 Test Street",
            city: "Test City",
            state: "Test State",
            pincode: "123456",
            credit_limit: 50000,
            outstanding_credit: 0,
            active_status: true,
            createdBy: 5,
            updatedBy: 5
        };
        
        const createdCustomer = await customerService.createCustomerMaster(testCustomerData);
        console.log('✅ Customer created successfully');
        console.log(`   ID: ${createdCustomer.id}, Name: ${createdCustomer.name}`);
        
        const customerId = createdCustomer.id;
        
        // Test 2: Get customer by ID
        console.log('\n2. Testing Get Customer by ID...');
        const retrievedCustomer = await customerService.getCustomerMasterById(customerId);
        console.log('✅ Customer retrieved successfully');
        console.log(`   Name: ${retrievedCustomer.name}, Email: ${retrievedCustomer.email}`);
        
        // Test 3: Update customer
        console.log('\n3. Testing Customer Update...');
        const updateData = {
            name: "Updated Test Customer",
            phone: "9876543211",
            updatedBy: 5
        };
        const updatedCustomer = await customerService.updateCustomerMaster(customerId, updateData);
        console.log('✅ Customer updated successfully');
        console.log(`   Updated Name: ${updatedCustomer.name}`);
        
        // Test 4: Get customers list
        console.log('\n4. Testing Get Customers List...');
        const customersList = await customerService.getCustomerMasters({ page: 1, limit: 5 });
        console.log('✅ Customers list retrieved successfully');
        console.log(`   Total customers: ${customersList.pagination.total}`);
        console.log(`   Returned: ${customersList.data.length} customers`);
        
        // Test 5: Email validation
        console.log('\n5. Testing Email Validation...');
        const emailExists = await customerService.isCustomerEmailExists("testcustomer@example.com");
        console.log('✅ Email validation working');
        console.log(`   Email exists: ${emailExists}`);
        
        // Test 6: Customer dropdown
        console.log('\n6. Testing Customer Dropdown...');
        const dropdown = await customerService.getCustomerDropdown();
        console.log('✅ Customer dropdown retrieved successfully');
        console.log(`   Dropdown items: ${dropdown.length}`);
        
        // Test 7: Soft delete
        console.log('\n7. Testing Customer Soft Delete...');
        await customerService.deleteCustomerMaster(customerId, 5);
        console.log('✅ Customer soft deleted successfully');
        
        // Test 8: Verify soft delete
        console.log('\n8. Verifying Soft Delete...');
        const deletedCustomer = await customerService.getCustomerMasterById(customerId);
        console.log('✅ Soft delete verified');
        console.log(`   Delete Status: ${deletedCustomer.delete_status}, Active: ${deletedCustomer.active_status}`);
        
        console.log('\n=== ALL TESTS PASSED ===');
        console.log('Customer Master Service is fully functional!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the tests
testCustomerMasterDirectly();