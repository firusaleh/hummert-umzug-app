// Enhanced server.js with complete validation integration
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

// Import configuration
const config = require('./config/config');
const { securityHeaders } = require('./config/security');

// Import routes
const routes = require('./routes');
const authSecureRoutes = require('./routes/auth.secure.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { sanitizeMiddleware } = require('./utils/validators/sanitizer');
const { rateLimiters } = require('./utils/validators/security');

// Import services
const { startCleanupService } = require('./utils/token-cleanup');

// Create Express app
const app = express();

// Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(securityHeaders));
app.use(mongoSanitize()); // Prevent MongoDB injection
app.use(cookieParser()); // Parse cookies for JWT

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['https://www.lagerlogix.de', 'http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization middleware
app.use(sanitizeMiddleware);

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging to file
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting for different endpoint types
app.use('/api/auth', rateLimiters.auth);
app.use('/api/files/upload', rateLimiters.upload);
app.use('/api/finanzen', rateLimiters.financial);
app.use('/api', rateLimiters.general);

// API routes with validation
app.use('/api/auth', authSecureRoutes); // Use secure auth routes
app.use('/api', routes); // All other routes

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: "API-Endpunkt nicht gefunden",
    path: req.path
  });
});

// Root handler for separated frontend
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: "Dies ist der Backend-Server. Das Frontend ist unter https://www.lagerlogix.de verfügbar.", 
    api_info: "API-Endpunkte sind unter /api verfügbar."
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`${signal} signal received: closing HTTP server`);
  
  try {
    // Close server
    await new Promise((resolve) => {
      app.close(resolve);
    });
    
    // Close database connections
    await mongoose.connection.close();
    
    console.log('HTTP server closed');
    console.log('Database connections closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || config.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      
      console.log('MongoDB connection successful');
      
      // Start token cleanup service
      if (process.env.NODE_ENV !== 'test') {
        startCleanupService();
        console.log('Token cleanup service started');
      }
      
      // Start server
      const PORT = process.env.PORT || 5000;
      const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        console.log('Input validation active on all routes');
        console.log('Security headers configured');
        console.log('Rate limiting active');
      });
      
      // Store server reference for graceful shutdown
      app.set('server', server);
      
      break;
    } catch (err) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, err.message);
      
      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Start the server
connectWithRetry();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server and exit
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Exit immediately for uncaught exceptions
  process.exit(1);
});

module.exports = app;