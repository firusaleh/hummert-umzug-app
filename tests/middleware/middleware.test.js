// tests/middleware/middleware.test.js - Comprehensive middleware tests
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Import middleware
const authMiddleware = require('../../middleware/auth.fixed');
const errorMiddleware = require('../../middleware/error.middleware.fixed');
const validationMiddleware = require('../../middleware/validation.fixed');
const paginationMiddleware = require('../../middleware/pagination.fixed');
const rateLimiterMiddleware = require('../../middleware/rateLimiter.fixed');

// Test setup
let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Setup test app
  app = express();
  app.use(express.json());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth Middleware Tests', () => {
  const testSecret = 'test-secret';
  process.env.JWT_SECRET = testSecret;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  describe('Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      const userId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: userId.toString() }, testSecret);
      
      // Mock user model
      const originalUser = require('../../models/user');
      jest.spyOn(originalUser, 'findById').mockResolvedValue({
        _id: userId,
        name: 'Test User',
        email: 'test@example.com',
        role: 'mitarbeiter',
        isActive: true
      });
      
      app.get('/protected', authMiddleware.protect, (req, res) => {
        res.json({ success: true, user: req.user });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    it('should reject invalid token', async () => {
      app.get('/protected', authMiddleware.protect, (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_TOKEN');
    });
    
    it('should reject expired token', async () => {
      const token = jwt.sign(
        { id: 'user123' },
        testSecret,
        { expiresIn: '-1h' }
      );
      
      app.get('/protected', authMiddleware.protect, (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TOKEN_EXPIRED');
    });
  });
  
  describe('Role-based Access', () => {
    it('should allow admin access to admin routes', async () => {
      const userId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: userId.toString() }, testSecret);
      
      // Mock admin user
      const originalUser = require('../../models/user');
      jest.spyOn(originalUser, 'findById').mockResolvedValue({
        _id: userId,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true
      });
      
      app.get('/admin', 
        authMiddleware.protect,
        authMiddleware.requireAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
    
    it('should deny non-admin access to admin routes', async () => {
      const userId = new mongoose.Types.ObjectId();
      const token = jwt.sign({ id: userId.toString() }, testSecret);
      
      // Mock regular user
      const originalUser = require('../../models/user');
      jest.spyOn(originalUser, 'findById').mockResolvedValue({
        _id: userId,
        name: 'Regular User',
        email: 'user@example.com',
        role: 'mitarbeiter',
        isActive: true
      });
      
      app.get('/admin', 
        authMiddleware.protect,
        authMiddleware.requireAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ADMIN_REQUIRED');
    });
  });
});

describe('Error Middleware Tests', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  it('should handle 404 errors', async () => {
    app.use(errorMiddleware.notFound);
    app.use(errorMiddleware.errorHandler);
    
    const response = await request(app)
      .get('/non-existent-route')
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('NOT_FOUND');
  });
  
  it('should handle validation errors', async () => {
    app.post('/test', (req, res, next) => {
      const error = new errorMiddleware.ValidationError('Invalid input', [
        { field: 'email', message: 'Invalid email format' }
      ]);
      next(error);
    });
    
    app.use(errorMiddleware.errorHandler);
    
    const response = await request(app)
      .post('/test')
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    expect(response.body.errors).toHaveLength(1);
  });
  
  it('should handle unexpected errors in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    app.get('/test', (req, res, next) => {
      // Simulate unexpected error
      const error = new Error('Database connection failed');
      error.isOperational = false;
      next(error);
    });
    
    app.use(errorMiddleware.errorHandler);
    
    const response = await request(app)
      .get('/test')
      .expect(500);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Ein unerwarteter Fehler ist aufgetreten');
    expect(response.body.stack).toBeUndefined(); // Stack should not be exposed
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Validation Middleware Tests', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  describe('Registration Validation', () => {
    it('should validate valid registration data', async () => {
      app.post('/register', 
        validationMiddleware.registerValidation,
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .post('/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: 'mitarbeiter'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
    
    it('should reject invalid email', async () => {
      app.post('/register', 
        validationMiddleware.registerValidation,
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .post('/register')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'SecurePass123'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errorsByField.email).toBeDefined();
    });
    
    it('should reject weak password', async () => {
      app.post('/register', 
        validationMiddleware.registerValidation,
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .post('/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'weak'
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errorsByField.password).toBeDefined();
    });
  });
  
  describe('Custom Validators', () => {
    it('should validate German postal code', () => {
      const isValid = validationMiddleware.customValidators.isGermanPostalCode('12345');
      expect(isValid).toBe(true);
      
      const isInvalid = validationMiddleware.customValidators.isGermanPostalCode('1234');
      expect(isInvalid).toBe(false);
    });
    
    it('should validate German phone number', () => {
      const validNumbers = [
        '+4915112345678',
        '015112345678',
        '089123456'
      ];
      
      validNumbers.forEach(number => {
        expect(validationMiddleware.customValidators.isGermanPhone(number)).toBe(true);
      });
      
      const invalidNumbers = ['123', 'abc', '+1234567890'];
      invalidNumbers.forEach(number => {
        expect(validationMiddleware.customValidators.isGermanPhone(number)).toBe(false);
      });
    });
  });
});

describe('Pagination Middleware Tests', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  describe('Offset Pagination', () => {
    it('should parse valid pagination parameters', async () => {
      app.get('/test', 
        paginationMiddleware.paginateOffset(),
        (req, res) => {
          res.json(req.pagination);
        }
      );
      
      const response = await request(app)
        .get('/test?page=2&limit=20&sortBy=name:desc')
        .expect(200);
      
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(20);
      expect(response.body.skip).toBe(20);
      expect(response.body.sort.name).toBe(-1);
    });
    
    it('should use defaults for invalid parameters', async () => {
      app.get('/test', 
        paginationMiddleware.paginateOffset({ defaultLimit: 15 }),
        (req, res) => {
          res.json(req.pagination);
        }
      );
      
      const response = await request(app)
        .get('/test?page=invalid&limit=invalid')
        .expect(200);
      
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(15);
      expect(response.body.skip).toBe(0);
    });
    
    it('should enforce max limit', async () => {
      app.get('/test', 
        paginationMiddleware.paginateOffset({ maxLimit: 50 }),
        (req, res) => {
          res.json(req.pagination);
        }
      );
      
      const response = await request(app)
        .get('/test?limit=100')
        .expect(200);
      
      expect(response.body.limit).toBe(50);
    });
  });
  
  describe('Cursor Pagination', () => {
    it('should parse cursor parameters', async () => {
      const cursor = Buffer.from(JSON.stringify({
        value: '2023-01-01',
        id: '507f1f77bcf86cd799439011'
      })).toString('base64');
      
      app.get('/test', 
        paginationMiddleware.paginateCursor(),
        (req, res) => {
          res.json(req.pagination);
        }
      );
      
      const response = await request(app)
        .get(`/test?cursor=${cursor}&direction=next`)
        .expect(200);
      
      expect(response.body.cursor).toBe(cursor);
      expect(response.body.direction).toBe('next');
      expect(response.body.cursorFilter).toBeDefined();
    });
    
    it('should handle invalid cursor gracefully', async () => {
      app.get('/test', 
        paginationMiddleware.paginateCursor(),
        (req, res) => {
          res.json({ success: true });
        }
      );
      
      const response = await request(app)
        .get('/test?cursor=invalid-cursor')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('PAGINATION_ERROR');
    });
  });
});

describe('Rate Limiter Middleware Tests', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });
  
  it('should create rate limiter with correct configuration', () => {
    const limiter = rateLimiterMiddleware.rateLimiters.api;
    expect(limiter).toBeDefined();
  });
  
  it('should skip rate limiting for whitelisted conditions', () => {
    const req = {
      user: { role: 'admin' },
      ip: '127.0.0.1'
    };
    
    process.env.RATE_LIMIT_SKIP_ADMIN = 'true';
    const shouldSkip = rateLimiterMiddleware.skipConditions.isAdmin(req);
    expect(shouldSkip).toBe(true);
  });
  
  it('should generate correct keys', () => {
    const req = {
      user: { id: 'user123' },
      ip: '192.168.1.1'
    };
    
    const userKey = rateLimiterMiddleware.keyGenerators.byUser(req);
    expect(userKey).toBe('user:user123');
    
    const ipKey = rateLimiterMiddleware.keyGenerators.byIP({ ip: '192.168.1.1' });
    expect(ipKey).toBe('ip:192.168.1.1');
  });
  
  it('should handle rate limit errors properly', async () => {
    const error = new rateLimiterMiddleware.RateLimitError('Too many requests', 429, 60000);
    
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBe(60000);
    expect(error.name).toBe('RateLimitError');
  });
});