// Quick test to see what error the API returns
import axios from 'axios';

const testRelease = {
  name: 'Test Sneaker',
  sku: 'TEST-001',
  status: 'upcoming',
  price: 150,
  currency: 'USD',
  images: ['https://example.com/image.jpg'],
  brand: 'Nike',
  metadata: {
    retailer: 'test',
    url: 'https://example.com',
    locations: [],
    sizes: []
  }
};

async function testBatch() {
  try {
    const url = 'http://localhost:4000/api/releases/enhanced/batch';
    console.log('POST to:', url);
    console.log('Payload:', JSON.stringify([testRelease], null, 2));
    
    const response = await axios.post(url, [testRelease], {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Success! Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error('No response received');
    }
  }
}

testBatch();
