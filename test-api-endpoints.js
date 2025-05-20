// Test script for API endpoints
const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test data
const testData = {
  user: {
    email: `test_${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Test User'
  },
  admin: {
    email: `admin_${Date.now()}@example.com`,
    password: 'Admin123!@#',
    name: 'Admin User'
  }
};

let authToken = null;
let adminToken = null;

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test functions
async function testHealthEndpoint() {
  console.log('Testing Health Endpoint...'.yellow);
  const result = await apiCall('GET', '/health');
  
  if (result.success) {
    console.log('✓ Health endpoint working'.green);
  } else {
    console.log('✗ Health endpoint failed'.red, result.error);
  }
  
  return result.success;
}

async function testRegistration() {
  console.log('\nTesting User Registration...'.yellow);
  const result = await apiCall('POST', '/auth/register', testData.user);
  
  if (result.success) {
    console.log('✓ User registration successful'.green);
    authToken = result.data.token;
  } else {
    console.log('✗ User registration failed'.red, result.error);
  }
  
  return result.success;
}

async function testLogin() {
  console.log('\nTesting User Login...'.yellow);
  const result = await apiCall('POST', '/auth/login', {
    email: testData.user.email,
    password: testData.user.password
  });
  
  if (result.success) {
    console.log('✓ User login successful'.green);
    authToken = result.data.token;
  } else {
    console.log('✗ User login failed'.red, result.error);
  }
  
  return result.success;
}

async function testGetProfile() {
  console.log('\nTesting Get Profile...'.yellow);
  const result = await apiCall('GET', '/auth/me', null, authToken);
  
  if (result.success) {
    console.log('✓ Get profile successful'.green);
  } else {
    console.log('✗ Get profile failed'.red, result.error);
  }
  
  return result.success;
}

async function testInvalidLogin() {
  console.log('\nTesting Invalid Login...'.yellow);
  const result = await apiCall('POST', '/auth/login', {
    email: 'invalid@example.com',
    password: 'wrongpassword'
  });
  
  if (!result.success && result.status === 401) {
    console.log('✓ Invalid login properly rejected'.green);
    return true;
  } else {
    console.log('✗ Invalid login not properly handled'.red);
    return false;
  }
}

async function testValidationErrors() {
  console.log('\nTesting Validation Errors...'.yellow);
  
  // Test missing email
  let result = await apiCall('POST', '/auth/register', {
    password: 'Test123!@#',
    name: 'Test User'
  });
  
  if (!result.success && result.status === 400) {
    console.log('✓ Missing email validation working'.green);
  } else {
    console.log('✗ Missing email validation failed'.red);
  }
  
  // Test invalid email format
  result = await apiCall('POST', '/auth/register', {
    email: 'invalidemail',
    password: 'Test123!@#',
    name: 'Test User'
  });
  
  if (!result.success && result.status === 400) {
    console.log('✓ Invalid email format validation working'.green);
  } else {
    console.log('✗ Invalid email format validation failed'.red);
  }
  
  // Test weak password
  result = await apiCall('POST', '/auth/register', {
    email: `test_${Date.now()}@example.com`,
    password: '123',
    name: 'Test User'
  });
  
  if (!result.success && result.status === 400) {
    console.log('✓ Weak password validation working'.green);
  } else {
    console.log('✗ Weak password validation failed'.red);
  }
  
  return true;
}

async function testProtectedRoutes() {
  console.log('\nTesting Protected Routes...'.yellow);
  
  // Test accessing protected route without token
  let result = await apiCall('GET', '/auth/me');
  
  if (!result.success && result.status === 401) {
    console.log('✓ Protected route blocked without token'.green);
  } else {
    console.log('✗ Protected route not properly protected'.red);
  }
  
  // Test with invalid token
  result = await apiCall('GET', '/auth/me', null, 'invalid-token');
  
  if (!result.success && result.status === 401) {
    console.log('✓ Protected route blocked with invalid token'.green);
  } else {
    console.log('✗ Protected route not validating token properly'.red);
  }
  
  return true;
}

async function testRateLimiting() {
  console.log('\nTesting Rate Limiting...'.yellow);
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(apiCall('POST', '/auth/login', {
      email: 'test@example.com',
      password: 'wrongpassword'
    }));
  }
  
  const results = await Promise.all(promises);
  const rateLimited = results.some(r => r.status === 429);
  
  if (rateLimited) {
    console.log('✓ Rate limiting working'.green);
  } else {
    console.log('✗ Rate limiting not working'.red);
  }
  
  return rateLimited;
}

async function testCORS() {
  console.log('\nTesting CORS...'.yellow);
  
  try {
    const response = await axios.options(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      console.log('✓ CORS headers present'.green);
      return true;
    } else {
      console.log('✗ CORS headers missing'.red);
      return false;
    }
  } catch (error) {
    console.log('✗ CORS test failed'.red, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('Starting API Endpoint Tests'.cyan.bold);
  console.log('==========================='.cyan);
  
  const tests = [
    { name: 'Health Check', fn: testHealthEndpoint },
    { name: 'Registration', fn: testRegistration },
    { name: 'Login', fn: testLogin },
    { name: 'Get Profile', fn: testGetProfile },
    { name: 'Invalid Login', fn: testInvalidLogin },
    { name: 'Validation Errors', fn: testValidationErrors },
    { name: 'Protected Routes', fn: testProtectedRoutes },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'CORS', fn: testCORS }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`✗ ${test.name} failed with error:`.red, error.message);
      failed++;
    }
  }
  
  console.log('\n==========================='.cyan);
  console.log('Test Results'.cyan.bold);
  console.log(`Passed: ${passed}`.green);
  console.log(`Failed: ${failed}`.red);
  console.log(`Total: ${tests.length}`.yellow);
  console.log('==========================='.cyan);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:'.red, error);
  process.exit(1);
});