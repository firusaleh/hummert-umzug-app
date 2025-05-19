// middleware/rateLimiter.js - Comprehensive rate limiting implementation
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { createHash } = require('crypto');

// Initialize Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 1,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('Rate limiter Redis connected');
});

redisClient.on('error', (err) => {
  console.error('Rate limiter Redis error:', err);
});

// Custom key generator for user-based rate limiting
const generateKey = (req) => {
  // For authenticated users, use user ID
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  
  // For unauthenticated users, use IP
  const ip = req.ip || req.connection.remoteAddress;
  return `ip:${ip}`;
};

// Advanced key generator with multiple factors
const generateAdvancedKey = (req, prefix = '') => {
  const factors = [];
  
  // User ID if authenticated
  if (req.user && req.user.id) {
    factors.push(`user:${req.user.id}`);
  }
  
  // IP address
  const ip = req.ip || req.connection.remoteAddress;
  factors.push(`ip:${ip}`);
  
  // User agent hash (to detect bot patterns)
  if (req.headers['user-agent']) {
    const uaHash = createHash('md5')
      .update(req.headers['user-agent'])
      .digest('hex')
      .substring(0, 8);
    factors.push(`ua:${uaHash}`);
  }
  
  // API key if present
  if (req.headers['x-api-key']) {
    factors.push(`api:${req.headers['x-api-key']}`);
  }
  
  return `${prefix}:${factors.join(':')}`;
};

// Skip rate limiting for whitelisted IPs
const skipWhitelisted = (req) => {
  const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check if IP is whitelisted
  if (whitelist.includes(ip)) {
    return true;
  }
  
  // Check if user is admin
  if (req.user && req.user.role === 'admin' && process.env.RATE_LIMIT_SKIP_ADMIN === 'true') {
    return true;
  }
  
  // Check for internal service token
  if (req.headers['x-internal-service'] === process.env.INTERNAL_SERVICE_TOKEN) {
    return true;
  }
  
  return false;
};

// Custom error handler with German messages
const errorHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      retryAfter: res.getHeader('Retry-After'),
      limit: res.getHeader('X-RateLimit-Limit'),
      remaining: res.getHeader('X-RateLimit-Remaining'),
      reset: res.getHeader('X-RateLimit-Reset')
    }
  });
};

// Rate limiter configurations
const configurations = {
  // Strict rate limiting for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => generateAdvancedKey(req, 'auth')
  },
  
  // Moderate rate limiting for general API
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'API-Limit überschritten. Bitte reduzieren Sie die Anzahl der Anfragen.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: generateKey
  },
  
  // File upload rate limiting
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Upload-Limit erreicht. Bitte warten Sie 15 Minuten.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: generateKey
  },
  
  // Financial operations rate limiting
  financial: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Zu viele Finanztransaktionen. Bitte warten Sie eine Stunde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: generateKey
  },
  
  // Public endpoints (more restrictive)
  public: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    message: 'Öffentliches API-Limit erreicht.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => generateAdvancedKey(req, 'public')
  },
  
  // Admin operations (less restrictive)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: 'Admin API-Limit erreicht.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: generateKey
  },
  
  // Password reset (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Zu viele Passwort-Zurücksetzungen. Bitte warten Sie eine Stunde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => generateAdvancedKey(req, 'reset')
  },
  
  // Email sending (prevent spam)
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'E-Mail-Limit erreicht. Bitte warten Sie eine Stunde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: generateKey
  }
};

// Create rate limiters with Redis store
const createRateLimiter = (config) => {
  return rateLimit({
    ...config,
    skip: skipWhitelisted,
    handler: errorHandler,
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    })
  });
};

// Export rate limiters
const rateLimiters = {
  auth: createRateLimiter(configurations.auth),
  api: createRateLimiter(configurations.api),
  upload: createRateLimiter(configurations.upload),
  financial: createRateLimiter(configurations.financial),
  public: createRateLimiter(configurations.public),
  admin: createRateLimiter(configurations.admin),
  passwordReset: createRateLimiter(configurations.passwordReset),
  email: createRateLimiter(configurations.email),
  
  // Dynamic rate limiter based on user role
  dynamic: (req, res, next) => {
    if (!req.user) {
      return rateLimiters.public(req, res, next);
    }
    
    switch (req.user.role) {
      case 'admin':
        return rateLimiters.admin(req, res, next);
      case 'mitarbeiter':
        return rateLimiters.api(req, res, next);
      default:
        return rateLimiters.public(req, res, next);
    }
  },
  
  // Custom rate limiter factory
  custom: (options) => createRateLimiter({ ...configurations.api, ...options })
};

// Rate limit status endpoint
const rateLimitStatus = async (req, res) => {
  try {
    const key = generateKey(req);
    const keys = await redisClient.keys(`rl:*${key}*`);
    const status = {};
    
    for (const redisKey of keys) {
      const value = await redisClient.get(redisKey);
      const parts = redisKey.split(':');
      const limitType = parts[1];
      status[limitType] = {
        count: parseInt(value) || 0,
        key: redisKey
      };
    }
    
    res.json({
      success: true,
      rateLimits: status,
      userKey: key
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Rate-Limit-Status'
    });
  }
};

// Clear rate limits for a specific key (admin function)
const clearRateLimits = async (req, res) => {
  try {
    const { key } = req.params;
    const keys = await redisClient.keys(`rl:*${key}*`);
    
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    
    res.json({
      success: true,
      message: `Rate-Limits für ${key} wurden zurückgesetzt`,
      clearedKeys: keys.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zurücksetzen der Rate-Limits'
    });
  }
};

module.exports = {
  rateLimiters,
  rateLimitStatus,
  clearRateLimits,
  redisClient
};