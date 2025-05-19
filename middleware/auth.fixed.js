// middleware/auth.fixed.js - Enhanced authentication middleware
const jwt = require('jsonwebtoken');
const { User } = require('../models');

class AuthMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    if (!this.jwtSecret) {
      console.error('CRITICAL: JWT_SECRET is not defined in environment variables!');
      throw new Error('JWT_SECRET must be defined');
    }
  }

  // Extract token from various sources
  extractToken(req) {
    let token = null;
    
    // Check Authorization header (most common)
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Check cookies (for web apps)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check query parameters (less secure, use only for special cases)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
      console.warn('Token passed in query parameter - this is less secure');
    }
    
    return token;
  }

  // Main authentication middleware
  async authenticate(req, res, next) {
    try {
      // Extract token
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'Kein Authentifizierungstoken bereitgestellt',
          error: 'NO_TOKEN'
        });
      }
      
      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, this.jwtSecret);
      } catch (jwtError) {
        // Handle specific JWT errors
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            message: 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.',
            error: 'TOKEN_EXPIRED',
            expiredAt: jwtError.expiredAt
          });
        } else if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({ 
            success: false, 
            message: 'Ungültiges Token. Bitte melden Sie sich erneut an.',
            error: 'INVALID_TOKEN'
          });
        } else if (jwtError.name === 'NotBeforeError') {
          return res.status(401).json({ 
            success: false, 
            message: 'Token noch nicht gültig',
            error: 'TOKEN_NOT_ACTIVE',
            date: jwtError.date
          });
        }
        throw jwtError;
      }
      
      // Check if user ID exists in token
      if (!decoded.id && !decoded.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Token enthält keine Benutzer-ID',
          error: 'INVALID_TOKEN_PAYLOAD'
        });
      }
      
      // Get user from database
      const userId = decoded.id || decoded.userId;
      const user = await User.findById(userId)
        .select('-password')
        .lean();
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Benutzer nicht gefunden',
          error: 'USER_NOT_FOUND'
        });
      }
      
      // Check if user is active
      if (user.isActive === false) {
        return res.status(401).json({ 
          success: false, 
          message: 'Benutzerkonto ist deaktiviert',
          error: 'ACCOUNT_DISABLED'
        });
      }
      
      // Check if user is verified (if applicable)
      if (user.isVerified === false) {
        return res.status(401).json({ 
          success: false, 
          message: 'E-Mail-Adresse nicht verifiziert',
          error: 'EMAIL_NOT_VERIFIED'
        });
      }
      
      // Check token issued at time (prevent token reuse after password change)
      if (user.passwordChangedAt && decoded.iat) {
        const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
        if (decoded.iat < passwordChangedTimestamp) {
          return res.status(401).json({ 
            success: false, 
            message: 'Passwort wurde geändert. Bitte melden Sie sich erneut an.',
            error: 'PASSWORD_CHANGED'
          });
        }
      }
      
      // Add user to request object
      req.user = user;
      req.token = token;
      req.tokenDecoded = decoded;
      
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Generic error response
      res.status(401).json({ 
        success: false, 
        message: 'Authentifizierung fehlgeschlagen',
        error: 'AUTH_FAILED'
      });
    }
  }

  // Middleware for role-based access control
  requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Nicht authentifiziert',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      // Check if user has one of the allowed roles
      const userRole = req.user.role || req.user.rolle;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          success: false, 
          message: `Unzureichende Berechtigungen. Erforderlich: ${allowedRoles.join(' oder ')}`,
          error: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          actual: userRole
        });
      }
      
      next();
    };
  }

  // Check if user is admin
  requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nicht authentifiziert',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    const userRole = req.user.role || req.user.rolle;
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert. Admin-Rechte erforderlich.',
        error: 'ADMIN_REQUIRED'
      });
    }
    
    next();
  }

  // Check if user is employee or admin
  requireEmployee(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nicht authentifiziert',
        error: 'NOT_AUTHENTICATED'
      });
    }
    
    const userRole = req.user.role || req.user.rolle;
    if (!['mitarbeiter', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Zugriff verweigert. Mitarbeiter- oder Admin-Rechte erforderlich.',
        error: 'EMPLOYEE_REQUIRED'
      });
    }
    
    next();
  }

  // Check if user can access a specific resource
  requireOwnership(resourceField = 'userId') {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Nicht authentifiziert',
          error: 'NOT_AUTHENTICATED'
        });
      }
      
      // Admins can access everything
      const userRole = req.user.role || req.user.rolle;
      if (userRole === 'admin') {
        return next();
      }
      
      // Get resource ID from params
      const resourceId = req.params.id || req.params.resourceId;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Ressourcen-ID fehlt',
          error: 'RESOURCE_ID_MISSING'
        });
      }
      
      // This is a simplified check - in real implementation, 
      // you'd fetch the resource and check ownership
      const userIdFromToken = req.user._id.toString();
      const userIdFromResource = req.body[resourceField] || req.query[resourceField];
      
      if (userIdFromToken !== userIdFromResource) {
        return res.status(403).json({
          success: false,
          message: 'Zugriff verweigert. Sie können nur Ihre eigenen Ressourcen bearbeiten.',
          error: 'OWNERSHIP_REQUIRED'
        });
      }
      
      next();
    };
  }

  // Optional authentication - doesn't fail if no token
  optionalAuth(req, res, next) {
    const token = this.extractToken(req);
    
    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }
    
    // If token is provided, validate it
    this.authenticate(req, res, next);
  }

  // Rate limit check per user
  async checkRateLimit(req, res, next) {
    if (!req.user) {
      return next();
    }
    
    // This is a placeholder - implement actual rate limiting logic
    // You could use Redis or in-memory storage to track requests
    const userId = req.user._id.toString();
    const endpoint = req.path;
    const key = `rate_limit:${userId}:${endpoint}`;
    
    // Example rate limit check (implement with Redis)
    // const count = await redis.incr(key);
    // await redis.expire(key, 60); // 1 minute window
    // if (count > 100) { // 100 requests per minute
    //   return res.status(429).json({
    //     success: false,
    //     message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    //     error: 'RATE_LIMIT_EXCEEDED'
    //   });
    // }
    
    next();
  }
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions bound to the instance
module.exports = {
  // Main authentication
  protect: authMiddleware.authenticate.bind(authMiddleware),
  authenticate: authMiddleware.authenticate.bind(authMiddleware),
  
  // Role-based access
  requireRole: authMiddleware.requireRole.bind(authMiddleware),
  requireAdmin: authMiddleware.requireAdmin.bind(authMiddleware),
  requireEmployee: authMiddleware.requireEmployee.bind(authMiddleware),
  requireOwnership: authMiddleware.requireOwnership.bind(authMiddleware),
  
  // Optional auth
  optionalAuth: authMiddleware.optionalAuth.bind(authMiddleware),
  
  // Rate limiting
  checkRateLimit: authMiddleware.checkRateLimit.bind(authMiddleware),
  
  // Legacy exports for backward compatibility
  auth: authMiddleware.authenticate.bind(authMiddleware),
  checkRole: authMiddleware.requireRole.bind(authMiddleware),
  admin: authMiddleware.requireAdmin.bind(authMiddleware),
  mitarbeiter: authMiddleware.requireEmployee.bind(authMiddleware)
};