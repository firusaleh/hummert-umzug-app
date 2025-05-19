// tests/utils/test-helpers.js
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const Umzug = require('../../models/umzug.model');
const Mitarbeiter = require('../../models/mitarbeiter.model');

/**
 * Generate a valid JWT token for testing
 */
exports.generateTestToken = (userId = 'testUserId', role = 'mitarbeiter') => {
  const payload = {
    id: userId,
    name: 'Test User',
    email: 'test@example.com',
    role
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test_secret', {
    expiresIn: '1d'
  });
};

/**
 * Create a test user
 */
exports.createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'mitarbeiter'
  };

  const userData = { ...defaultUser, ...overrides };
  const user = await User.create(userData);
  
  // Generate token for the user
  const token = exports.generateTestToken(user._id, user.role);
  
  return { user, token };
};

/**
 * Create a test Umzug
 */
exports.createTestUmzug = async (overrides = {}) => {
  const defaultUmzug = {
    kundennummer: 'K001',
    auftraggeber: {
      name: 'Test Customer',
      telefon: '+49123456789',
      email: 'customer@example.com'
    },
    startDatum: new Date('2024-01-20'),
    endDatum: new Date('2024-01-21'),
    status: 'geplant',
    auszugsadresse: {
      strasse: 'Test Street 1',
      hausnummer: '1',
      plz: '12345',
      ort: 'Test City',
      etage: '2',
      aufzug: true
    },
    einzugsadresse: {
      strasse: 'Test Street 2',
      hausnummer: '2',
      plz: '54321',
      ort: 'Another City',
      etage: '3',
      aufzug: false
    },
    preis: {
      netto: 1000,
      brutto: 1190,
      mwst: 19
    }
  };

  const umzugData = { ...defaultUmzug, ...overrides };
  return Umzug.create(umzugData);
};

/**
 * Create a test Mitarbeiter
 */
exports.createTestMitarbeiter = async (overrides = {}) => {
  const defaultMitarbeiter = {
    vorname: 'John',
    nachname: 'Doe',
    telefon: '+49123456789',
    email: 'john.doe@example.com',
    position: 'Fahrer',
    einstellungsdatum: new Date('2024-01-01'),
    faehigkeiten: ['LKW-Führerschein'],
    fuehrerscheinklassen: ['B', 'C'],
    isActive: true,
    userId: null
  };

  const mitarbeiterData = { ...defaultMitarbeiter, ...overrides };
  return Mitarbeiter.create(mitarbeiterData);
};

/**
 * Assert response structure
 */
exports.assertSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).to.equal(statusCode);
  expect(response.body.success).to.be.true;
  expect(response.body.timestamp).to.exist;
};

exports.assertErrorResponse = (response, statusCode = 400) => {
  expect(response.status).to.equal(statusCode);
  expect(response.body.success).to.be.false;
  expect(response.body.message).to.exist;
  expect(response.body.timestamp).to.exist;
};

/**
 * Create mock request object
 */
exports.createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  };
};

/**
 * Create mock response object
 */
exports.createMockResponse = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);
  res.end = sinon.stub().returns(res);
  return res;
};

/**
 * Create mock next function
 */
exports.createMockNext = () => sinon.stub();

/**
 * Wait for async operations
 */
exports.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean all test data
 */
exports.cleanupTestData = async () => {
  await User.deleteMany({});
  await Umzug.deleteMany({});
  await Mitarbeiter.deleteMany({});
  // Add other models as needed
};

/**
 * Setup test database connection
 */
exports.setupTestDatabase = async () => {
  // This would be called in before hooks
  const { setup } = require('../setup');
  await setup();
};

/**
 * Teardown test database connection
 */
exports.teardownTestDatabase = async () => {
  // This would be called in after hooks
  const { teardown } = require('../setup');
  await teardown();
};