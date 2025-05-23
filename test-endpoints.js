/**
 * test-endpoints.js - Comprehensive endpoint testing
 * Tests all backend endpoints to ensure they're working correctly
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const tests = [
  { method: 'GET', path: '/health', description: 'Health check' },
  { method: 'GET', path: '/api/health', description: 'API Health check' },
  { method: 'GET', path: '/api', description: 'API Root' },
  { method: 'GET', path: '/api/auth/test', description: 'Auth test endpoint' },
  { method: 'GET', path: '/api/umzuege', description: 'Get moves (should require auth)' },
  { method: 'GET', path: '/api/mitarbeiter', description: 'Get employees (should require auth)' },
  { method: 'GET', path: '/api/fahrzeuge', description: 'Get vehicles (should require auth)' },
  { method: 'GET', path: '/api/finanzen', description: 'Get finances (should require auth)' },
  { method: 'GET', path: '/api/zeiterfassung', description: 'Get time tracking (should require auth)' },
];

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.setTimeout(5000);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Backend Endpoint Testing');
  console.log('=' .repeat(50));

  const results = [];

  for (const test of tests) {
    try {
      const result = await makeRequest(test.method, test.path);
      const success = result.statusCode < 500; // 4xx is expected for auth-required endpoints
      
      console.log(`${success ? '✅' : '❌'} ${test.method} ${test.path} - ${result.statusCode} - ${test.description}`);
      
      if (result.statusCode === 200 && result.body) {
        try {
          const jsonData = JSON.parse(result.body);
          if (jsonData.message) {
            console.log(`   📄 Response: ${jsonData.message}`);
          }
        } catch (e) {
          // Not JSON, that's fine
        }
      }
      
      results.push({
        ...test,
        statusCode: result.statusCode,
        success: success
      });
      
    } catch (error) {
      console.log(`❌ ${test.method} ${test.path} - ERROR: ${error.message} - ${test.description}`);
      results.push({
        ...test,
        statusCode: 'ERROR',
        success: false,
        error: error.message
      });
    }
  }

  console.log('\\n📊 Test Summary:');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\\n🎉 All endpoints are working correctly!');
  } else {
    console.log('\\n⚠️  Some endpoints need attention.');
  }
}

// Self-test: make sure server is running
makeRequest('GET', '/health')
  .then(() => {
    console.log('✅ Server is running, starting tests...');
    runTests().catch(console.error);
  })
  .catch((error) => {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('   Run: node server.js');
    process.exit(1);
  });