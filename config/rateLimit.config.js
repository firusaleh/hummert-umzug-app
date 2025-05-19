// config/rateLimit.config.js - Rate limiting configuration
module.exports = {
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_RATE_LIMIT_DB || 1,
    keyPrefix: 'rl:',
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  },

  // Default rate limit configurations
  defaults: {
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      skipSuccessfulRequests: false,
      message: 'Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.'
    },
    
    // General API endpoints
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,
      skipSuccessfulRequests: false,
      message: 'API-Limit überschritten. Bitte reduzieren Sie die Anzahl der Anfragen.'
    },
    
    // File upload endpoints
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      skipSuccessfulRequests: true,
      message: 'Upload-Limit erreicht. Bitte warten Sie eine Stunde.'
    },
    
    // Financial operations
    financial: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50,
      skipSuccessfulRequests: false,
      message: 'Zu viele Finanztransaktionen. Bitte warten Sie eine Stunde.'
    },
    
    // Password reset
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      skipSuccessfulRequests: false,
      message: 'Zu viele Passwort-Zurücksetzungen. Bitte warten Sie eine Stunde.'
    },
    
    // Email sending
    email: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      skipSuccessfulRequests: false,
      message: 'E-Mail-Limit erreicht. Bitte warten Sie eine Stunde.'
    }
  },

  // Advanced rate limiting strategies
  strategies: {
    tokenBucket: {
      auth: {
        points: 5,
        duration: 900, // 15 minutes
        blockDuration: 900
      },
      api: {
        points: 100,
        duration: 60, // 1 minute
        blockDuration: 60
      }
    },
    
    slidingWindow: {
      api: {
        points: 100,
        duration: 60,
        execEvenly: true
      },
      financial: {
        points: 50,
        duration: 3600,
        execEvenly: true
      }
    },
    
    progressive: {
      basePoints: 20,
      maxPoints: 200,
      duration: 60,
      reputationDuration: 86400 // 24 hours
    },
    
    costBased: {
      points: 100,
      duration: 3600,
      costs: {
        GET: 1,
        POST: 2,
        PUT: 2,
        DELETE: 3,
        PATCH: 2,
        HEAD: 1,
        OPTIONS: 1,
        UPLOAD: 10
      }
    }
  },

  // Whitelist configuration
  whitelist: {
    ips: (process.env.RATE_LIMIT_WHITELIST_IPS || '').split(',').filter(Boolean),
    skipAdmin: process.env.RATE_LIMIT_SKIP_ADMIN === 'true',
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.RATE_LIMIT_MONITORING !== 'false',
    thresholds: {
      auth: { count: 10, window: 3600000 }, // 10 violations per hour
      api: { count: 100, window: 3600000 }, // 100 violations per hour
      financial: { count: 20, window: 3600000 }, // 20 violations per hour
      upload: { count: 50, window: 3600000 } // 50 violations per hour
    },
    alerting: {
      enabled: process.env.RATE_LIMIT_ALERTS === 'true',
      email: process.env.RATE_LIMIT_ALERT_EMAIL,
      webhook: process.env.RATE_LIMIT_ALERT_WEBHOOK
    }
  },

  // Headers configuration
  headers: {
    standard: true,
    legacy: false,
    draft: false
  },

  // Error messages (German)
  messages: {
    tooManyRequests: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    authLimit: 'Zu viele Anmeldeversuche. Bitte warten Sie {minutes} Minuten.',
    apiLimit: 'API-Limit überschritten. Sie können {remaining} weitere Anfragen in {minutes} Minuten stellen.',
    uploadLimit: 'Upload-Limit erreicht. Bitte warten Sie {hours} Stunde(n).',
    financialLimit: 'Finanztransaktionslimit erreicht. Bitte warten Sie {hours} Stunde(n).',
    custom: 'Rate-Limit überschritten. {details}'
  },

  // Environment-specific overrides
  environments: {
    development: {
      multiply: 10, // 10x higher limits in development
      monitoring: false
    },
    test: {
      multiply: 100, // 100x higher limits in tests
      monitoring: false,
      redis: false // Use memory store in tests
    },
    production: {
      multiply: 1,
      monitoring: true,
      alerting: true
    }
  }
};