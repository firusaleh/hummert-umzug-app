// Test script for notification endpoints
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
let authToken = '';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'Test123!@#'
};

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper function to log results
const log = (message, type = 'info') => {
  const color = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue
  }[type] || colors.reset;
  
  console.log(`${color}${message}${colors.reset}`);
};

// Login to get auth token
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, testUser);
    authToken = response.data.token;
    log('✅ Login successful', 'success');
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'error');
    return false;
  }
}

// Test notification endpoints
async function testNotificationEndpoints() {
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  const tests = [
    {
      name: 'Get notification settings (preferences)',
      method: 'GET',
      endpoint: '/benachrichtigungen/einstellungen',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && 
               (data.data?.einstellungen || data.einstellungen || data.preferences);
      }
    },
    {
      name: 'Update notification settings',
      method: 'PUT',
      endpoint: '/benachrichtigungen/einstellungen',
      data: {
        email: true,
        push: false,
        typen: {
          info: true,
          warnung: true,
          erinnerung: false,
          erfolg: true
        }
      },
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && data.message;
      }
    },
    {
      name: 'Get all notifications',
      method: 'GET',
      endpoint: '/benachrichtigungen',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && Array.isArray(data.benachrichtigungen || data.notifications || data.data);
      }
    },
    {
      name: 'Get unread count',
      method: 'GET',
      endpoint: '/benachrichtigungen/ungelesen',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && typeof data.anzahl === 'number';
      }
    },
    {
      name: 'Create test notification',
      method: 'POST',
      endpoint: '/benachrichtigungen/test',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && (data.message || data.notification);
      }
    },
    {
      name: 'Subscribe to push notifications',
      method: 'POST',
      endpoint: '/benachrichtigungen/push/subscribe',
      data: {
        subscription: {
          endpoint: 'https://example.com/push',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth'
          }
        }
      },
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success;
      }
    },
    {
      name: 'Unsubscribe from push notifications',
      method: 'POST',
      endpoint: '/benachrichtigungen/push/unsubscribe',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success;
      }
    },
    {
      name: 'Mark all as read',
      method: 'PUT',
      endpoint: '/benachrichtigungen/alle-gelesen',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success;
      }
    },
    {
      name: 'Delete all read notifications',
      method: 'DELETE',
      endpoint: '/benachrichtigungen/alle-gelesen',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success;
      }
    },
    {
      name: 'Get notification statistics',
      method: 'GET',
      endpoint: '/benachrichtigungen/statistik',
      expectedStatus: 200,
      validateResponse: (data) => {
        return data.success && data.statistics;
      }
    }
  ];

  console.log('\n🧪 Testing Notification Endpoints\n');

  for (const test of tests) {
    try {
      const config = {
        method: test.method,
        url: test.endpoint
      };
      
      if (test.data) {
        config.data = test.data;
      }

      const response = await api(config);
      
      if (response.status === test.expectedStatus && test.validateResponse(response.data)) {
        log(`✅ ${test.name}`, 'success');
        console.log(`   Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
      } else {
        log(`❌ ${test.name} - Unexpected response format`, 'error');
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      log(`❌ ${test.name}`, 'error');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 404) {
        console.log('   Status: 404 - Endpoint not found');
      }
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Notification Endpoint Tests\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test User: ${testUser.email}\n`);

  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n⚠️  Cannot proceed without authentication');
    process.exit(1);
  }

  // Run notification tests
  await testNotificationEndpoints();

  console.log('\n✨ Tests completed!');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runTests();