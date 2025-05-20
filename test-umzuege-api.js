// Test file for Umzuege API
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = '';

// Helper function to make API calls
const apiCall = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
};

// Test functions
const testAuth = async () => {
  console.log('Testing authentication...');
  const loginData = {
    email: 'test@example.com',
    password: 'password123'
  };
  
  const response = await apiCall('POST', '/auth/login', loginData);
  authToken = response.token;
  console.log('Authentication successful');
  return authToken;
};

const testCreateUmzug = async () => {
  console.log('Testing Umzug creation...');
  const umzugData = {
    kundennummer: 'KN-2024-001',
    auftraggeber: {
      name: 'Max Mustermann',
      telefon: '+49 123 4567890',
      email: 'max@example.com'
    },
    kontakte: [],
    auszugsadresse: {
      strasse: 'Alte Straße',
      hausnummer: '10',
      plz: '12345',
      ort: 'Berlin',
      land: 'Deutschland',
      etage: 2,
      aufzug: true
    },
    einzugsadresse: {
      strasse: 'Neue Straße',
      hausnummer: '20',
      plz: '54321',
      ort: 'Hamburg',
      land: 'Deutschland',
      etage: 1,
      aufzug: false
    },
    startDatum: new Date('2024-06-01'),
    endDatum: new Date('2024-06-02'),
    status: 'geplant',
    preis: {
      netto: 1000,
      brutto: 1190,
      mwst: 19,
      bezahlt: false,
      zahlungsart: 'rechnung'
    },
    fahrzeuge: [
      {
        typ: 'LKW 7.5t',
        kennzeichen: 'B-UM-123'
      }
    ],
    mitarbeiter: []
  };
  
  const response = await apiCall('POST', '/umzuege', umzugData);
  console.log('Umzug created:', response.umzug._id);
  return response.umzug._id;
};

const testGetAllUmzuege = async () => {
  console.log('Testing get all Umzuege...');
  const response = await apiCall('GET', '/umzuege?page=1&limit=10');
  console.log(`Found ${response.data.length} Umzuege`);
  console.log('Pagination:', response.pagination);
};

const testGetUmzugById = async (id) => {
  console.log(`Testing get Umzug by ID: ${id}...`);
  const response = await apiCall('GET', `/umzuege/${id}`);
  console.log('Umzug found:', response.kundennummer);
};

const testUpdateUmzug = async (id) => {
  console.log(`Testing update Umzug: ${id}...`);
  const updateData = {
    status: 'bestaetigt',
    preis: {
      netto: 1200,
      brutto: 1428,
      mwst: 19,
      bezahlt: false,
      zahlungsart: 'rechnung'
    }
  };
  
  const response = await apiCall('PUT', `/umzuege/${id}`, updateData);
  console.log('Umzug updated:', response.message);
};

const testAddTask = async (umzugId) => {
  console.log(`Testing add task to Umzug: ${umzugId}...`);
  const taskData = {
    beschreibung: 'Kartons packen',
    faelligkeit: new Date('2024-05-30'),
    prioritaet: 'hoch'
  };
  
  const response = await apiCall('POST', `/umzuege/${umzugId}/task`, taskData);
  console.log('Task added:', response.message);
};

const testAddNotiz = async (umzugId) => {
  console.log(`Testing add Notiz to Umzug: ${umzugId}...`);
  const notizData = {
    text: 'Kunde möchte spezielle Verpackung für Antiquitäten'
  };
  
  const response = await apiCall('POST', `/umzuege/${umzugId}/notiz`, notizData);
  console.log('Notiz added:', response.message);
};

const testDeleteUmzug = async (id) => {
  console.log(`Testing delete Umzug: ${id}...`);
  const response = await apiCall('DELETE', `/umzuege/${id}`);
  console.log('Umzug deleted:', response.message);
};

// Main test runner
const runTests = async () => {
  try {
    console.log('Starting Umzuege API tests...\n');
    
    // Authenticate
    await testAuth();
    
    // Create a new Umzug
    const umzugId = await testCreateUmzug();
    
    // Get all Umzuege
    await testGetAllUmzuege();
    
    // Get specific Umzug
    await testGetUmzugById(umzugId);
    
    // Update the Umzug
    await testUpdateUmzug(umzugId);
    
    // Add a task
    await testAddTask(umzugId);
    
    // Add a note
    await testAddNotiz(umzugId);
    
    // Delete the Umzug
    await testDeleteUmzug(umzugId);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };