// middleware/error.middleware.js
const { formatValidationErrors } = require('./validators/common.validators');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Development error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    errors: err.errors
  });
};

// Production error response
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Ein Fehler ist aufgetreten!'
    });
  }
};

// Handle specific error types
const handleCastErrorDB = (err) => {
  const message = `Ungültige ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Doppelter Feldwert: ${value}. Bitte verwenden Sie einen anderen Wert!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Ungültige Eingabedaten. ${errors.join('. ')}`;
  return new AppError(message, 400, errors);
};

const handleJWTError = () =>
  new AppError('Ungültiger Token. Bitte melden Sie sich erneut an!', 401);

const handleJWTExpiredError = () =>
  new AppError('Ihr Token ist abgelaufen! Bitte melden Sie sich erneut an.', 401);

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error 💥:', err);
  }
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new AppError(`Die angeforderte URL ${req.originalUrl} wurde nicht gefunden`, 404);
  next(err);
};

module.exports = {
  AppError,
  catchAsync,
  errorHandler,
  notFound
};