import axios from 'axios';

async function testOfferApi() {
  console.log('🧪 Testing Offer API Validations...');
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:6201/api/auth/login', {
      username: 'system',
      password: 'admin123'
    });

    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully.');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. Test EXCHANGE_PRODUCT validation failure (missing exchange_lens_id)
    console.log('\nTesting EXCHANGE_PRODUCT missing exchange_lens_id validation:');
    try {
      await axios.post('http://localhost:6201/api/v1/lens-offers', {
        offerName: 'Invalid EXCHANGE_PRODUCT Offer',
        offerType: 'EXCHANGE_PRODUCT',
        lens_id: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }, { headers });
      console.error('❌ Expected validation failure but request succeeded!');
    } catch (err) {
      console.log('✅ Correctly failed validation:', err.response?.data || err.message);
    }

    // 3. Test EXCHANGE_COATING_PRICE validation failure (missing exchange_coating_id)
    console.log('\nTesting EXCHANGE_COATING_PRICE missing exchange_coating_id validation:');
    try {
      await axios.post('http://localhost:6201/api/v1/lens-offers', {
        offerName: 'Invalid EXCHANGE_COATING_PRICE Offer',
        offerType: 'EXCHANGE_COATING_PRICE',
        lens_id: 1,
        coating_id: 1,
        exchange_lens_id: 2,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }, { headers });
      console.error('❌ Expected validation failure but request succeeded!');
    } catch (err) {
      console.log('✅ Correctly failed validation:', err.response?.data || err.message);
    }

    // 4. Test EXCHANGE_PRODUCT validation failure (missing lens_id)
    console.log('\nTesting EXCHANGE_PRODUCT missing lens_id (From Product) validation:');
    try {
      await axios.post('http://localhost:6201/api/v1/lens-offers', {
        offerName: 'Invalid EXCHANGE_PRODUCT Offer',
        offerType: 'EXCHANGE_PRODUCT',
        exchange_lens_id: 2,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }, { headers });
      console.error('❌ Expected validation failure but request succeeded!');
    } catch (err) {
      console.log('✅ Correctly failed validation:', err.response?.data || err.message);
    }

    // 5. Test EXCHANGE_COATING_PRICE validation failure (missing coating_id)
    console.log('\nTesting EXCHANGE_COATING_PRICE missing coating_id (From Coating) validation:');
    try {
      await axios.post('http://localhost:6201/api/v1/lens-offers', {
        offerName: 'Invalid EXCHANGE_COATING_PRICE Offer',
        offerType: 'EXCHANGE_COATING_PRICE',
        lens_id: 1,
        exchange_lens_id: 2,
        exchange_coating_id: 1,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }, { headers });
      console.error('❌ Expected validation failure but request succeeded!');
    } catch (err) {
      console.log('✅ Correctly failed validation:', err.response?.data || err.message);
    }

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
  }
}

testOfferApi();
