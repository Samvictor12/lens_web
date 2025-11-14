/**
 * Customer Master API Test Examples
 * Demonstrates how to use the Customer Master API endpoints
 */

// Base URL for the API
const API_BASE_URL = 'http://localhost:3001/api/customer-master';

// Sample authentication token (replace with actual token)
const AUTH_TOKEN = 'your-jwt-token-here';

// Headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

/**
 * Example 1: Create a new customer master
 */
export async function createCustomerMaster() {
  const customerData = {
    customerCode: "CUS001",
    name: "Surash Kumar",
    shopName: "ABC Opticals",
    phone: "8988778899",
    alternatephone: "9876543210",
    email: "surash@abcopticals.com",
    address: "123 Main Street, Madhuranthagam, Tamil Nadu - 603306",
    gstNumber: "33AAAAA0000A1Z5",
    creditLimit: "20000"
  };

  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(customerData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer created successfully:', result.data);
      return result.data;
    } else {
      console.error('Failed to create customer:', result);
    }
  } catch (error) {
    console.error('Error creating customer:', error);
  }
}

/**
 * Example 2: Get paginated list of customers with filters
 */
export async function getCustomers(filters = {}) {
  const queryParams = new URLSearchParams({
    page: filters.page || '1',
    limit: filters.limit || '10',
    ...filters
  }).toString();

  try {
    const response = await fetch(`${API_BASE_URL}?${queryParams}`, {
      method: 'GET',
      headers
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customers fetched:', result.data);
      console.log('Pagination:', result.pagination);
      return result;
    } else {
      console.error('Failed to fetch customers:', result);
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
  }
}

/**
 * Example 3: Get customer by ID
 */
export async function getCustomerById(customerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${customerId}`, {
      method: 'GET',
      headers
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer details:', result.data);
      return result.data;
    } else {
      console.error('Failed to fetch customer:', result);
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
  }
}

/**
 * Example 4: Update customer master
 */
export async function updateCustomer(customerId, updateData) {
  try {
    const response = await fetch(`${API_BASE_URL}/${customerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer updated successfully:', result.data);
      return result.data;
    } else {
      console.error('Failed to update customer:', result);
    }
  } catch (error) {
    console.error('Error updating customer:', error);
  }
}

/**
 * Example 5: Delete customer master
 */
export async function deleteCustomer(customerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/${customerId}`, {
      method: 'DELETE',
      headers
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer deleted successfully:', result.message);
      return true;
    } else {
      console.error('Failed to delete customer:', result);
      return false;
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    return false;
  }
}

/**
 * Example 6: Get customer dropdown list
 */
export async function getCustomerDropdown() {
  try {
    const response = await fetch(`${API_BASE_URL}/dropdown`, {
      method: 'GET',
      headers
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer dropdown list:', result.data);
      return result.data;
    } else {
      console.error('Failed to fetch dropdown:', result);
    }
  } catch (error) {
    console.error('Error fetching dropdown:', error);
  }
}

/**
 * Example 7: Check if customer code exists
 */
export async function checkCustomerCode(customerCode, excludeId = null) {
  const requestBody = { customerCode };
  if (excludeId) {
    requestBody.excludeId = excludeId;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/check-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer code check:', result.data);
      return result.data.exists;
    } else {
      console.error('Failed to check customer code:', result);
    }
  } catch (error) {
    console.error('Error checking customer code:', error);
  }
}

/**
 * Example 8: Get customer statistics
 */
export async function getCustomerStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      method: 'GET',
      headers
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Customer statistics:', result.data);
      return result.data;
    } else {
      console.error('Failed to fetch stats:', result);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

/**
 * Complete workflow example
 */
export async function customerMasterWorkflow() {
  console.log('=== Customer Master API Workflow ===');
  
  // 1. Check if customer code exists
  const codeExists = await checkCustomerCode('CUS001');
  console.log('Customer code CUS001 exists:', codeExists);
  
  // 2. Create a new customer (if code doesn't exist)
  if (!codeExists) {
    const newCustomer = await createCustomerMaster();
    console.log('New customer ID:', newCustomer?.id);
  }
  
  // 3. Get customers with filters
  await getCustomers({
    name: 'sur',
    page: '1',
    limit: '5',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // 4. Get customer dropdown for forms
  await getCustomerDropdown();
  
  // 5. Get customer statistics
  await getCustomerStats();
}

// Usage examples:
/*
// Run the complete workflow
customerMasterWorkflow();

// Or use individual functions
createCustomerMaster().then(customer => {
  if (customer) {
    // Update the customer
    updateCustomer(customer.id, {
      shopName: "ABC Opticals Limited",
      creditLimit: "30000"
    });
    
    // Get updated customer details
    getCustomerById(customer.id);
  }
});

// Filter customers by shop name
getCustomers({
  shopName: 'ABC',
  page: '1',
  limit: '20'
});

// Search customers by name
getCustomers({
  name: 'surash',
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
*/