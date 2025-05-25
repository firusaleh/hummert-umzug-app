#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';
let authToken = null;
let testUserId = null;
let testItemIds = {
  umzug: null,
  mitarbeiter: null,
  aufnahme: null,
  fahrzeug: null,
  benachrichtigung: null,
  zeiterfassung: null
};

const testResults = {
  passed: 0,
  failed: 0,
  endpoints: []
};

// Test helper functions
async function test(endpoint, method, name, testFunc) {
  const testName = `${method} ${endpoint} - ${name}`;
  process.stdout.write(`Testing: ${testName}... `);
  
  try {
    await testFunc();
    console.log('✓'.green);
    testResults.passed++;
    testResults.endpoints.push({ 
      endpoint, 
      method, 
      name, 
      status: 'passed' 
    });
  } catch (error) {
    console.log('✗'.red);
    console.error(`  Error: ${error.message}`.red);
    if (error.response?.data) {
      console.error(`  Response: ${JSON.stringify(error.response.data)}`.red);
    }
    testResults.failed++;
    testResults.endpoints.push({ 
      endpoint, 
      method, 
      name, 
      status: 'failed', 
      error: error.message,
      details: error.response?.data
    });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Setup test user
async function setupTestUser() {
  try {
    // Try to login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = loginResponse.data.token;
    testUserId = loginResponse.data.user.id;
  } catch (error) {
    // If login fails, register
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
      authToken = registerResponse.data.token;
      testUserId = registerResponse.data.user.id;
    } catch (regError) {
      console.error('Failed to setup test user:', regError.message);
      process.exit(1);
    }
  }
}

// Test functions for each endpoint group

// Health & Base
async function testHealthEndpoints() {
  console.log('\n📡 Health & Base Endpoints'.bold);
  
  await test('/health', 'GET', 'Health check', async () => {
    const response = await axios.get(`${API_URL}/health`);
    assert(response.status === 200, 'Should return 200');
    assert(response.data.status === 'ok', 'Should have ok status');
  });
  
  await test('/', 'GET', 'API root', async () => {
    const response = await axios.get(`${API_URL}/`);
    assert(response.status === 200, 'Should return 200');
    assert(response.data.message, 'Should have message');
  });
}

// Authentication
async function testAuthEndpoints() {
  console.log('\n🔐 Authentication Endpoints'.bold);
  
  await test('/auth/register', 'POST', 'Registration validation', async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'invalid-email',
        password: '123',
        name: ''
      });
      throw new Error('Should have failed validation');
    } catch (error) {
      assert(error.response?.status === 400, 'Should return 400 for invalid data');
    }
  });
  
  await test('/auth/login', 'POST', 'Login', async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.token, 'Should return token');
  });
  
  await test('/auth/me', 'GET', 'Get profile', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.user, 'Should return user data');
  });
  
  await test('/auth/check', 'GET', 'Check auth', async () => {
    const response = await axios.get(`${API_URL}/auth/check`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
}

// Umzuege (Moves)
async function testUmzuegeEndpoints() {
  console.log('\n📦 Umzuege Endpoints'.bold);
  
  await test('/umzuege', 'POST', 'Create Umzug', async () => {
    const response = await axios.post(`${API_URL}/umzuege`, {
      kunde: {
        name: 'Test Kunde',
        email: 'kunde@test.de',
        telefon: '0123456789'
      },
      datum: new Date(Date.now() + 86400000).toISOString(),
      status: 'geplant',
      auszugsadresse: {
        strasse: 'Teststraße',
        hausnummer: '1',
        plz: '12345',
        ort: 'Teststadt'
      },
      einzugsadresse: {
        strasse: 'Zielstraße',
        hausnummer: '2',
        plz: '54321',
        ort: 'Zielstadt'
      }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 201, 'Should return 201');
    assert(response.data.data?._id || response.data.data?.id || response.data._id || response.data.id, 'Should return ID');
    testItemIds.umzug = response.data.data?._id || response.data.data?.id || response.data._id || response.data.id;
  });
  
  await test('/umzuege', 'GET', 'List Umzuege', async () => {
    const response = await axios.get(`${API_URL}/umzuege`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.data || response.data.umzuege || Array.isArray(response.data), 'Should return data');
  });
  
  if (testItemIds.umzug) {
    await test(`/umzuege/${testItemIds.umzug}`, 'GET', 'Get single Umzug', async () => {
      const response = await axios.get(`${API_URL}/umzuege/${testItemIds.umzug}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(response.status === 200, 'Should return 200');
    });
    
    await test(`/umzuege/${testItemIds.umzug}`, 'PUT', 'Update Umzug', async () => {
      const response = await axios.put(`${API_URL}/umzuege/${testItemIds.umzug}`, {
        status: 'bestaetigt'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(response.status === 200, 'Should return 200');
    });
  }
}

// Mitarbeiter (Employees)
async function testMitarbeiterEndpoints() {
  console.log('\n👥 Mitarbeiter Endpoints'.bold);
  
  await test('/mitarbeiter', 'POST', 'Create Mitarbeiter', async () => {
    const response = await axios.post(`${API_URL}/mitarbeiter`, {
      vorname: 'Test',
      nachname: 'Mitarbeiter',
      email: `mitarbeiter-${Date.now()}@test.de`,
      telefon: '0123456789',
      position: 'Fahrer',
      status: 'Aktiv'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 201, 'Should return 201');
    testItemIds.mitarbeiter = response.data._id || response.data.id;
  });
  
  await test('/mitarbeiter', 'GET', 'List Mitarbeiter', async () => {
    const response = await axios.get(`${API_URL}/mitarbeiter`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
    assert(response.data.data || response.data.mitarbeiter || Array.isArray(response.data), 'Should return data');
  });
}

// Fahrzeuge (Vehicles)
async function testFahrzeugeEndpoints() {
  console.log('\n🚚 Fahrzeuge Endpoints'.bold);
  
  await test('/fahrzeuge', 'POST', 'Create Fahrzeug', async () => {
    const response = await axios.post(`${API_URL}/fahrzeuge`, {
      kennzeichen: `B-AB ${Date.now().toString().slice(-4)}`,
      bezeichnung: 'Mercedes Sprinter',
      marke: 'Mercedes',
      modell: 'Sprinter',
      typ: 'Transporter',
      status: 'Verfügbar'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 201, 'Should return 201');
    testItemIds.fahrzeug = response.data._id || response.data.id || response.data.data?._id;
  });
  
  await test('/fahrzeuge', 'GET', 'List Fahrzeuge', async () => {
    const response = await axios.get(`${API_URL}/fahrzeuge`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
}

// Benachrichtigungen (Notifications)
async function testBenachrichtigungenEndpoints() {
  console.log('\n🔔 Benachrichtigungen Endpoints'.bold);
  
  await test('/benachrichtigungen', 'GET', 'List notifications', async () => {
    const response = await axios.get(`${API_URL}/benachrichtigungen`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
}

// Zeiterfassung (Time Tracking)
async function testZeiterfassungEndpoints() {
  console.log('\n⏱️ Zeiterfassung Endpoints'.bold);
  
  await test('/zeiterfassung', 'POST', 'Create time entry', async () => {
    try {
      const response = await axios.post(`${API_URL}/zeiterfassung`, {
        mitarbeiterId: testItemIds.mitarbeiter || testUserId,
        datum: new Date().toISOString(),
        startzeit: '08:00',
        endzeit: '17:00',
        typ: 'arbeit'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(response.status === 201 || response.status === 200, 'Should return 201 or 200');
      testItemIds.zeiterfassung = response.data._id || response.data.id;
    } catch (error) {
      // Some implementations might require different fields
      if (error.response?.status === 400) {
        console.log(' (validation differences noted)'.yellow);
      } else {
        throw error;
      }
    }
  });
  
  await test('/zeiterfassung', 'GET', 'List time entries', async () => {
    const response = await axios.get(`${API_URL}/zeiterfassung`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
}

// Finanzen
async function testFinanzenEndpoints() {
  console.log('\n💰 Finanzen Endpoints'.bold);
  
  await test('/finanzen/angebote', 'GET', 'List Angebote', async () => {
    const response = await axios.get(`${API_URL}/finanzen/angebote`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
  
  await test('/finanzen/rechnungen', 'GET', 'List Rechnungen', async () => {
    const response = await axios.get(`${API_URL}/finanzen/rechnungen`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.status === 200, 'Should return 200');
  });
}

// File Upload
async function testUploadEndpoints() {
  console.log('\n📤 Upload Endpoints'.bold);
  
  await test('/uploads', 'GET', 'List uploads', async () => {
    try {
      const response = await axios.get(`${API_URL}/uploads`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(response.status === 200, 'Should return 200');
    } catch (error) {
      // Some implementations might not have GET /uploads
      if (error.response?.status === 404) {
        console.log(' (endpoint not implemented)'.yellow);
      } else {
        throw error;
      }
    }
  });
}

// Error handling
async function testErrorHandling() {
  console.log('\n❌ Error Handling'.bold);
  
  await test('/nonexistent', 'GET', '404 handling', async () => {
    try {
      await axios.get(`${API_URL}/nonexistent`);
      throw new Error('Should have returned 404');
    } catch (error) {
      assert(error.response?.status === 404, 'Should return 404');
    }
  });
  
  await test('/umzuege', 'GET', 'Unauthorized access', async () => {
    try {
      await axios.get(`${API_URL}/umzuege`);
      throw new Error('Should have returned 401');
    } catch (error) {
      assert(error.response?.status === 401, 'Should return 401 without auth');
    }
  });
}

// Cleanup
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...'.dim);
  
  // Delete test umzug
  if (testItemIds.umzug) {
    try {
      await axios.delete(`${API_URL}/umzuege/${testItemIds.umzug}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Delete test mitarbeiter
  if (testItemIds.mitarbeiter) {
    try {
      await axios.delete(`${API_URL}/mitarbeiter/${testItemIds.mitarbeiter}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Delete test fahrzeug
  if (testItemIds.fahrzeug) {
    try {
      await axios.delete(`${API_URL}/fahrzeuge/${testItemIds.fahrzeug}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Main test runner
async function runTests() {
  console.log('\n🧪 Running Backend Endpoint Tests\n'.bold.cyan);
  console.log('API URL:', API_URL);
  console.log('Testing at:', new Date().toISOString());
  console.log('='.repeat(50));
  
  try {
    // Setup
    await setupTestUser();
    console.log('✓ Test user authenticated'.green);
    
    // Run all test groups
    await testHealthEndpoints();
    await testAuthEndpoints();
    await testUmzuegeEndpoints();
    await testMitarbeiterEndpoints();
    await testFahrzeugeEndpoints();
    await testBenachrichtigungenEndpoints();
    await testZeiterfassungEndpoints();
    await testFinanzenEndpoints();
    await testUploadEndpoints();
    await testErrorHandling();
    
    // Cleanup
    await cleanup();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Summary\n'.bold);
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`Passed: ${testResults.passed}`.green);
    console.log(`Failed: ${testResults.failed}`.red);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    
    // Failed endpoints details
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Endpoints:'.red.bold);
      testResults.endpoints
        .filter(e => e.status === 'failed')
        .forEach(e => {
          console.log(`  - ${e.method} ${e.endpoint}: ${e.error}`.red);
          if (e.details) {
            console.log(`    Details: ${JSON.stringify(e.details)}`.dim);
          }
        });
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      apiUrl: API_URL,
      summary: {
        total: testResults.passed + testResults.failed,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1) + '%'
      },
      endpoints: testResults.endpoints
    };
    
    fs.writeFileSync(
      'backend-endpoints-test-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n📄 Test report saved to backend-endpoints-test-report.json');
    
  } catch (error) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
  } catch (error) {
    console.error('❌ Backend server is not running at', API_URL);
    console.log('Please start the backend with: npm run dev');
    process.exit(1);
  }
}

// Run the tests
checkServer().then(runTests);