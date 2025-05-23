/**
 * error.middleware.js - Global error handling middleware
 * Provides centralized error handling for the application
 */

const { 
  sendErrorDev, 
  sendErrorProd, 
  handleMongooseValidationError, 
  handleDuplicateKeyError, 
  AppError 
} = require('../utils/error.utils');

/**
 * Handle Cast Errors (invalid IDs in MongoDB)
 */
const handleCastError = err => {
  const message = `Ungültiger Wert '${err.value}' für ${err.path}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Token Errors
 */
const handleJWTError = () => {
  return new AppError('Ungültiges Token. Bitte melden Sie sich erneut an.', 401);
};

/**
 * Handle JWT Expiration Errors
 */
const handleJWTExpiredError = () => {
  return new AppError('Token abgelaufen. Bitte melden Sie sich erneut an.', 401);
};

/**
 * Log specific errors for certain routes to help debugging
 */
const logSpecificError = (err, req) => {
  // Log Fahrzeug validation errors with more detail
  if (req.originalUrl.includes('/fahrzeuge') && err.errors) {
    console.log('⚠️ Fahrzeug Validation Error:', {
      path: req.path,
      method: req.method,
      body: req.body,
      errors: err.errors
    });
  }
}

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.log(err.stack);
  
  // Log specialized errors
  logSpecificError(err, req);

  err.statusCode = err.statusCode || 500;
  
  // Different error handling for development vs production
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err, name: err.name, message: err.message };
    
    // Handle specific error types
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.name === 'ValidationError') error = handleMongooseValidationError(error);
    if (error.code === 11000) error = handleDuplicateKeyError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
