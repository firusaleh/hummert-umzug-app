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
 * Main error handling middleware
 */
module.exports = (err, req, res, next) => {
  console.log(err.stack);

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
