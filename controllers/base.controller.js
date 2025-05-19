// controllers/base.controller.js
const { validationResult } = require('express-validator');

/**
 * Base controller class that provides common functionality
 * for all controllers in the application
 */
class BaseController {
  /**
   * Standard response format for successful operations
   */
  static success(res, data = null, message = 'Operation successful', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data && { data }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Standard response format for errors
   */
  static error(res, message = 'Operation failed', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle validation errors from express-validator
   */
  static handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.error(res, 'Validation failed', 400, errors.array());
    }
    return null;
  }

  /**
   * Wrap async route handlers to catch errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create filter object from query parameters
   */
  static createFilter(query, allowedFields = []) {
    const filter = {};
    
    for (const field of allowedFields) {
      if (query[field] !== undefined) {
        // Handle different types of filters
        if (field.includes('Date') || field.includes('At')) {
          // Date fields
          filter[field] = new Date(query[field]);
        } else if (field === 'search') {
          // Search across multiple fields
          filter.$or = [
            { name: { $regex: query[field], $options: 'i' } },
            { description: { $regex: query[field], $options: 'i' } }
          ];
        } else {
          filter[field] = query[field];
        }
      }
    }
    
    return filter;
  }

  /**
   * Create pagination object from query parameters
   */
  static createPagination(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Format paginated response
   */
  static paginatedResponse(data, total, pagination) {
    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit)
      }
    };
  }

  /**
   * Check if user has required role
   */
  static authorize(req, res, requiredRoles = []) {
    if (!req.user) {
      return this.error(res, 'Authentication required', 401);
    }
    
    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      return this.error(res, 'Insufficient permissions', 403);
    }
    
    return null;
  }

  /**
   * Handle MongoDB duplicate key errors
   */
  static handleDuplicateKeyError(error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return `${field} already exists`;
    }
    return null;
  }

  /**
   * Handle MongoDB validation errors
   */
  static handleValidationError(error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return errors;
    }
    return null;
  }

  /**
   * Generic error handler
   */
  static handleError(res, error, defaultMessage = 'Server error') {
    console.error('Controller error:', error);
    
    // Handle specific error types
    const duplicateError = this.handleDuplicateKeyError(error);
    if (duplicateError) {
      return this.error(res, duplicateError, 400);
    }
    
    const validationErrors = this.handleValidationError(error);
    if (validationErrors) {
      return this.error(res, 'Validation failed', 400, validationErrors);
    }
    
    // Handle other known errors
    if (error.name === 'CastError') {
      return this.error(res, 'Invalid ID format', 400);
    }
    
    if (error.name === 'JsonWebTokenError') {
      return this.error(res, 'Invalid token', 401);
    }
    
    if (error.name === 'TokenExpiredError') {
      return this.error(res, 'Token expired', 401);
    }
    
    // Default error response
    return this.error(res, error.message || defaultMessage, error.statusCode || 500);
  }

  /**
   * Create transaction wrapper for complex operations
   */
  static async withTransaction(callback) {
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Format date for response
   */
  static formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString();
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Create sort object from query parameters
   */
  static createSort(query) {
    const sort = {};
    
    if (query.sortBy) {
      const parts = query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort
    }
    
    return sort;
  }
}

module.exports = BaseController;