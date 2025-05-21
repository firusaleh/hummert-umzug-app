/**
 * error.utils.js - Standardized error handling utilities
 * Provides consistent error handling throughout the application
 */

/**
 * Custom error class for operational errors (expected errors)
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates this is a known, expected error
    this.errors = errors;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper to wrap async controller functions with consistent error handling
 * @param {Function} fn - The controller function to wrap
 * @returns {Function} - Wrapped function with error handling
 */
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Format and send error responses in development environment
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors || null,
    stack: err.stack,
    error: err
  });
};

/**
 * Format and send error responses in production environment
 * Sanitizes error information to avoid leaking sensitive details
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
  const statusCode = err.statusCode || 500;
  
  // Only send detailed info for operational errors
  if (err.isOperational) {
    res.status(statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  } else {
    // Programming or unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Ein unerwarteter Fehler ist aufgetreten',
      errors: null
    });
  }
};

/**
 * Creates a validation error from express-validator results
 * @param {Object} errors - The validation errors from express-validator
 * @returns {AppError} - A formatted AppError with validation details
 */
const createValidationError = (errors) => {
  return new AppError(
    'Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.',
    400,
    errors.array()
  );
};

/**
 * Creates a not found error for a specific resource
 * @param {String} resource - The name of the resource that wasn't found
 * @returns {AppError} - A formatted AppError for a 404 not found
 */
const createNotFoundError = (resource = 'Ressource') => {
  return new AppError(`${resource} wurde nicht gefunden`, 404);
};

/**
 * Creates an unauthorized error
 * @param {String} message - Custom message (optional)
 * @returns {AppError} - A formatted AppError for a 401 unauthorized
 */
const createUnauthorizedError = (message = 'Nicht authentifiziert') => {
  return new AppError(message, 401);
};

/**
 * Creates a forbidden error
 * @param {String} message - Custom message (optional)
 * @returns {AppError} - A formatted AppError for a 403 forbidden
 */
const createForbiddenError = (message = 'Keine Berechtigung für diese Aktion') => {
  return new AppError(message, 403);
};

/**
 * Formats mongoose validation errors into a standardized structure
 * @param {Error} err - Mongoose validation error
 * @returns {AppError} - A formatted AppError
 */
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message
  }));
  
  return new AppError(
    'Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.',
    400,
    errors
  );
};

/**
 * Handles MongoDB duplicate key errors
 * @param {Error} err - MongoDB duplicate key error
 * @returns {AppError} - A formatted AppError
 */
const handleDuplicateKeyError = (err) => {
  // Extract field name (key) from the error
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  // Customize error message for specific fields
  let message = `Dieser Wert existiert bereits`;
  let displayName = field;
  
  // Specific error for Fahrzeug kennzeichen
  if (field === 'kennzeichen') {
    message = `Dieses Kennzeichen ist bereits vergeben`;
    displayName = 'Kennzeichen';
  }
  
  return new AppError(
    `Der Wert '${value}' für '${displayName}' wird bereits verwendet.`,
    409, // Conflict status code
    [{ field, message }]
  );
};

module.exports = {
  AppError,
  catchAsync,
  sendErrorDev,
  sendErrorProd,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  handleMongooseValidationError,
  handleDuplicateKeyError
};
