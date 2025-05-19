# Secure JWT Authentication Implementation

This implementation provides a secure JWT authentication system for the LagerLogix backend with industry best practices.

## 🔐 Security Features

### 1. Dual Token System
- **Access Token**: Short-lived (15 minutes) for API authentication
- **Refresh Token**: Long-lived (7 days) for obtaining new access tokens
- Separate secrets for each token type
- Token rotation on refresh

### 2. Token Storage
- Secure HTTP-only cookies for both tokens
- SameSite protection against CSRF
- Secure flag in production
- Proper expiration handling

### 3. Token Management
- Token blacklisting for immediate revocation
- Database-backed refresh tokens
- Session tracking across devices
- Automatic cleanup of expired tokens

### 4. Security Measures
- Rate limiting on authentication endpoints
- CSRF protection with tokens
- Strong password requirements
- Secure password hashing with bcrypt
- Environment-specific configuration

### 5. Security Headers
- Helmet.js integration
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- XSS Protection
- Frame Options

## 📁 File Structure

```
backend/
├── config/
│   ├── jwt.config.js          # JWT configuration
│   └── security-headers.js    # Security headers setup
├── controllers/
│   └── auth.secure.controller.js  # Secure auth controller
├── middleware/
│   └── auth.secure.js         # Secure auth middleware
├── models/
│   └── token.model.js         # Token storage model
├── routes/
│   └── auth.secure.routes.js  # Secure auth routes
├── services/
│   └── token.service.js       # Token management service
└── utils/
    └── token-cleanup.js       # Token cleanup utility
```

## 🚀 Implementation Guide

### 1. Install Required Dependencies

```bash
npm install express-rate-limit express-session
```

### 2. Update Environment Variables

Copy `.env.example` to `.env` and update:

```env
# Generate secure secrets
JWT_ACCESS_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 32)
```

### 3. Update Server Configuration

```javascript
// server.js
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { getSecurityHeaders, corsOptions } = require('./config/security-headers');
const TokenCleanup = require('./utils/token-cleanup');

// Security headers
app.use(getSecurityHeaders(process.env.NODE_ENV === 'development'));

// CORS with credentials
app.use(cors(corsOptions));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Start token cleanup service
TokenCleanup.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  TokenCleanup.stop();
  // ... other cleanup
});
```

### 4. Update Routes

```javascript
// routes/index.js
const authSecureRoutes = require('./auth.secure.routes');

// Replace old auth routes with secure ones
app.use('/api/auth', authSecureRoutes);
```

### 5. Update Frontend Authentication

```javascript
// Frontend API calls
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add CSRF token to requests
api.interceptors.request.use(config => {
  const csrfToken = getCsrfToken(); // Get from cookie or state
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await api.post('/auth/refresh-token');
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

## 🔒 Best Practices Implemented

### Token Security
- ✅ Separate secrets for access and refresh tokens
- ✅ Short expiration times for access tokens
- ✅ Secure token storage in HTTP-only cookies
- ✅ Token blacklisting for revocation
- ✅ Device tracking for sessions

### Password Security
- ✅ Minimum 8 characters with complexity requirements
- ✅ Bcrypt hashing with proper salt rounds
- ✅ Password reset tokens with expiration
- ✅ No password in API responses

### API Security
- ✅ Rate limiting on authentication endpoints
- ✅ CSRF protection
- ✅ Input validation and sanitization
- ✅ Proper error messages (no information leakage)
- ✅ Security headers (Helmet.js)

### Infrastructure Security
- ✅ Environment-specific configuration
- ✅ Secure defaults for production
- ✅ Proper CORS configuration
- ✅ Session management
- ✅ Automatic token cleanup

## 🔄 Migration from Current Implementation

1. **Database Migration**
   ```javascript
   // Add Token collection indexes
   db.tokens.createIndex({ token: 1 });
   db.tokens.createIndex({ userId: 1, type: 1 });
   db.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
   ```

2. **Update User Model**
   - Already includes necessary fields
   - Add email verification fields if needed

3. **Update Middleware**
   ```javascript
   // Replace auth.js with auth.secure.js
   const { authenticate, authorize } = require('./middleware/auth.secure');
   ```

4. **Update Controllers**
   ```javascript
   // Replace auth.controller.js with auth.secure.controller.js
   const AuthController = require('./controllers/auth.secure.controller');
   ```

## 🧪 Testing

### Manual Testing
1. Test registration with various passwords
2. Test login with remember me option
3. Test token refresh after expiration
4. Test logout from single/all devices
5. Test rate limiting

### Automated Testing
```javascript
// Example test
describe('Auth Security', () => {
  it('should enforce rate limiting', async () => {
    for (let i = 0; i < 6; i++) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      
      if (i < 5) {
        expect(response.status).toBe(401);
      } else {
        expect(response.status).toBe(429);
      }
    }
  });
});
```

## 🚨 Security Considerations

1. **Production Requirements**
   - Use strong, unique secrets
   - Enable HTTPS
   - Configure proper CORS origins
   - Set secure cookie flags
   - Monitor failed login attempts

2. **Secret Rotation**
   - Rotate JWT secrets periodically
   - Implement key versioning for smooth transitions
   - Update all instances in cluster

3. **Monitoring**
   - Log authentication events
   - Monitor for brute force attempts
   - Track token usage patterns
   - Alert on security anomalies

## 📚 Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS_ORIGIN in .env
   - Ensure credentials: true in frontend

2. **Cookie Not Set**
   - Check secure flag in development
   - Verify SameSite settings

3. **Token Expired Loops**
   - Check refresh token logic
   - Verify token cleanup service

4. **Rate Limiting Issues**
   - Adjust limits for your use case
   - Consider IP whitelisting for tests