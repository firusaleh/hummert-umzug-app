# Middleware Fixes Documentation

## Overview

All backend middleware has been enhanced with improved error handling, validation, and performance optimizations. This document outlines the fixes and improvements made to each middleware component.

## Fixed Middleware Components

### 1. Authentication Middleware (`auth.fixed.js`)

Enhanced authentication middleware with comprehensive error handling and security features.

**Key Improvements:**
- Token extraction from multiple sources (header, cookies, query)
- Detailed JWT error handling (expired, invalid, not before)
- User status validation (active, verified)
- Password change detection
- Role-based access control
- Ownership verification
- Rate limiting integration

**Features:**
- `protect` - Main authentication middleware
- `requireRole(...roles)` - Role-based access control
- `requireAdmin` - Admin-only access
- `requireEmployee` - Employee or admin access
- `requireOwnership` - Resource ownership verification
- `optionalAuth` - Optional authentication (doesn't fail)

**Example Usage:**
```javascript
// Protect route
router.get('/profile', authMiddleware.protect, (req, res) => {
  res.json(req.user);
});

// Role-based access
router.post('/admin/users', 
  authMiddleware.protect,
  authMiddleware.requireAdmin,
  createUser
);

// Resource ownership
router.put('/posts/:id',
  authMiddleware.protect,
  authMiddleware.requireOwnership('userId'),
  updatePost
);
```

### 2. Error Handling Middleware (`error.middleware.fixed.js`)

Comprehensive error handling with custom error classes and proper error responses.

**Key Improvements:**
- Custom error classes for different error types
- Request context in error logs
- Environment-specific error responses
- Error type transformation
- Integration with monitoring services
- CORS error handling

**Error Classes:**
- `AppError` - Base error class
- `ValidationError` - Input validation errors
- `AuthenticationError` - Auth failures
- `AuthorizationError` - Permission denied
- `NotFoundError` - Resource not found
- `ConflictError` - Conflict errors
- `RateLimitError` - Rate limit exceeded

**Features:**
- Development vs Production error responses
- MongoDB error handling
- JWT error handling
- Request logging
- Stack trace management

**Example Usage:**
```javascript
// In controller
if (!user) {
  throw new NotFoundError('User not found');
}

// In route
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);
```

### 3. Validation Middleware (`validation.fixed.js`)

Enhanced validation with German format support and custom validators.

**Key Improvements:**
- German format validation (postal codes, phone numbers)
- Custom sanitizers for security
- Comprehensive error formatting
- Grouped error messages
- Input sanitization
- File upload validation

**Custom Validators:**
- `isGermanPostalCode` - German PLZ validation
- `isGermanPhone` - German phone format
- `isObjectId` - MongoDB ObjectId
- `isNotPastDate` - Future date validation
- `isValidDateRange` - Date range validation
- `isValidWorkingHours` - Time range validation

**Validations:**
- User registration/login
- Employee management
- Move (Umzug) operations
- Survey (Aufnahme) data
- Time tracking
- Financial operations

**Example Usage:**
```javascript
router.post('/register',
  validationMiddleware.registerValidation,
  authController.register
);

router.post('/umzug',
  validationMiddleware.umzugValidation,
  umzugController.create
);
```

### 4. Pagination Middleware (`pagination.fixed.js`)

Advanced pagination with offset and cursor-based strategies.

**Key Improvements:**
- Parameter sanitization
- Error handling for invalid inputs
- Cursor validation
- Search and filter integration
- Sort validation
- Response helpers

**Features:**
- `paginateOffset` - Traditional page-based pagination
- `paginateCursor` - Cursor-based for infinite scroll
- `createOffsetPaginationResponse` - Response formatter
- `createCursorPaginationResponse` - Cursor response formatter
- `createSearchFilter` - Search query builder
- `createDateRangeFilter` - Date range filter
- `createFilterMiddleware` - Advanced filtering

**Example Usage:**
```javascript
// Offset pagination
router.get('/users',
  paginationMiddleware.paginateOffset({ 
    defaultLimit: 20,
    allowedSortFields: ['name', 'email', 'createdAt']
  }),
  async (req, res) => {
    const response = await createOffsetPaginationResponse(
      User.find(req.filters).sort(req.pagination.sort),
      User.countDocuments(req.filters),
      req
    );
    res.json(response);
  }
);

// Cursor pagination
router.get('/feed',
  paginationMiddleware.paginateCursor({ 
    defaultLimit: 10 
  }),
  async (req, res) => {
    const response = await createCursorPaginationResponse(
      Post.find(req.filters).sort(req.pagination.sort),
      req
    );
    res.json(response);
  }
);
```

### 5. Rate Limiting Middleware (`rateLimiter.fixed.js`)

Sophisticated rate limiting with Redis support and fallback mechanisms.

**Key Improvements:**
- Redis connection with fallback to memory
- Multiple key generation strategies
- Skip conditions for special cases
- Detailed error responses
- Monitoring endpoints
- Dynamic limits based on user role

**Configurations:**
- `auth` - Strict limits for authentication
- `api` - General API limits
- `upload` - File upload limits
- `financial` - Financial operation limits
- `passwordReset` - Password reset limits
- `strict` - Sensitive operation limits

**Features:**
- Redis store with memory fallback
- Advanced key generation
- Whitelist support
- Admin bypass option
- Health monitoring
- Rate limit status endpoints

**Example Usage:**
```javascript
// Authentication endpoint
router.post('/login',
  rateLimiterMiddleware.rateLimiters.auth,
  authController.login
);

// API endpoint with dynamic limits
router.get('/api/data',
  authMiddleware.protect,
  rateLimiterMiddleware.rateLimiters.dynamic,
  dataController.get
);

// Custom rate limiter
const customLimiter = rateLimiterMiddleware.rateLimiters.custom({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Custom limit exceeded'
});
```

## Common Patterns

### Error Handling Pattern
```javascript
router.post('/endpoint',
  authMiddleware.protect,
  validationMiddleware.someValidation,
  rateLimiterMiddleware.rateLimiters.api,
  async (req, res, next) => {
    try {
      // Controller logic
    } catch (error) {
      next(error); // Will be handled by error middleware
    }
  }
);
```

### Protected Route Pattern
```javascript
router.use(authMiddleware.protect); // Protect all routes below

router.get('/profile', getProfile);
router.put('/profile', 
  validationMiddleware.profileValidation,
  updateProfile
);
```

### Admin Route Pattern
```javascript
router.use(authMiddleware.protect);
router.use(authMiddleware.requireAdmin);
router.use(rateLimiterMiddleware.rateLimiters.admin);

router.get('/admin/users', getAllUsers);
router.delete('/admin/users/:id', deleteUser);
```

## Testing

Comprehensive test suite included for all middleware:

```javascript
npm test -- tests/middleware/middleware.test.js
```

Tests cover:
- Authentication scenarios
- Error handling cases
- Validation rules
- Pagination logic
- Rate limiting behavior

## Migration Guide

1. Update middleware imports:
```javascript
// Old
const { auth } = require('./middleware/auth');

// New
const authMiddleware = require('./middleware/auth.fixed');
```

2. Update route definitions:
```javascript
// Old
router.get('/users', auth, getUsers);

// New
router.get('/users', 
  authMiddleware.protect,
  paginationMiddleware.paginateOffset(),
  rateLimiterMiddleware.rateLimiters.api,
  getUsers
);
```

3. Update error handling:
```javascript
// Old
res.status(404).json({ error: 'Not found' });

// New
throw new NotFoundError('Resource not found');
```

## Environment Variables

Required environment variables for middleware:

```env
# JWT Configuration
JWT_SECRET=your-secret-key

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-password
REDIS_DB=1

# Rate Limiting
RATE_LIMIT_WHITELIST=127.0.0.1,::1
RATE_LIMIT_SKIP_ADMIN=true
INTERNAL_SERVICE_TOKEN=your-internal-token

# Environment
NODE_ENV=production
```

## Performance Considerations

1. **Redis Caching**: Rate limiter uses Redis for distributed systems
2. **Memory Fallback**: Automatic fallback to memory store if Redis fails
3. **Connection Pooling**: Efficient database connections
4. **Query Optimization**: Pagination limits and indexed queries

## Security Features

1. **Token Security**: JWT with expiration and refresh
2. **Input Sanitization**: XSS protection in validation
3. **Rate Limiting**: DoS protection
4. **Error Masking**: Production error responses hide sensitive data
5. **CORS Handling**: Proper CORS error responses

## Monitoring

Built-in monitoring endpoints:

```javascript
// Rate limit status
GET /api/monitoring/rate-limits

// Rate limit health
GET /api/monitoring/rate-limits/health

// Clear rate limits (admin only)
DELETE /api/monitoring/rate-limits/:key
```

## Best Practices

1. Always use appropriate middleware combination
2. Order matters: auth → validation → rate limit → handler
3. Use specific error classes for better error handling
4. Implement proper logging for production
5. Monitor rate limits and adjust as needed
6. Regular security audits of middleware configuration

## Conclusion

The enhanced middleware provides:
- Better security through proper authentication and validation
- Improved performance with pagination and rate limiting
- Comprehensive error handling
- German language support
- Production-ready monitoring

These improvements ensure the backend is robust, secure, and scalable for production use.