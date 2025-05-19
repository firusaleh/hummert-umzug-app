// middleware/error.middleware.fixed.js - Enhanced error handling middleware
const { formatValidationErrors } = require('./validators/common.validators');

// Custom error classes for different error types
class AppError extends Error {
  constructor(message, statusCode, errors = null, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    this.errorCode = errorCode;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, errors, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Nicht authentifiziert') {
    super(message, 401, null, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Keine Berechtigung') {
    super(message, 403, null, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource nicht gefunden') {
    super(message, 404, null, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Konflikt bei der Anfrage') {
    super(message, 409, null, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Zu viele Anfragen') {
    super(message, 429, null, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Async error handler wrapper with request context
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch((error) => {
        // Add request context to error
        error.method = req.method;
        error.url = req.originalUrl;
        error.ip = req.ip;
        error.userId = req.user ? req.user._id : null;
        next(error);
      });
  };
};

// Development error response with full details
const sendErrorDev = (err, req, res) => {
  const response = {
    success: false,
    status: err.status,
    error: err.name,
    errorCode: err.errorCode,
    message: err.message,
    stack: err.stack,
    errors: err.errors,
    timestamp: err.timestamp,
    path: req.originalUrl,
    method: req.method
  };
  
  // Add request body for debugging POST/PUT errors
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    response.requestBody = req.body;
  }
  
  res.status(err.statusCode).json(response);
};

// Production error response with sanitized details
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      success: false,
      message: err.message,
      errorCode: err.errorCode
    };
    
    // Add validation errors if present
    if (err.errors) {
      response.errors = err.errors;
    }
    
    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', {
      error: err,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user ? req.user._id : null,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Ein unerwarteter Fehler ist aufgetreten',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Handle MongoDB cast errors
const handleCastErrorDB = (err) => {
  const message = `Ungültiger Wert für ${err.path}: ${err.value}`;
  return new ValidationError(message, [{
    field: err.path,
    value: err.value,
    message: message
  }]);
};

// Handle MongoDB duplicate key errors
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  const message = `Der Wert '${value}' existiert bereits für das Feld '${field}'`;
  
  return new ConflictError(message);
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((error) => ({
    field: error.path,
    value: error.value,
    message: error.message
  }));
  
  const message = 'Validierungsfehler bei den Eingabedaten';
  return new ValidationError(message, errors);
};

// Handle JWT errors
const handleJWTError = () => {
  return new AuthenticationError('Ungültiger Token. Bitte melden Sie sich erneut an');
};

const handleJWTExpiredError = () => {
  return new AuthenticationError('Ihr Token ist abgelaufen. Bitte melden Sie sich erneut an');
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error for debugging in all environments
  const errorLog = {
    message: err.message,
    status: err.statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user ? req.user._id : null,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };
  
  if (err.statusCode >= 500) {
    console.error('Server Error:', errorLog);
  } else if (process.env.NODE_ENV === 'development') {
    console.log('Client Error:', errorLog);
  }
  
  // Send response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Create error copy to avoid mutating original
    let error = Object.create(err);
    error.message = err.message;
    error.name = err.name;
    
    // Transform specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, req, res);
  }
};

// 404 handler for unmatched routes
const notFound = (req, res, next) => {
  const err = new NotFoundError(`Die angeforderte URL ${req.originalUrl} wurde nicht gefunden`);
  next(err);
};

// Validation error formatter
const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      value: error.value,
      message: error.msg,
      location: error.location
    }));
    
    const error = new ValidationError('Validierungsfehler bei den Eingabedaten', formattedErrors);
    return next(error);
  }
  
  next();
};

// Express-validator integration
const { validationResult } = require('express-validator');

// Error logger middleware
const errorLogger = (err, req, res, next) => {
  // Log to external service (e.g., Sentry, LogRocket)
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(err);
  }
  
  next(err);
};

// CORS error handler
const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    const error = new AppError('CORS-Richtlinie blockiert diese Anfrage', 403, null, 'CORS_ERROR');
    return next(error);
  }
  next(err);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Middleware
  catchAsync,
  errorHandler,
  notFound,
  validationErrorHandler,
  errorLogger,
  corsErrorHandler,
  
  // Legacy exports for backward compatibility
  handleError: errorHandler
};