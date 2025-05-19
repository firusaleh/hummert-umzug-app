// middleware/rateLimiter.fixed.js - Enhanced rate limiting with better error handling
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { createHash } = require('crypto');

// Rate limiter error class
class RateLimitError extends Error {
  constructor(message, statusCode = 429, retryAfter = null) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

// Redis connection factory with error handling
class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  connect() {
    if (this.client) return this.client;

    const options = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 1,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > this.maxRetries) {
          console.error('Max Redis connection retries reached');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    };

    this.client = new Redis(options);

    // Connection event handlers
    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('Rate limiter Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('Rate limiter Redis error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('Rate limiter Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.connectionAttempts++;
      console.log(`Rate limiter Redis reconnecting... Attempt ${this.connectionAttempts}`);
    });

    return this.client;
  }

  isHealthy() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  async ping() {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Initialize Redis connection
const redisConnection = new RedisConnection();
const redisClient = redisConnection.connect();

// Fallback to memory store if Redis is not available
const memoryStore = new Map();
const memoryStoreFallback = {
  async incr(key) {
    const current = memoryStore.get(key) || 0;
    const incremented = current + 1;
    memoryStore.set(key, incremented);
    return incremented;
  },
  
  async get(key) {
    return memoryStore.get(key) || 0;
  },
  
  async del(key) {
    return memoryStore.delete(key);
  },
  
  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(memoryStore.keys()).filter(key => regex.test(key));
  },
  
  async expire(key, seconds) {
    setTimeout(() => {
      memoryStore.delete(key);
    }, seconds * 1000);
    return 1;
  }
};

// Smart key generator with multiple strategies
const keyGenerators = {
  // Basic IP-based key
  byIP: (req) => {
    const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
    return `ip:${ip}`;
  },
  
  // User-based key for authenticated requests
  byUser: (req) => {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return keyGenerators.byIP(req);
  },
  
  // Combined user and IP key
  byUserAndIP: (req) => {
    const userPart = req.user && req.user.id ? `user:${req.user.id}` : 'anon';
    const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
    return `${userPart}:ip:${ip}`;
  },
  
  // Advanced key with multiple factors
  advanced: (req, prefix = '') => {
    const factors = [];
    
    // User ID if authenticated
    if (req.user && req.user.id) {
      factors.push(`u:${req.user.id}`);
    }
    
    // IP address
    const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
    factors.push(`i:${ip}`);
    
    // User agent hash
    if (req.headers['user-agent']) {
      const uaHash = createHash('md5')
        .update(req.headers['user-agent'])
        .digest('hex')
        .substring(0, 8);
      factors.push(`a:${uaHash}`);
    }
    
    // API key if present
    if (req.headers['x-api-key']) {
      const apiKeyHash = createHash('md5')
        .update(req.headers['x-api-key'])
        .digest('hex')
        .substring(0, 8);
      factors.push(`k:${apiKeyHash}`);
    }
    
    return `${prefix}:${factors.join(':')}`;
  },
  
  // Path-specific key
  byPath: (req, prefix = '') => {
    const basePath = req.baseUrl + req.path;
    const cleanPath = basePath.replace(/\/+/g, '/').replace(/\/$/, '');
    const userKey = keyGenerators.byUser(req);
    return `${prefix}:${cleanPath}:${userKey}`;
  }
};

// Skip conditions for rate limiting
const skipConditions = {
  // Skip for whitelisted IPs
  whitelistedIP: (req) => {
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
    const ip = req.ip || req.connection.remoteAddress || '';
    return whitelist.includes(ip);
  },
  
  // Skip for admin users
  isAdmin: (req) => {
    return req.user && 
           req.user.role === 'admin' && 
           process.env.RATE_LIMIT_SKIP_ADMIN === 'true';
  },
  
  // Skip for internal services
  internalService: (req) => {
    return req.headers['x-internal-service'] === process.env.INTERNAL_SERVICE_TOKEN;
  },
  
  // Skip for health checks
  healthCheck: (req) => {
    return req.path === '/health' || req.path === '/ping';
  },
  
  // Combined skip logic
  shouldSkip: (req) => {
    return skipConditions.whitelistedIP(req) ||
           skipConditions.isAdmin(req) ||
           skipConditions.internalService(req) ||
           skipConditions.healthCheck(req);
  }
};

// Enhanced error handler with detailed information
const createErrorHandler = (config = {}) => {
  return (req, res, retryAfter) => {
    const resetTime = new Date(Date.now() + (retryAfter || 0));
    
    const errorResponse = {
      success: false,
      message: config.message || 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        type: config.type || 'general',
        retryAfter: retryAfter,
        resetTime: resetTime.toISOString(),
        limit: res.getHeader('X-RateLimit-Limit'),
        remaining: res.getHeader('X-RateLimit-Remaining'),
        reset: res.getHeader('X-RateLimit-Reset')
      }
    };
    
    // Add additional context in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.key = req.rateLimit?.key;
      errorResponse.error.current = req.rateLimit?.current;
    }
    
    res.status(429).json(errorResponse);
  };
};

