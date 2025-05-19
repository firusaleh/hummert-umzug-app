// routes/index.integrated.js - Updated routes with rate limiting
const express = require('express');
const router = express.Router();

// Import rate limiters
const { rateLimiters } = require('../middleware/rateLimiter');
const { 
  authLimiter, 
  apiLimiter, 
  uploadLimiter, 
  progressiveLimiter 
} = require('../middleware/advancedRateLimiter');

// Import all route modules
const authRoutes = require('./auth.secure.routes');
const umzuegeRoutes = require('./umzug.routes');
const mitarbeiterRoutes = require('./mitarbeiter.routes');
const aufnahmeRoutes = require('./aufnahme.routes');
const finanzenRoutes = require('./finanzen.routes');
const zeiterfassungRoutes = require('./zeiterfassung.routes');
const benachrichtigungRoutes = require('./benachrichtigung.routes');
const uploadRoutes = require('./upload.routes');
const userRoutes = require('./user');
const fileRoutes = require('./file');
const rateLimitRoutes = require('./rateLimit.routes');

// Health check endpoint (no rate limiting)
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API ist erreichbar',
    timestamp: new Date().toISOString()
  });
});

// Apply rate limiting to routes

// Authentication routes - strictest limits
router.use('/auth', authLimiter.middleware.bind(authLimiter), authRoutes);

// User management - moderate limits
router.use('/users', apiLimiter.middleware.bind(apiLimiter), userRoutes);

// Main business logic routes - standard API limits
router.use('/umzuege', progressiveLimiter.middleware.bind(progressiveLimiter), umzuegeRoutes);
router.use('/mitarbeiter', apiLimiter.middleware.bind(apiLimiter), mitarbeiterRoutes);
router.use('/aufnahmen', apiLimiter.middleware.bind(apiLimiter), aufnahmeRoutes);

// Financial routes - stricter limits for security
router.use('/finanzen', rateLimiters.financial, finanzenRoutes);

// Time tracking - standard limits
router.use('/zeiterfassung', apiLimiter.middleware.bind(apiLimiter), zeiterfassungRoutes);

// Notifications - moderate limits
router.use('/benachrichtigungen', apiLimiter.middleware.bind(apiLimiter), benachrichtigungRoutes);

// File operations - cost-based limiting
router.use('/files', uploadLimiter.middleware(5), fileRoutes);
router.use('/upload', uploadLimiter.middleware(10), uploadRoutes);

// Rate limit management routes - admin only, standard limits
router.use('/rate-limits', apiLimiter.middleware.bind(apiLimiter), rateLimitRoutes);

// Default 404 handler for unknown routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpunkt nicht gefunden',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;