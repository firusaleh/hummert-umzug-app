// middleware/advancedRateLimiter.js - Advanced rate limiting strategies
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const Redis = require('ioredis');
const monitor = require('../services/rateLimitMonitor');

// Redis client for distributed rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
});

// Fallback to memory if Redis is not available
let rateLimiterMemory = null;

// Token bucket implementation for burst traffic
class TokenBucketLimiter {
  constructor(options) {
    this.options = {
      points: options.points || 10, // Number of tokens
      duration: options.duration || 1, // Per second
      blockDuration: options.blockDuration || 60, // Block for 60 seconds
      keyPrefix: options.keyPrefix || 'tb',
    };
    
    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: this.options.keyPrefix,
      points: this.options.points,
      duration: this.options.duration,
      blockDuration: this.options.blockDuration,
    });
  }
  
  async middleware(req, res, next) {
    try {
      const key = this.getKey(req);
      await this.limiter.consume(key);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.options.points);
      res.setHeader('X-RateLimit-Remaining', res.consumedPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + this.options.duration * 1000).toISOString());
      
      next();
    } catch (rateLimiterRes) {
      // Log the rate limit violation
      monitor.emit('violation', {
        type: 'token_bucket',
        identifier: this.getKey(req),
        count: rateLimiterRes.consumedPoints || 0,
        timestamp: Date.now()
      });
      
      res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000);
      res.setHeader('X-RateLimit-Limit', this.options.points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(rateLimiterRes.msBeforeNext).toISOString());
      
      res.status(429).json({
        success: false,
        message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
      });
    }
  }
  
  getKey(req) {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  }
}

// Sliding window implementation for smooth rate limiting
class SlidingWindowLimiter {
  constructor(options) {
    this.options = {
      points: options.points || 100,
      duration: options.duration || 60, // 1 minute
      blockDuration: options.blockDuration || 60,
      keyPrefix: options.keyPrefix || 'sw',
    };
    
    try {
      this.limiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: this.options.keyPrefix,
        points: this.options.points,
        duration: this.options.duration,
        blockDuration: this.options.blockDuration,
        execEvenly: true, // Spread requests evenly
      });
    } catch (err) {
      // Fallback to memory
      this.limiter = new RateLimiterMemory({
        points: this.options.points,
        duration: this.options.duration,
        blockDuration: this.options.blockDuration,
        execEvenly: true,
      });
    }
  }
  
  async middleware(req, res, next) {
    try {
      const key = this.getKey(req);
      const rateLimiterRes = await this.limiter.consume(key);
      
      // Add rate limit info to headers
      res.setHeader('X-RateLimit-Limit', this.options.points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      
      next();
    } catch (rateLimiterRes) {
      monitor.emit('violation', {
        type: 'sliding_window',
        identifier: this.getKey(req),
        count: rateLimiterRes.consumedPoints || 0,
        timestamp: Date.now()
      });
      
      res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000);
      res.setHeader('X-RateLimit-Limit', this.options.points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
      
      res.status(429).json({
        success: false,
        message: 'API-Limit überschritten. Bitte reduzieren Sie die Anfragerate.',
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
      });
    }
  }
  
  getKey(req) {
    // Combine multiple factors for the key
    const factors = [];
    
    if (req.user && req.user.id) {
      factors.push(`user:${req.user.id}`);
    }
    
    factors.push(`ip:${req.ip}`);
    
    if (req.headers['x-api-key']) {
      factors.push(`api:${req.headers['x-api-key']}`);
    }
    
    return factors.join(':');
  }
}

// Progressive rate limiting (increases limits for good behavior)
class ProgressiveRateLimiter {
  constructor(options) {
    this.basePoints = options.basePoints || 10;
    this.maxPoints = options.maxPoints || 100;
    this.duration = options.duration || 60;
    this.reputationKey = options.reputationKey || 'reputation';
    
    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'progressive',
      points: this.basePoints,
      duration: this.duration,
    });
    
    this.reputationLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: this.reputationKey,
      points: 1,
      duration: 24 * 60 * 60, // 24 hours
    });
  }
  
  async middleware(req, res, next) {
    try {
      const key = this.getKey(req);
      const reputation = await this.getReputation(key);
      const points = Math.min(this.basePoints + reputation, this.maxPoints);
      
      // Set dynamic points based on reputation
      this.limiter.points = points;
      
      const rateLimiterRes = await this.limiter.consume(key);
      
      // Successful request increases reputation
      await this.increaseReputation(key);
      
      res.setHeader('X-RateLimit-Limit', points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('X-RateLimit-Reputation', reputation);
      
      next();
    } catch (rateLimiterRes) {
      const key = this.getKey(req);
      
      // Failed request decreases reputation
      await this.decreaseReputation(key);
      
      monitor.emit('violation', {
        type: 'progressive',
        identifier: key,
        reputation: await this.getReputation(key),
        timestamp: Date.now()
      });
      
      res.status(429).json({
        success: false,
        message: 'Rate limit überschritten. Ihre Limits werden basierend auf Ihrem Nutzungsverhalten angepasst.',
        retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000)
      });
    }
  }
  
  async getReputation(key) {
    try {
      const res = await this.reputationLimiter.get(key);
      return res ? res.consumedPoints : 0;
    } catch (err) {
      return 0;
    }
  }
  
  async increaseReputation(key) {
    try {
      await this.reputationLimiter.reward(key, 1);
    } catch (err) {
      // Ignore errors
    }
  }
  
  async decreaseReputation(key) {
    try {
      await this.reputationLimiter.consume(key, 2);
    } catch (err) {
      // Ignore errors
    }
  }
  
  getKey(req) {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  }
}

// Cost-based rate limiting (different costs for different operations)
class CostBasedRateLimiter {
  constructor(options) {
    this.costs = options.costs || {
      GET: 1,
      POST: 2,
      PUT: 2,
      DELETE: 3,
      UPLOAD: 5,
    };
    
    this.limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'cost',
      points: options.points || 100,
      duration: options.duration || 60,
    });
  }
  
  async middleware(cost) {
    return async (req, res, next) => {
      try {
        const key = this.getKey(req);
        const operationCost = cost || this.costs[req.method] || 1;
        
        const rateLimiterRes = await this.limiter.consume(key, operationCost);
        
        res.setHeader('X-RateLimit-Limit', this.limiter.points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Cost', operationCost);
        
        next();
      } catch (rateLimiterRes) {
        monitor.emit('violation', {
          type: 'cost_based',
          identifier: this.getKey(req),
          cost: cost || this.costs[req.method] || 1,
          timestamp: Date.now()
        });
        
        res.status(429).json({
          success: false,
          message: 'Ressourcenlimit überschritten. Verschiedene Operationen haben unterschiedliche Kosten.',
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000),
          cost: cost || this.costs[req.method] || 1
        });
      }
    };
  }
  
  getKey(req) {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  }
}

// Export advanced rate limiters
module.exports = {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  ProgressiveRateLimiter,
  CostBasedRateLimiter,
  
  // Pre-configured limiters
  authLimiter: new TokenBucketLimiter({
    points: 5,
    duration: 900, // 15 minutes
    blockDuration: 900,
    keyPrefix: 'auth',
  }),
  
  apiLimiter: new SlidingWindowLimiter({
    points: 100,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'api',
  }),
  
  uploadLimiter: new CostBasedRateLimiter({
    points: 100,
    duration: 3600, // 1 hour
    costs: {
      POST: 10, // File uploads cost more
    },
  }),
  
  progressiveLimiter: new ProgressiveRateLimiter({
    basePoints: 20,
    maxPoints: 200,
    duration: 60,
  }),
};