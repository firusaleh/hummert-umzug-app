// utils/validators/sanitizer.js
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

// Custom sanitizer functions
const sanitizer = {
  // Sanitize HTML/XSS from string
  sanitizeString: (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags and sanitize
    return xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  },
  
  // Sanitize object recursively
  sanitizeObject: (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizer.sanitizeString(obj[key]);
        } else if (Array.isArray(obj[key])) {
          sanitized[key] = sanitizer.sanitizeArray(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = sanitizer.sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }
    return sanitized;
  },
  
  // Sanitize array recursively
  sanitizeArray: (arr) => {
    if (!Array.isArray(arr)) return arr;
    
    return arr.map(item => {
      if (typeof item === 'string') {
        return sanitizer.sanitizeString(item);
      } else if (Array.isArray(item)) {
        return sanitizer.sanitizeArray(item);
      } else if (typeof item === 'object' && item !== null) {
        return sanitizer.sanitizeObject(item);
      } else {
        return item;
      }
    });
  },
  
  // Sanitize filename to prevent path traversal
  sanitizeFilename: (filename) => {
    if (typeof filename !== 'string') return '';
    
    // Remove path separators and other dangerous characters
    return filename
      .replace(/[\/\\]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 255); // Limit length
  },
  
  // Sanitize SQL input (basic prevention)
  sanitizeSQLInput: (input) => {
    if (typeof input !== 'string') return input;
    
    // Basic SQL injection prevention
    return input
      .replace(/'/g, "''")
      .replace(/--/g, '')
      .replace(/;/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },
  
  // Sanitize MongoDB operators
  sanitizeMongoQuery: (query) => {
    // Use express-mongo-sanitize for MongoDB operator injection prevention
    return mongoSanitize.sanitize(query, {
      replaceWith: '_'
    });
  },
  
  // Sanitize email
  sanitizeEmail: (email) => {
    if (typeof email !== 'string') return '';
    
    // Basic email sanitization
    return email
      .toLowerCase()
      .trim()
      .replace(/[<>]/g, '');
  },
  
  // Sanitize phone number
  sanitizePhone: (phone) => {
    if (typeof phone !== 'string') return '';
    
    // Keep only numbers and allowed characters
    return phone.replace(/[^0-9+\-\(\)\s]/g, '');
  },
  
  // Sanitize URL
  sanitizeURL: (url) => {
    if (typeof url !== 'string') return '';
    
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return '';
      }
      return urlObj.toString();
    } catch (e) {
      return '';
    }
  }
};

// Middleware to sanitize request data
const sanitizeMiddleware = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizer.sanitizeObject(req.body);
    req.body = sanitizer.sanitizeMongoQuery(req.body);
  }
  
  // Sanitize query
  if (req.query) {
    req.query = sanitizer.sanitizeObject(req.query);
    req.query = sanitizer.sanitizeMongoQuery(req.query);
  }
  
  // Sanitize params
  if (req.params) {
    req.params = sanitizer.sanitizeObject(req.params);
    req.params = sanitizer.sanitizeMongoQuery(req.params);
  }
  
  next();
};

module.exports = {
  sanitizer,
  sanitizeMiddleware
};