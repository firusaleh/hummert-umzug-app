// config/jwt.config.js - Secure JWT Configuration
const crypto = require('crypto');

// Generate secure random secrets if not provided
const generateSecret = () => crypto.randomBytes(64).toString('hex');

const jwtConfig = {
  access: {
    secret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' 
      ? (() => { throw new Error('JWT_ACCESS_SECRET is required in production'); })() 
      : generateSecret()),
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    algorithm: 'HS512',
    issuer: process.env.JWT_ISSUER || 'lagerlogix',
    audience: process.env.JWT_AUDIENCE || 'lagerlogix-api'
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' 
      ? (() => { throw new Error('JWT_REFRESH_SECRET is required in production'); })() 
      : generateSecret()),
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    algorithm: 'HS512',
    issuer: process.env.JWT_ISSUER || 'lagerlogix',
    audience: process.env.JWT_AUDIENCE || 'lagerlogix-api'
  },
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    domain: process.env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  },
  security: {
    maxLoginAttempts: 5,
    loginAttemptsWindowMs: 15 * 60 * 1000, // 15 minutes
    tokenCleanupIntervalMs: 60 * 60 * 1000, // 1 hour
    passwordResetTokenExpiry: 3600000, // 1 hour
    emailVerificationTokenExpiry: 86400000 // 24 hours
  }
};

// Validate configuration
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets must be defined in production environment');
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('Access and refresh secrets must be different');
  }
  if (process.env.JWT_ACCESS_SECRET.length < 64 || process.env.JWT_REFRESH_SECRET.length < 64) {
    throw new Error('JWT secrets must be at least 64 characters long');
  }
}

module.exports = jwtConfig;