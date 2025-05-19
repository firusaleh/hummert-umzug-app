// utils/validators/security.js
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Security utilities
const security = {
  // Generate secure random token
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },
  
  // Hash sensitive data
  hashData: (data, salt = crypto.randomBytes(16).toString('hex')) => {
    const hash = crypto
      .createHmac('sha256', salt)
      .update(data)
      .digest('hex');
    return { hash, salt };
  },
  
  // Verify hashed data
  verifyHash: (data, hash, salt) => {
    const verifyHash = crypto
      .createHmac('sha256', salt)
      .update(data)
      .digest('hex');
    return verifyHash === hash;
  },
  
  // Encrypt sensitive data
  encrypt: (text, key = process.env.ENCRYPTION_KEY || 'default-key') => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(crypto.createHash('sha256').update(key).digest()),
      iv
    );
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  },
  
  // Decrypt sensitive data
  decrypt: (text, key = process.env.ENCRYPTION_KEY || 'default-key') => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(crypto.createHash('sha256').update(key).digest()),
      iv
    );
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  },
  
  // Mask sensitive data for logging
  maskSensitiveData: (data) => {
    if (typeof data !== 'object' || data === null) return data;
    
    const sensitiveFields = [
      'password', 'passwort', 'token', 'secret', 'key', 
      'iban', 'creditCard', 'kreditkarte', 'bank',
      'sozialversicherungsnummer', 'ssn'
    ];
    
    const masked = { ...data };
    
    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof masked[key] === 'string' && masked[key].length > 0) {
          masked[key] = masked[key].substring(0, 4) + '****';
        } else {
          masked[key] = '****';
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = security.maskSensitiveData(masked[key]);
      }
    }
    
    return masked;
  }
};

// Rate limiting configurations
const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  // Strict rate limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Zu viele Anmeldeversuche, bitte versuchen Sie es später erneut.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  }),
  
  // Rate limit for file uploads
  upload: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per window
    message: 'Zu viele Uploads, bitte versuchen Sie es später erneut.',
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  // Rate limit for financial operations
  financial: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per window
    message: 'Zu viele Finanzoperationen, bitte versuchen Sie es später erneut.',
    standardHeaders: true,
    legacyHeaders: false,
  })
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

module.exports = {
  security,
  rateLimiters,
  securityHeaders,
  corsOptions
};