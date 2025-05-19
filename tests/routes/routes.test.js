// tests/routes/routes.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('../../routes/auth.routes.fixed');
const umzugRoutes = require('../../routes/umzuege.routes.fixed');
const mitarbeiterRoutes = require('../../routes/mitarbeiter.routes.fixed');
const aufnahmeRoutes = require('../../routes/aufnahme.routes.fixed');
const userRoutes = require('../../routes/user.routes.fixed');

// Mock middleware
jest.mock('../../middleware/auth', () => ({
  auth: (req, res, next) => {
    if (req.headers.authorization) {
      req.user = { _id: 'testUserId', role: 'admin' };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  },
  admin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  },
  authorize: (...roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  }
}));

// Mock controllers
jest.mock('../../controllers/auth.controller', () => ({
  register: jest.fn((req, res) => res.status(201).json({ success: true })),
  login: jest.fn((req, res) => res.status(200).json({ token: 'test-token' })),
  getMe: jest.fn((req, res) => res.status(200).json({ user: req.user }))
}));

jest.mock('../../controllers/umzug.controller', () => ({
  getAllUmzuege: jest.fn((req, res) => res.status(200).json({ umzuege: [] })),
  getUmzugById: jest.fn((req, res) => res.status(200).json({ umzug: {} })),
  createUmzug: jest.fn((req, res) => res.status(201).json({ umzug: {} })),
  updateUmzug: jest.fn((req, res) => res.status(200).json({ umzug: {} })),
  deleteUmzug: jest.fn((req, res) => res.status(204).send())
}));

// Mock error handler
jest.mock('../../middleware/error.middleware', () => ({
  asyncHandler: (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }
}));

// Test setup
let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  app = express();
  app.use(express.json());
  
  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/umzuege', umzugRoutes);
  app.use('/api/mitarbeiter', mitarbeiterRoutes);
  app.use('/api/aufnahmen', aufnahmeRoutes);
  app.use('/api/users', userRoutes);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  });
});

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
    
    it('should fail with invalid email', async () => {
      const newUser = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail with weak password', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
    
    it('should fail with missing password', async () => {
      const credentials = {
        email: 'test@example.com'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });
    
    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
    });
  });
});

describe('Umzug Routes', () => {
  const authHeader = { Authorization: 'Bearer test-token' };
  
  describe('GET /api/umzuege', () => {
    it('should get all moves with pagination', async () => {
      const response = await request(app)
        .get('/api/umzuege?page=1&limit=10')
        .set(authHeader);
      
      expect(response.status).toBe(200);
      expect(response.body.umzuege).toBeDefined();
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/umzuege');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/umzuege', () => {
    it('should create move with valid data', async () => {
      const newMove = {
        auftraggeber: {
          name: 'Test Kunde',
          telefon: '+49 123 456789'
        },
        auszugsadresse: {
          strasse: 'Teststraße',
          hausnummer: '123',
          plz: '12345',
          ort: 'Teststadt'
        },
        einzugsadresse: {
          strasse: 'Neue Straße',
          hausnummer: '456',
          plz: '67890',
          ort: 'Neustadt'
        },
        startDatum: new Date(Date.now() + 86400000).toISOString(),
        endDatum: new Date(Date.now() + 172800000).toISOString()
      };
      
      const response = await request(app)
        .post('/api/umzuege')
        .set(authHeader)
        .send(newMove);
      
      expect(response.status).toBe(201);
      expect(response.body.umzug).toBeDefined();
    });
    
    it('should fail with invalid data', async () => {
      const invalidMove = {
        auftraggeber: {
          name: 'Test'
          // Missing phone
        },
        // Missing addresses
        startDatum: 'invalid-date'
      };
      
      const response = await request(app)
        .post('/api/umzuege')
        .set(authHeader)
        .send(invalidMove);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('GET /api/umzuege/:id', () => {
    it('should get move by ID', async () => {
      const moveId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/umzuege/${moveId}`)
        .set(authHeader);
      
      expect(response.status).toBe(200);
      expect(response.body.umzug).toBeDefined();
    });
    
    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/umzuege/invalid-id')
        .set(authHeader);
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});

describe('Validation Middleware', () => {
  it('should validate German phone numbers', async () => {
    const testCases = [
      { phone: '+49 123 456789', valid: true },
      { phone: '0123456789', valid: true },
      { phone: '123456', valid: false },
      { phone: 'invalid', valid: false }
    ];
    
    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'SecurePass123!',
          phone: testCase.phone
        });
      
      if (testCase.valid) {
        expect(response.status).not.toBe(400);
      } else {
        expect(response.status).toBe(400);
      }
    }
  });
  
  it('should validate German postal codes', async () => {
    const testCases = [
      { plz: '12345', valid: true },
      { plz: '00000', valid: true },
      { plz: '1234', valid: false },
      { plz: '123456', valid: false },
      { plz: 'abcde', valid: false }
    ];
    
    for (const testCase of testCases) {
      const move = {
        auftraggeber: {
          name: 'Test',
          telefon: '0123456789'
        },
        auszugsadresse: {
          strasse: 'Test',
          hausnummer: '1',
          plz: testCase.plz,
          ort: 'Test'
        },
        einzugsadresse: {
          strasse: 'Test',
          hausnummer: '2',
          plz: '12345',
          ort: 'Test'
        },
        startDatum: new Date(Date.now() + 86400000).toISOString(),
        endDatum: new Date(Date.now() + 172800000).toISOString()
      };
      
      const response = await request(app)
        .post('/api/umzuege')
        .set({ Authorization: 'Bearer test-token' })
        .send(move);
      
      if (testCase.valid) {
        expect(response.status).not.toBe(400);
      } else {
        expect(response.status).toBe(400);
      }
    }
  });
});

describe('Error Handling', () => {
  it('should handle 404 errors', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .set({ Authorization: 'Bearer test-token' });
    
    expect(response.status).toBe(404);
  });
  
  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid' });
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(Array.isArray(response.body.errors)).toBe(true);
  });
  
  it('should handle authentication errors', async () => {
    const response = await request(app)
      .get('/api/umzuege')
      .set({ Authorization: 'Bearer invalid-token' });
    
    expect(response.status).toBe(401);
  });
  
  it('should handle authorization errors', async () => {
    const userToken = jwt.sign({ _id: 'userId', role: 'helfer' }, 'secret');
    
    const response = await request(app)
      .post('/api/umzuege')
      .set({ Authorization: `Bearer ${userToken}` })
      .send({});
    
    expect(response.status).toBe(403);
  });
});