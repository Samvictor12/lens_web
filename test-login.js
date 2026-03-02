// Test login script
const testLogin = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'demo123'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.ok) {
      const data = JSON.parse(result);
      console.log('✅ Login successful!');
      console.log('User:', data.data?.user?.name);
      console.log('Token received:', data.data?.token ? 'Yes' : 'No');
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
};

testLogin();