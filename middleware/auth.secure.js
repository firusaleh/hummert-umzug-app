// middleware/auth.secure.js - Secure Authentication Middleware
const TokenService = require('../services/token.service');
const { User } = require('../models');
const rateLimit = require('express-rate-limit');
const jwtConfig = require('../config/jwt.config');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: jwtConfig.security.loginAttemptsWindowMs,
  max: jwtConfig.security.maxLoginAttempts,
  message: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Try to get token from different sources
    let accessToken = null;
    
    // 1. Check Authorization header
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '');
    }
    
    // 2. Check cookies
    if (!accessToken && req.cookies) {
      accessToken = req.cookies.accessToken;
    }
    
    // 3. Check query params (only for specific use cases like file downloads)
    if (!accessToken && req.query.token && req.method === 'GET') {
      accessToken = req.query.token;
    }
    
    if (!accessToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kein Authentifizierungstoken bereitgestellt' 
      });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await TokenService.isBlacklisted(accessToken);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token wurde widerrufen' 
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = TokenService.verifyAccessToken(accessToken);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token abgelaufen',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Ungültiges Token' 
        });
      }
      throw error;
    }
    
    // Get user from database
    const user = await User.findById(decoded.id)
      .select('-password')
      .lean();
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Konto ist deaktiviert' 
      });
    }
    
    // Add user and token info to request
    req.user = user;
    req.token = accessToken;
    req.tokenPayload = decoded;
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authentifizierungsfehler',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware for role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nicht authentifiziert' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unzureichende Berechtigungen für diese Aktion' 
      });
    }
    
    next();
  };
};

// Middleware to refresh access token
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kein Refresh Token bereitgestellt' 
      });
    }
    
    const newAccessToken = await TokenService.refreshAccessToken(refreshToken, {
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    
    // Set new access token in cookie
    res.cookie('accessToken', newAccessToken, {
      ...jwtConfig.cookie,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    req.newAccessToken = newAccessToken;
    next();
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token-Aktualisierung fehlgeschlagen',
      error: error.message 
    });
  }
};

// Middleware to handle CSRF protection
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  authLimiter,
  refreshTokenMiddleware,
  csrfProtection,
  admin: authorize('admin'),
  mitarbeiter: authorize('mitarbeiter', 'admin'),
  protect: authenticate // Alias for compatibility
};