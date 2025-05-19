// config/security.js
const helmet = require('helmet');
const { sanitizeMiddleware } = require('../utils/validators/sanitizer');
const { securityHeaders, corsOptions } = require('../utils/validators/security');

const configureSecurityMiddleware = (app) => {
  // Helmet for basic security headers
  app.use(helmet({
    contentSecurityPolicy: false, // We're using our custom CSP
    crossOriginEmbedderPolicy: false
  }));
  
  // Custom security headers
  app.use(securityHeaders);
  
  // Sanitize all incoming data
  app.use(sanitizeMiddleware);
  
  // Prevent parameter pollution
  app.use((req, res, next) => {
    // Convert arrays to single values for non-array fields
    const singleValueFields = ['id', 'email', 'password', 'token'];
    
    for (const field of singleValueFields) {
      if (req.query[field] && Array.isArray(req.query[field])) {
        req.query[field] = req.query[field][0];
      }
      if (req.body && req.body[field] && Array.isArray(req.body[field])) {
        req.body[field] = req.body[field][0];
      }
    }
    
    next();
  });
  
  // Log security events
  app.use((req, res, next) => {
    // Log suspicious activity
    const suspiciousPatterns = [
      /(\.\.|\/\/)/,  // Path traversal
      /<script/i,      // XSS attempts
      /union.*select/i, // SQL injection
      /\$where/i,      // MongoDB injection
      /\$ne/i          // MongoDB operators
    ];
    
    const checkString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        console.warn(`[SECURITY] Suspicious pattern detected from IP ${req.ip}: ${pattern}`);
      }
    }
    
    next();
  });
};

module.exports = configureSecurityMiddleware;