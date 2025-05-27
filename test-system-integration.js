const axios = require('axios');
const io = require('socket.io-client');

const API_URL = 'http://localhost:5000/api';
const WS_URL = 'http://localhost:5000';

async function testIntegration() {
  console.log('🧪 Testing System Integration...
');

  try {
    // 1. Test Authentication
    console.log('1. Testing Authentication...');
    const authRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@hummert.de',
      password: 'admin123'
    });
    
    const { token, refreshToken } = authRes.data;
    console.log('✅ Login successful');
    console.log('✅ Access token received');
    console.log(`✅ Refresh token received: ${!!refreshToken}`);

    // 2. Test Protected Routes
    console.log('\n2. Testing Protected Routes...');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    const endpoints = [
      '/umzuege',
      '/mitarbeiter',
      '/fahrzeuge',
      '/aufnahmen',
      '/finanzen/angebote'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(`${API_URL}${endpoint}`, config);
        console.log(`✅ ${endpoint} - OK`);
      } catch (error) {
        console.log(`❌ ${endpoint} - Failed: ${error.response?.status}`);
      }
    }

    // 3. Test WebSocket Connection
    console.log('\n3. Testing WebSocket...');
    const socket = io(WS_URL, {
      auth: { token }
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        resolve();
      });
      socket.on('connect_error', (error) => {
        console.log('❌ WebSocket failed:', error.message);
        reject(error);
      });
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    }).catch(() => {});

    socket.disconnect();

    // 4. Test Token Refresh
    console.log('\n4. Testing Token Refresh...');
    try {
      const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken
      });
      console.log('✅ Token refresh successful');
    } catch (error) {
      console.log('❌ Token refresh failed');
    }

    console.log('\n✅ Integration test completed!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
  }
}

testIntegration();
