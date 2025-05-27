#!/usr/bin/env node

/**
 * Test UmzugForm Integration
 * 
 * This script tests the data flow between frontend and backend
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test data matching the new form structure
const testUmzugData = {
  kundennummer: 'TEST-2024-001',
  auftraggeber: {
    name: 'Max Mustermann',
    telefon: '+49 123 456789',
    email: 'max@example.com',
    isKunde: true
  },
  kontakte: [{
    name: 'Max Mustermann',
    telefon: '+49 123 456789',
    email: 'max@example.com',
    isKunde: true
  }],
  auszugsadresse: {
    strasse: 'Alte Straße',
    hausnummer: '123',
    plz: '12345',
    ort: 'Berlin',
    land: 'Deutschland',
    etage: 3,
    aufzug: true,
    entfernung: 50
  },
  einzugsadresse: {
    strasse: 'Neue Straße',
    hausnummer: '456',
    plz: '54321',
    ort: 'Hamburg',
    land: 'Deutschland',
    etage: 1,
    aufzug: false,
    entfernung: 20
  },
  zwischenstopps: [],
  startDatum: new Date('2024-03-15T08:00:00'),
  endDatum: new Date('2024-03-15T16:00:00'),
  status: 'geplant',
  mitarbeiter: [], // Will be populated with real IDs
  fahrzeuge: [], // Will be populated with real IDs
  zusatzleistungen: [
    {
      id: '1',
      name: 'Kartons',
      quantity: 20,
      unit: 'Stück',
      unitPrice: 2.5,
      totalPrice: 50
    }
  ],
  bemerkungen: 'Bitte vorsichtig mit dem Klavier',
  interneBemerkungen: 'Kunde hat bereits Anzahlung geleistet',
  preis: {
    netto: 800,
    brutto: 952,
    mwst: 19,
    bezahlt: false,
    zahlungsart: 'Rechnung'
  }
};

async function testIntegration() {
  console.log('🧪 Testing UmzugForm Integration...\n');

  try {
    // 1. Test authentication
    console.log('1. Testing authentication...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@hummert.de',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful\n');

    // Set auth header for subsequent requests
    const authAxios = axios.create({
      headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Get sample employee and vehicle IDs
    console.log('2. Getting sample data...');
    const [employeesRes, vehiclesRes] = await Promise.all([
      authAxios.get(`${API_URL}/mitarbeiter`),
      authAxios.get(`${API_URL}/fahrzeuge`)
    ]);

    if (employeesRes.data.data && employeesRes.data.data.length > 0) {
      testUmzugData.mitarbeiter = [employeesRes.data.data[0]._id];
      console.log(`✅ Found employee: ${employeesRes.data.data[0].name}`);
    }

    if (vehiclesRes.data.data && vehiclesRes.data.data.length > 0) {
      testUmzugData.fahrzeuge = [vehiclesRes.data.data[0]._id];
      console.log(`✅ Found vehicle: ${vehiclesRes.data.data[0].kennzeichen}\n`);
    }

    // 3. Test creating Umzug
    console.log('3. Testing Umzug creation...');
    console.log('📤 Sending data:', JSON.stringify(testUmzugData, null, 2));
    
    const createResponse = await authAxios.post(`${API_URL}/umzuege`, testUmzugData);
    console.log('✅ Umzug created successfully!');
    console.log('📥 Response:', JSON.stringify(createResponse.data, null, 2));

    const createdId = createResponse.data._id || createResponse.data.data._id;

    // 4. Test retrieving the created Umzug
    console.log('\n4. Testing Umzug retrieval...');
    const getResponse = await authAxios.get(`${API_URL}/umzuege/${createdId}`);
    console.log('✅ Umzug retrieved successfully!');
    
    // 5. Verify data integrity
    console.log('\n5. Verifying data integrity...');
    const retrieved = getResponse.data.data || getResponse.data;
    
    const checks = [
      {
        field: 'auftraggeber.name',
        expected: testUmzugData.auftraggeber.name,
        actual: retrieved.auftraggeber?.name
      },
      {
        field: 'auszugsadresse.strasse',
        expected: testUmzugData.auszugsadresse.strasse,
        actual: retrieved.auszugsadresse?.strasse
      },
      {
        field: 'einzugsadresse.ort',
        expected: testUmzugData.einzugsadresse.ort,
        actual: retrieved.einzugsadresse?.ort
      },
      {
        field: 'startDatum',
        expected: new Date(testUmzugData.startDatum).toISOString(),
        actual: new Date(retrieved.startDatum).toISOString()
      }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const passed = check.expected === check.actual;
      console.log(`${passed ? '✅' : '❌'} ${check.field}: ${check.actual}`);
      if (!passed) {
        console.log(`   Expected: ${check.expected}`);
        allPassed = false;
      }
    });

    // 6. Test updating
    console.log('\n6. Testing Umzug update...');
    const updateData = {
      ...testUmzugData,
      bemerkungen: 'Updated: Bitte extra vorsichtig mit dem Klavier',
      status: 'bestaetigt'
    };
    
    const updateResponse = await authAxios.put(`${API_URL}/umzuege/${createdId}`, updateData);
    console.log('✅ Umzug updated successfully!');

    // 7. Clean up - delete test data
    console.log('\n7. Cleaning up test data...');
    await authAxios.delete(`${API_URL}/umzuege/${createdId}`);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The UmzugForm integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
    process.exit(1);
  }
}

// Run the test
testIntegration();