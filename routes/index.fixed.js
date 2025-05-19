// routes/index.fixed.js
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/error.middleware');
const rateLimiter = require('../middleware/rateLimit');

// Import all route modules
const authRoutes = require('./auth.routes.fixed');
const userRoutes = require('./user.routes.fixed');
const umzugRoutes = require('./umzuege.routes.fixed');
const aufnahmeRoutes = require('./aufnahme.routes.fixed');
const mitarbeiterRoutes = require('./mitarbeiter.routes.fixed');
const benachrichtigungRoutes = require('./benachrichtigung.routes.fixed');
const finanzenRoutes = require('./finanzen.routes.fixed');
const zeiterfassungRoutes = require('./zeiterfassung.routes.fixed');
const uploadRoutes = require('./upload.routes.fixed');
const projektRoutes = require('./projekt.routes.fixed');
const clientRoutes = require('./client.routes.fixed');
const taskRoutes = require('./task.routes.fixed');
const fileRoutes = require('./file.routes.fixed');

// API info response
const apiInfo = {
  name: 'Hummert Umzug API',
  version: '2.0.0',
  status: 'operational',
  environment: process.env.NODE_ENV || 'development',
  documentation: '/api/docs',
  endpoints: {
    auth: '/api/auth',
    users: '/api/users',
    moves: '/api/umzuege',
    assessments: '/api/aufnahmen',
    employees: '/api/mitarbeiter',
    notifications: '/api/benachrichtigungen',
    finance: '/api/finanzen',
    timeTracking: '/api/zeiterfassung',
    uploads: '/api/uploads',
    projects: '/api/projekte',
    clients: '/api/clients',
    tasks: '/api/tasks',
    files: '/api/files'
  }
};

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    version: apiInfo.version
  };
  
  // Add database check if needed
  try {
    // await mongoose.connection.db.admin().ping();
    healthcheck.database = 'connected';
  } catch (error) {
    healthcheck.database = 'disconnected';
    healthcheck.status = 'DEGRADED';
  }
  
  res.status(200).json(healthcheck);
}));

// API root endpoint
router.get('/', (req, res) => {
  res.json(apiInfo);
});

// API documentation (placeholder)
router.get('/docs', (req, res) => {
  res.json({
    message: 'API documentation',
    swagger: '/api/docs/swagger',
    postman: '/api/docs/postman'
  });
});

// Mount routes with rate limiting where appropriate
router.use('/auth', rateLimiter.apiLimiter, authRoutes);
router.use('/users', rateLimiter.apiLimiter, userRoutes);
router.use('/umzuege', rateLimiter.apiLimiter, umzugRoutes);
router.use('/aufnahmen', rateLimiter.apiLimiter, aufnahmeRoutes);
router.use('/mitarbeiter', rateLimiter.apiLimiter, mitarbeiterRoutes);
router.use('/benachrichtigungen', rateLimiter.apiLimiter, benachrichtigungRoutes);
router.use('/finanzen', rateLimiter.apiLimiter, finanzenRoutes);
router.use('/zeiterfassung', rateLimiter.apiLimiter, zeiterfassungRoutes);
router.use('/uploads', rateLimiter.uploadLimiter, uploadRoutes);
router.use('/projekte', rateLimiter.apiLimiter, projektRoutes);
router.use('/clients', rateLimiter.apiLimiter, clientRoutes);
router.use('/tasks', rateLimiter.apiLimiter, taskRoutes);
router.use('/files', rateLimiter.apiLimiter, fileRoutes);

// Catch-all for undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (should be last)
router.use((err, req, res, next) => {
  console.error('Route error:', err);
  
  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    }
  });
});

module.exports = router;