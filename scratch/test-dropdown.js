import axios from 'axios';

async function testDropdown() {
  console.log('🧪 Querying products dropdown...');
  try {
    // Login
    const loginRes = await axios.post('http://localhost:6201/api/auth/login', {
      username: 'system',
      password: 'admin123'
    });

    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully. Token acquired.');

    // Fetch dropdown
    const dropdownRes = await axios.get('http://localhost:6201/api/v1/lens-products/dropdown', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Dropdown response:', JSON.stringify(dropdownRes.data, null, 2));

  } catch (err) {
    console.error('❌ Error querying dropdown:', err.response?.data || err.message);
  }
}

testDropdown();
