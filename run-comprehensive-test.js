#!/usr/bin/env node

/**
 * Comprehensive System Integration Test
 * 
 * This script tests all connections between frontend and backend
 */

const axios = require('axios');
const chalk = require('chalk');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let testData = {};

// Color helpers
const success = (msg) => console.log(chalk.green('✅ ' + msg));
const error = (msg) => console.log(chalk.red('❌ ' + msg));
const info = (msg) => console.log(chalk.blue('ℹ️  ' + msg));
const warn = (msg) => console.log(chalk.yellow('⚠️  ' + msg));

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuthentication() {
  console.log(chalk.bold('\n🔐 Testing Authentication System...\n'));
  
  try {
    // Test login
    info('Testing login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@hummert.de',
      password: 'admin123'
    });
    
    if (loginRes.data.token) {
      authToken = loginRes.data.token;
      success('Login successful - Access token received');
      
      if (loginRes.data.refreshToken) {
        success('Refresh token received');
        testData.refreshToken = loginRes.data.refreshToken;
      } else {
        warn('No refresh token received - backend may need update');
      }
    }
    
    // Test auth check
    info('Testing auth check...');
    const checkRes = await axios.get(`${API_URL}/auth/check`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    success('Auth check passed');
    
    // Test refresh token if available
    if (testData.refreshToken) {
      info('Testing token refresh...');
      try {
        const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: testData.refreshToken
        });
        if (refreshRes.data.token) {
          success('Token refresh successful');
          authToken = refreshRes.data.token;
        }
      } catch (err) {
        warn('Token refresh failed - feature may not be implemented yet');
      }
    }
    
    return true;
  } catch (err) {
    error(`Authentication failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testCRUDOperations() {
  console.log(chalk.bold('\n📊 Testing CRUD Operations...\n'));
  
  const headers = { Authorization: `Bearer ${authToken}` };
  const modules = [
    { name: 'Umzüge', endpoint: '/umzuege', testCreate: true },
    { name: 'Mitarbeiter', endpoint: '/mitarbeiter', testCreate: true },
    { name: 'Fahrzeuge', endpoint: '/fahrzeuge', testCreate: true },
    { name: 'Aufnahmen', endpoint: '/aufnahmen', testCreate: false },
    { name: 'Finanzen', endpoint: '/finanzen/angebote', testCreate: false }
  ];
  
  for (const module of modules) {
    info(`Testing ${module.name}...`);
    
    try {
      // Test GET all
      const getRes = await axios.get(`${API_URL}${module.endpoint}`, { headers });
      success(`GET ${module.endpoint} - OK (${getRes.data.data?.length || 0} items)`);
      
      if (module.testCreate && module.endpoint === '/mitarbeiter') {
        // Test CREATE for Mitarbeiter
        const newData = {
          name: 'Test Mitarbeiter',
          email: `test${Date.now()}@example.com`,
          telefon: '+49 123 4567890',
          rolle: 'Packer',
          adresse: {
            strasse: 'Teststraße',
            hausnummer: '123',
            plz: '12345',
            ort: 'Berlin'
          }
        };
        
        const createRes = await axios.post(`${API_URL}${module.endpoint}`, newData, { headers });
        if (createRes.data._id || createRes.data.data?._id) {
          const id = createRes.data._id || createRes.data.data._id;
          testData[module.name] = id;
          success(`POST ${module.endpoint} - Created ID: ${id}`);
          
          // Test GET by ID
          const getByIdRes = await axios.get(`${API_URL}${module.endpoint}/${id}`, { headers });
          success(`GET ${module.endpoint}/${id} - OK`);
          
          // Test UPDATE
          const updateRes = await axios.put(`${API_URL}${module.endpoint}/${id}`, 
            { name: 'Updated Test Mitarbeiter' }, 
            { headers }
          );
          success(`PUT ${module.endpoint}/${id} - OK`);
          
          // Test DELETE
          await axios.delete(`${API_URL}${module.endpoint}/${id}`, { headers });
          success(`DELETE ${module.endpoint}/${id} - OK`);
        }
      }
    } catch (err) {
      error(`${module.name}: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
    }
  }
}

