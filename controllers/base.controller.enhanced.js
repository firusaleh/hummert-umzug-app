// controllers/base.controller.enhanced.js - Enhanced base controller with improved error handling
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Enhanced base controller with comprehensive error handling and utilities
 */
class BaseController {
  /**
   * Standard success response
   */
  static success(res, data = null, message = 'Operation erfolgreich', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null && data !== undefined) {
      response.data = data;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Standard error response
   */
  static error(res, message = 'Operation fehlgeschlagen', statusCode = 500, errors = null, details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (errors) {
      response.errors = errors;
    }
    
    if (details && process.env.NODE_ENV === 'development') {
      response.details = details;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * Handle validation errors from express-validator
   */
  static handleValidationErrors(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));
      return this.error(res, 'Validierung fehlgeschlagen', 400, formattedErrors);
    }
    return null;
  }

  /**
   * Async handler wrapper with error catching
   */
  static asyncHandler(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        console.error('Controller error:', error);
        this.handleError(res, error);
      }
    };
  }

  /**
   * Create filter object with security sanitization
   */
  static createFilter(query, config = {}) {
    const filter = {};
    const { 
      allowedFields = [], 
      searchFields = ['name', 'description'],
      dateFields = [],
      numericFields = [],
      booleanFields = [],
      arrayFields = []
    } = config;
    
    // Process allowed fields
    for (const field of allowedFields) {
      if (query[field] === undefined || query[field] === '') continue;
      
      const value = query[field];
      
      // Date fields
      if (dateFields.includes(field)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          filter[field] = date;
        }
      }
      // Numeric fields
      else if (numericFields.includes(field)) {
        const num = Number(value);
        if (!isNaN(num)) {
          filter[field] = num;
        }
      }
      // Boolean fields
      else if (booleanFields.includes(field)) {
        filter[field] = value === 'true' || value === true;
      }
      // Array fields (comma-separated or actual array)
      else if (arrayFields.includes(field)) {
        filter[field] = {
          $in: Array.isArray(value) ? value : value.split(',').map(v => v.trim())
        };
      }
      // Regular fields
      else {
        filter[field] = this.sanitizeInput(value);
      }
    }
    
    // Handle search
    if (query.search && searchFields.length > 0) {
      const searchRegex = { $regex: this.sanitizeInput(query.search), $options: 'i' };
      filter.$or = searchFields.map(field => ({ [field]: searchRegex }));
    }
    
    // Handle date ranges
    if (query.startDate || query.endDate) {
      const dateField = query.dateField || 'createdAt';
      filter[dateField] = {};
      
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        if (!isNaN(startDate.getTime())) {
          filter[dateField].$gte = startDate;
        }
      }
      
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        if (!isNaN(endDate.getTime())) {
          filter[dateField].$lte = endDate;
        }
      }
    }
    
    return filter;
  }

  /**
   * Enhanced pagination with validation
   */
  static createPagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
    
    return { page, limit, skip };
  }

  /**
   * Create sort object with validation
   */
  static createSort(query, allowedFields = []) {
    const sort = {};
    
    if (query.sortBy) {
      const parts = query.sortBy.split(':');
      const field = parts[0];
      const order = parts[1] || 'asc';
      
      // Validate sort field if allowedFields provided
      if (allowedFields.length === 0 || allowedFields.includes(field)) {
        sort[field] = order === 'desc' ? -1 : 1;
      }
    } else {
      // Default sort
      sort.createdAt = -1;
    }
    
    return sort;
  }

  /**
   * Enhanced paginated response with metadata
   */
  static paginatedResponse(data, total, pagination, additionalData = {}) {
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      success: true,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalItems: total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1
      },
      ...additionalData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Role-based authorization
   */
  static authorize(req, res, requiredRoles = [], options = {}) {
    const { requireOwnership = false, ownerField = 'userId' } = options;
    
    if (!req.user) {
      return this.error(res, 'Authentifizierung erforderlich', 401);
    }
    
    // Check role
    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      // Admin can always access
      if (req.user.role !== 'admin') {
        return this.error(res, 'Keine ausreichenden Berechtigungen', 403);
      }
    }
    
    // Check ownership if required
    if (requireOwnership && req.params.id) {
      const isOwner = req.resource && req.resource[ownerField]?.toString() === req.user._id.toString();
      if (!isOwner && req.user.role !== 'admin') {
        return this.error(res, 'Zugriff verweigert', 403);
      }
    }
    
    return null;
  }

  /**
   * Comprehensive error handler
   */
  static handleError(res, error, defaultMessage = 'Serverfehler') {
    console.error('Error details:', error);
    
    // MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      return this.error(res, `${field} existiert bereits`, 400);
    }
    
    // MongoDB validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return this.error(res, 'Validierung fehlgeschlagen', 400, errors);
    }
    
    // MongoDB cast error (invalid ID)
    if (error.name === 'CastError') {
      return this.error(res, 'Ungültiges ID-Format', 400);
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return this.error(res, 'Ungültiger Token', 401);
    }
    
    if (error.name === 'TokenExpiredError') {
      return this.error(res, 'Token abgelaufen', 401);
    }
    
    // Custom application errors
    if (error.statusCode && error.message) {
      return this.error(res, error.message, error.statusCode);
    }
    
    // Default error
    return this.error(
      res, 
      error.message || defaultMessage, 
      error.statusCode || 500,
      null,
      error.stack
    );
  }

  /**
   * Transaction wrapper for complex operations
   */
  static async withTransaction(callback) {
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
   * Input sanitization
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags and dangerous characters
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[<>\"\']/g, '');
  }

  /**
   * Format response data
   */
  static formatResponseData(data, fields = []) {
    if (!data) return null;
    
    if (Array.isArray(data)) {
      return data.map(item => this.formatResponseData(item, fields));
    }
    
    // If it's a Mongoose document, convert to plain object
    const plainData = data.toObject ? data.toObject() : data;
    
    // If no specific fields requested, return all
    if (fields.length === 0) {
      return plainData;
    }
    
    // Return only requested fields
    const formatted = {};
    for (const field of fields) {
      if (field.includes('.')) {
        // Handle nested fields
        const parts = field.split('.');
        let value = plainData;
        for (const part of parts) {
          value = value?.[part];
        }
        formatted[field] = value;
      } else {
        formatted[field] = plainData[field];
      }
    }
    
    return formatted;
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Get resource by ID with error handling
   */
  static async getResourceById(Model, id, populateOptions = null) {
    if (!this.isValidObjectId(id)) {
      throw { statusCode: 400, message: 'Ungültige ID' };
    }
    
    let query = Model.findById(id);
    
    if (populateOptions) {
      query = query.populate(populateOptions);
    }
    
    const resource = await query;
    
    if (!resource) {
      throw { statusCode: 404, message: 'Ressource nicht gefunden' };
    }
    
    return resource;
  }

  /**
   * Batch operation handler
   */
  static async batchOperation(Model, operation, ids, data = {}) {
    const validIds = ids.filter(id => this.isValidObjectId(id));
    
    if (validIds.length === 0) {
      throw { statusCode: 400, message: 'Keine gültigen IDs angegeben' };
    }
    
    const operations = {
      update: () => Model.updateMany({ _id: { $in: validIds } }, data),
      delete: () => Model.deleteMany({ _id: { $in: validIds } }),
      activate: () => Model.updateMany({ _id: { $in: validIds } }, { isActive: true }),
      deactivate: () => Model.updateMany({ _id: { $in: validIds } }, { isActive: false })
    };
    
    if (!operations[operation]) {
      throw { statusCode: 400, message: 'Ungültige Batch-Operation' };
    }
    
    const result = await operations[operation]();
    
    return {
      processed: validIds.length,
      modified: result.modifiedCount || result.deletedCount || 0
    };
  }

  /**
   * File upload handler
   */
  static handleFileUpload(req, res, options = {}) {
    const { 
      fieldName = 'file',
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    } = options;
    
    if (!req.files || !req.files[fieldName]) {
      return this.error(res, 'Keine Datei hochgeladen', 400);
    }
    
    const file = req.files[fieldName];
    
    // Check file size
    if (file.size > maxSize) {
      return this.error(res, `Datei zu groß. Maximum: ${maxSize / 1024 / 1024}MB`, 400);
    }
    
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return this.error(res, 'Ungültiger Dateityp', 400);
    }
    
    return file;
  }

  /**
   * Send email notification
   */
  static async sendNotification(userId, type, data) {
    try {
      const Benachrichtigung = require('../models/benachrichtigung.model');
      
      await Benachrichtigung.create({
        empfaenger: userId,
        typ: type,
        titel: data.titel,
        inhalt: data.inhalt,
        bezug: data.bezug
      });
      
      // Could also send email here
      // await emailService.send(...);
      
    } catch (error) {
      console.error('Notification error:', error);
      // Don't throw - notifications shouldn't break the main operation
    }
  }
}

module.exports = BaseController;