// Rate limiter configurations
const configurations = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => keyGenerators.advanced(req, 'auth'),
    handler: createErrorHandler({ 
      message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.',
      type: 'authentication'
    })
  },
  
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'API-Limit überschritten. Bitte reduzieren Sie die Anzahl der Anfragen.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: keyGenerators.byUser,
    handler: createErrorHandler({ 
      message: 'API-Limit überschritten. Bitte reduzieren Sie die Anzahl der Anfragen.',
      type: 'api'
    })
  },
  
  // File upload endpoints
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Upload-Limit erreicht. Bitte warten Sie 15 Minuten.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: keyGenerators.byUser,
    handler: createErrorHandler({ 
      message: 'Upload-Limit erreicht. Bitte warten Sie 15 Minuten.',
      type: 'upload'
    })
  },
  
  // Financial operations
  financial: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: 'Zu viele Finanztransaktionen. Bitte warten Sie eine Stunde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: keyGenerators.byUser,
    handler: createErrorHandler({ 
      message: 'Zu viele Finanztransaktionen. Bitte warten Sie eine Stunde.',
      type: 'financial'
    })
  },
  
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Zu viele Passwort-Zurücksetzungen. Bitte warten Sie eine Stunde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => keyGenerators.advanced(req, 'reset'),
    handler: createErrorHandler({ 
      message: 'Zu viele Passwort-Zurücksetzungen. Bitte warten Sie eine Stunde.',
      type: 'password_reset'
    })
  },
  
  // Strict rate limiting for sensitive operations
  strict: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10,
    message: 'Sicherheitslimit erreicht. Bitte warten Sie 5 Minuten.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => keyGenerators.advanced(req, 'strict'),
    handler: createErrorHandler({ 
      message: 'Sicherheitslimit erreicht. Bitte warten Sie 5 Minuten.',
      type: 'strict'
    })
  }
};

// Create rate limiter with fallback support
const createRateLimiter = (config) => {
  const limiterConfig = {
    ...config,
    skip: skipConditions.shouldSkip,
    onLimitReached: (req, res) => {
      console.warn(`Rate limit reached for ${req.ip} on ${req.path}`);
      
      // Log to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to logging service
        // logger.warn('rate_limit_exceeded', { 
        //   ip: req.ip, 
        //   path: req.path, 
        //   user: req.user?.id 
        // });
      }
    }
  };
  
  // Use Redis store if available, fallback to memory
  if (redisConnection.isHealthy()) {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:'
    });
  } else {
    console.warn('Redis not available, using memory store for rate limiting');
    limiterConfig.store = {
      incr: async (key) => memoryStoreFallback.incr(key),
      decrement: async (key) => {
        const current = await memoryStoreFallback.get(key);
        if (current > 0) {
          memoryStore.set(key, current - 1);
        }
      },
      resetKey: async (key) => memoryStoreFallback.del(key)
    };
  }
  
  return rateLimit(limiterConfig);
};

// Export rate limiters
const rateLimiters = {
  auth: createRateLimiter(configurations.auth),
  api: createRateLimiter(configurations.api),
  upload: createRateLimiter(configurations.upload),
  financial: createRateLimiter(configurations.financial),
  passwordReset: createRateLimiter(configurations.passwordReset),
  strict: createRateLimiter(configurations.strict),
  
  // Dynamic rate limiter based on user role
  dynamic: (req, res, next) => {
    if (!req.user) {
      return rateLimiters.api(req, res, next);
    }
    
    switch (req.user.role) {
      case 'admin':
        // Admins get more lenient limits
        return createRateLimiter({
          ...configurations.api,
          max: configurations.api.max * 5
        })(req, res, next);
        
      case 'mitarbeiter':
        // Employees get standard limits
        return rateLimiters.api(req, res, next);
        
      default:
        // Other users get stricter limits
        return createRateLimiter({
          ...configurations.api,
          max: configurations.api.max / 2
        })(req, res, next);
    }
  },
  
  // Custom rate limiter factory
  custom: (options) => createRateLimiter({ ...configurations.api, ...options })
};

// Rate limit monitoring endpoints
const monitoring = {
  // Get rate limit status for current user
  async getStatus(req, res) {
    try {
      const key = keyGenerators.byUser(req);
      const client = redisConnection.isHealthy() ? redisClient : memoryStoreFallback;
      
      const keys = await client.keys(`rl:*${key}*`);
      const status = {};
      
      for (const redisKey of keys) {
        const value = await client.get(redisKey);
        const parts = redisKey.split(':');
        const limitType = parts[1];
        
        status[limitType] = {
          count: parseInt(value) || 0,
          key: redisKey,
          limit: configurations[limitType]?.max || 'N/A',
          window: configurations[limitType]?.windowMs || 'N/A'
        };
      }
      
      res.json({
        success: true,
        rateLimits: status,
        userKey: key,
        redisHealthy: redisConnection.isHealthy()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Rate-Limit-Status',
        error: error.message
      });
    }
  },
  
  // Clear rate limits for a specific key (admin only)
  async clearLimits(req, res) {
    try {
      const { key } = req.params;
      const client = redisConnection.isHealthy() ? redisClient : memoryStoreFallback;
      
      const keys = await client.keys(`rl:*${key}*`);
      
      for (const redisKey of keys) {
        await client.del(redisKey);
      }
      
      res.json({
        success: true,
        message: `Rate-Limits für ${key} wurden zurückgesetzt`,
        clearedKeys: keys.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Fehler beim Zurücksetzen der Rate-Limits',
        error: error.message
      });
    }
  },
  
  // Health check for rate limiter
  async health(req, res) {
    const redisHealthy = await redisConnection.ping();
    
    res.json({
      success: true,
      redis: {
        connected: redisConnection.isConnected,
        healthy: redisHealthy,
        connectionAttempts: redisConnection.connectionAttempts
      },
      fallback: {
        active: !redisHealthy,
        entries: memoryStore.size
      }
    });
  }
};

module.exports = {
  rateLimiters,
  monitoring,
  keyGenerators,
  skipConditions,
  RateLimitError,
  redisClient
};