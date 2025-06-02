// server.js - Enhanced with comprehensive validation and security
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Import configs and middleware
const config = require('./config/config');
const routes = require('./routes');
const errorHandler = require('./middleware/error.middleware');
const configureSecurityMiddleware = require('./config/security');
const { rateLimiters, corsOptions } = require('./utils/validators/security');
const { startCleanupService } = require('./utils/token-cleanup');
const { createNotFoundError } = require('./utils/error.utils');
const { transformLegacyRequest, transformResponse } = require('./middleware/legacyFormat');

// Create Express app
const app = express();

// Trust proxy (for rate limiting)
app.set('trust proxy', 1);

// Configure CORS
app.use(cors({
  ...corsOptions,
  origin: ['https://www.lagerlogix.de', 'http://localhost:3000', ...corsOptions.origin]
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Apply security configurations
configureSecurityMiddleware(app);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Apply rate limiting
app.use('/api', rateLimiters.general);
app.use('/api/auth', rateLimiters.auth);
app.use('/api/uploads', rateLimiters.upload);
app.use('/api/finanzen', rateLimiters.financial);

// Directory structure logging (for debugging)
console.log('Server directory (__dirname):', __dirname);
console.log('Process working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Hummert Umzug API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: {
      health: '/health',
      api: '/api',
      endpoints: {
        auth: '/api/auth',
        umzuege: '/api/umzuege',
        mitarbeiter: '/api/mitarbeiter',
        aufnahmen: '/api/aufnahmen',
        fahrzeuge: '/api/fahrzeuge',
        finanzen: '/api/finanzen',
        benachrichtigungen: '/api/benachrichtigungen',
        zeiterfassung: '/api/zeiterfassung'
      }
    },
    frontend: 'https://www.lagerlogix.de'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Apply legacy format middleware
app.use('/api', transformLegacyRequest);
app.use('/api', transformResponse);

// API routes
app.use('/api', routes);

// API 404 handler
app.use('/api/*', (req, res, next) => {
  next(createNotFoundError('API-Endpunkt'));
});

// Frontend info handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "This is the backend server. Frontend is available at https://www.lagerlogix.de",
    api_info: "API endpoints are available under /api"
  });
});

// Global error handler
app.use(errorHandler);

// MongoDB connection with retry logic
const connectWithRetry = () => {
  const mongoUri = process.env.MONGODB_URI || config.mongoUri;
  
  mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    })
    .then(() => {
      console.log('MongoDB connection successful');
      
      // Start token cleanup service
      if (startCleanupService) {
        startCleanupService();
        console.log('Token cleanup service started');
      }
      
      // Start server
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

// Start MongoDB connection
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing HTTP server and MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

module.exports = app;