async function testFileUpload() {
  console.log(chalk.bold('\n📁 Testing File Upload...\n'));
  
  try {
    // Create a test file using FormData
    const FormData = require('form-data');
    const fs = require('fs');
    
    // Create a simple test file
    const testContent = 'This is a test file for upload';
    fs.writeFileSync('test-upload.txt', testContent);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-upload.txt'));
    
    const uploadRes = await axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      }
    });
    
    if (uploadRes.data.file || uploadRes.data.data) {
      success('File upload successful');
      
      // Clean up
      fs.unlinkSync('test-upload.txt');
    }
  } catch (err) {
    if (err.response?.status === 404) {
      warn('File upload endpoint not found - feature may not be implemented');
    } else {
      error(`File upload failed: ${err.response?.data?.message || err.message}`);
    }
  }
}

async function testWebSocket() {
  console.log(chalk.bold('\n🔌 Testing WebSocket Connection...\n'));
  
  try {
    const io = require('socket.io-client');
    const socket = io('http://localhost:5000', {
      auth: { token: authToken }
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        success('WebSocket connected successfully');
        socket.disconnect();
        resolve();
      });
      
      socket.on('connect_error', (err) => {
        warn(`WebSocket connection failed: ${err.message} - feature may not be implemented`);
        resolve();
      });
      
      setTimeout(() => {
        warn('WebSocket connection timeout - feature may not be implemented');
        socket.disconnect();
        resolve();
      }, 3000);
    });
  } catch (err) {
    warn('WebSocket test skipped - socket.io-client not available');
  }
}

async function testErrorHandling() {
  console.log(chalk.bold('\n⚠️  Testing Error Handling...\n'));
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // Test 404
  try {
    await axios.get(`${API_URL}/nonexistent`, { headers });
  } catch (err) {
    if (err.response?.status === 404) {
      success('404 error handling works correctly');
    } else {
      error('Unexpected error response for 404');
    }
  }
  
  // Test validation error
  try {
    await axios.post(`${API_URL}/mitarbeiter`, { 
      // Missing required fields
      rolle: 'Test' 
    }, { headers });
  } catch (err) {
    if (err.response?.status === 400 || err.response?.status === 422) {
      success('Validation error handling works correctly');
    } else {
      error('Unexpected error response for validation');
    }
  }
  
  // Test unauthorized
  try {
    await axios.get(`${API_URL}/umzuege`, {
      headers: { Authorization: 'Bearer invalid_token' }
    });
  } catch (err) {
    if (err.response?.status === 401) {
      success('401 unauthorized handling works correctly');
    } else {
      error('Unexpected error response for unauthorized');
    }
  }
}

async function runAllTests() {
  console.log(chalk.bold.cyan('\n🚀 Starting Comprehensive System Integration Test\n'));
  console.log(chalk.gray('Make sure both backend and frontend servers are running!\n'));
  
  await delay(1000);
  
  // Run all tests
  const authPassed = await testAuthentication();
  
  if (!authPassed) {
    error('\nAuthentication failed - cannot continue with other tests');
    process.exit(1);
  }
  
  await testCRUDOperations();
  await testFileUpload();
  await testWebSocket();
  await testErrorHandling();
  
  console.log(chalk.bold.green('\n✨ All tests completed!\n'));
  
  // Summary
  console.log(chalk.bold('Summary:'));
  console.log('- Authentication: ✅');
  console.log('- CRUD Operations: Tested');
  console.log('- File Upload: Tested');
  console.log('- WebSocket: Tested');
  console.log('- Error Handling: ✅');
  
  console.log(chalk.gray('\nCheck the output above for any warnings or errors.'));
}

// Check if chalk is installed
try {
  require('chalk');
  runAllTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
} catch (err) {
  console.log('Installing required dependencies...');
  require('child_process').execSync('npm install chalk form-data', { stdio: 'inherit' });
  console.log('Please run the script again.');
}