// server-with-rate-limiting.js - Enhanced server with rate limiting
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

// Load environment variables
dotenv.config();

// Import configurations
const config = require('./config/config');
const rateLimitConfig = require('./config/rateLimit.config');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { rateLimiters, rateLimitStatus } = require('./middleware/rateLimiter');
const { 
  authLimiter, 
  apiLimiter, 
  uploadLimiter,
  progressiveLimiter 
} = require('./middleware/advancedRateLimiter');

// Import services
const { startCleanupService } = require('./utils/token-cleanup');
const rateLimitMonitor = require('./services/rateLimitMonitor');

// Create Express app
const app = express();

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-RateLimit-Bypass'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const fs = require('fs');
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is operational',
    timestamp: new Date().toISOString(),
    rateLimiting: 'active'
  });
});

// Rate limit status endpoint
app.get('/api/rate-limit-status', rateLimitStatus);

// Apply different rate limiters to different routes
const routes = require('./routes');

// Authentication routes - strictest limits
app.use('/api/auth', authLimiter.middleware.bind(authLimiter), routes);

// File upload routes - cost-based limits
app.use('/api/upload', uploadLimiter.middleware(10), routes);
app.use('/api/files', uploadLimiter.middleware(5), routes);

// Financial routes - moderate limits with monitoring
app.use('/api/finanzen', rateLimiters.financial, routes);

// General API routes - progressive limits that improve with good behavior
app.use('/api', progressiveLimiter.middleware.bind(progressiveLimiter), routes);

// Error handler
app.use(errorHandler);

// Rate limit monitoring events
rateLimitMonitor.on('violation', (data) => {
  console.log('Rate limit violation:', data);
});

rateLimitMonitor.on('suspiciousActivity', (data) => {
  console.error('Suspicious activity detected:', data);
  // In production, this would trigger alerts
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Stop accepting new requests
  app.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connection
  await mongoose.connection.close();
  console.log('Database connection closed');
  
  // Close Redis connection
  if (rateLimiters.redisClient) {
    await rateLimiters.redisClient.quit();
    console.log('Redis connection closed');
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB connected successfully');
    
    // Start services
    if (process.env.NODE_ENV !== 'test') {
      startCleanupService();
      console.log('Token cleanup service started');
    }
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log('Rate limiting active with the following strategies:');
      console.log('- Authentication: Token bucket (5 requests/15 minutes)');
      console.log('- API: Progressive (20-200 requests/minute based on reputation)');
      console.log('- Uploads: Cost-based (100 points/hour)');
      console.log('- Financial: Fixed window (50 requests/hour)');
    });
    
    app.set('server', server);
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start the application
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;