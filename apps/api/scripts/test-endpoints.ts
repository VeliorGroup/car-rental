
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';
const LOGIN_PAYLOAD = {
  email: 'admin@example.com',
  password: 'password123',
};

const ENDPOINTS = [
  { method: 'GET', path: '/auth/profile' },
  { method: 'GET', path: '/vehicles' },
  { method: 'GET', path: '/customers' },
  { method: 'GET', path: '/bookings' },
  { method: 'GET', path: '/branches' },
  { method: 'GET', path: '/cautions' },
  { method: 'GET', path: '/damages' },
  { method: 'GET', path: '/maintenance' },
  { method: 'GET', path: '/analytics/dashboard' },
  { method: 'GET', path: '/users' },
  { method: 'GET', path: '/tires' },
  // { method: 'GET', path: '/notifications' }, // Might need param
];

async function testEndpoints() {
  console.log('🚀 Starting API Endpoint Verification...');
  
  let token = '';

  // 1. Login
  try {
    console.log(`\n🔑 Authenticating as ${LOGIN_PAYLOAD.email}...`);
    const loginRes = await axios.post(`${API_URL}/auth/login`, LOGIN_PAYLOAD);
    token = loginRes.data.accessToken;
    console.log('✅ Login successful!');
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Endpoints
  console.log('\n📡 Testing Endpoints...');
  let successCount = 0;
  let failCount = 0;

  for (const endpoint of ENDPOINTS) {
    const url = `${API_URL}${endpoint.path}`;
    try {
      const start = Date.now();
      const res = await axios({
        method: endpoint.method,
        url,
        headers,
      });
      const duration = Date.now() - start;
      console.log(`✅ [${res.status}] ${endpoint.method} ${endpoint.path} (${duration}ms)`);
      successCount++;
    } catch (error: any) {
      const duration = 0; 
      // Approximate, better to measure inside try/catch but simple enough
      console.error(`❌ [${error.response?.status || 'ERR'}] ${endpoint.method} ${endpoint.path} - ${error.message}`);
      if (error.response?.data) {
        // console.error('   Resp:', JSON.stringify(error.response.data).slice(0, 100));
      }
      failCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total: ${ENDPOINTS.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

testEndpoints();
