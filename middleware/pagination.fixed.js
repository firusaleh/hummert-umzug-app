// middleware/pagination.fixed.js - Enhanced pagination middleware with error handling
const mongoose = require('mongoose');

// Custom error for pagination issues
class PaginationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PaginationError';
    this.statusCode = statusCode;
  }
}

// Validate and sanitize pagination parameters
const sanitizePaginationParams = {
  page: (value, defaultValue = 1) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < 1) return defaultValue;
    return parsed;
  },
  
  limit: (value, defaultValue = 10, maxValue = 100) => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < 1) return defaultValue;
    return Math.min(parsed, maxValue);
  },
  
  sortBy: (value, allowedFields = []) => {
    if (!value) return null;
    
    const [field, order] = value.split(':');
    
    if (allowedFields.length > 0 && !allowedFields.includes(field)) {
      throw new PaginationError(`Sortierung nach '${field}' nicht erlaubt`);
    }
    
    return {
      field,
      order: order === 'desc' ? -1 : 1
    };
  }
};

// Offset-based pagination middleware (traditional page navigation)
const paginateOffset = (options = {}) => {
  const {
    defaultLimit = 10,
    maxLimit = 100,
    allowedSortFields = [],
    defaultSort = { createdAt: -1 }
  } = options;
  
  return (req, res, next) => {
    try {
      // Sanitize pagination parameters
      const page = sanitizePaginationParams.page(req.query.page);
      const limit = sanitizePaginationParams.limit(req.query.limit, defaultLimit, maxLimit);
      const skip = (page - 1) * limit;
      
      // Handle sorting
      let sort = defaultSort;
      if (req.query.sortBy) {
        const sortConfig = sanitizePaginationParams.sortBy(req.query.sortBy, allowedSortFields);
        if (sortConfig) {
          sort = { [sortConfig.field]: sortConfig.order };
        }
      }
      
      // Add pagination info to request
      req.pagination = {
        page,
        limit,
        skip,
        sort
      };
      
      // Initialize filter object
      req.filters = {};
      
      // Handle common filters
      if (req.query.status) {
        req.filters.status = req.query.status;
      }
      
      // Handle search across multiple fields
      if (req.query.search) {
        req.searchTerm = req.query.search;
      }
      
      // Handle date range filters
      if (req.query.startDate || req.query.endDate) {
        req.filters.dateRange = {
          startDate: req.query.startDate ? new Date(req.query.startDate) : null,
          endDate: req.query.endDate ? new Date(req.query.endDate) : null
        };
      }
      
      next();
    } catch (error) {
      if (error instanceof PaginationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: 'PAGINATION_ERROR'
        });
      }
      next(error);
    }
  };
};

// Cursor-based pagination middleware (infinite scroll / real-time data)
const paginateCursor = (options = {}) => {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    allowedSortFields = [],
    defaultSort = { _id: -1 }
  } = options;
  
  return (req, res, next) => {
    try {
      const limit = sanitizePaginationParams.limit(req.query.limit, defaultLimit, maxLimit);
      const cursor = req.query.cursor;
      const direction = req.query.direction || 'next';
      
      // Validate direction
      if (!['next', 'prev'].includes(direction)) {
        throw new PaginationError('Ungültige Richtung. Erlaubt sind: next, prev');
      }
      
      // Handle sorting (always needs a unique field for cursor)
      let sort = defaultSort;
      if (req.query.sortBy) {
        const sortConfig = sanitizePaginationParams.sortBy(req.query.sortBy, allowedSortFields);
        if (sortConfig) {
          sort = { 
            [sortConfig.field]: sortConfig.order, 
            _id: sortConfig.order 
          };
        }
      }
      
      // Parse and validate cursor
      let cursorFilter = {};
      if (cursor) {
        try {
          const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
          
          if (!decodedCursor.value || !decodedCursor.id) {
            throw new Error('Invalid cursor structure');
          }
          
          const sortField = Object.keys(sort)[0];
          const sortDirection = sort[sortField];
          
          if (direction === 'next') {
            cursorFilter = sortDirection === -1 ? {
              $or: [
                { [sortField]: { $lt: decodedCursor.value } },
                {
                  [sortField]: decodedCursor.value,
                  _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
                }
              ]
            } : {
              $or: [
                { [sortField]: { $gt: decodedCursor.value } },
                {
                  [sortField]: decodedCursor.value,
                  _id: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) }
                }
              ]
            };
          } else {
            // Reverse for previous page
            cursorFilter = sortDirection === -1 ? {
              $or: [
                { [sortField]: { $gt: decodedCursor.value } },
                {
                  [sortField]: decodedCursor.value,
                  _id: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) }
                }
              ]
            } : {
              $or: [
                { [sortField]: { $lt: decodedCursor.value } },
                {
                  [sortField]: decodedCursor.value,
                  _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
                }
              ]
            };
            
            // Reverse sort for previous page
            Object.keys(sort).forEach(key => {
              sort[key] = -sort[key];
            });
          }
        } catch (error) {
          throw new PaginationError('Ungültiger Cursor');
        }
      }
      
      req.pagination = {
        limit,
        sort,
        cursor,
        direction,
        cursorFilter
      };
      
      // Initialize filters
      req.filters = { ...cursorFilter };
      
      next();
    } catch (error) {
      if (error instanceof PaginationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: 'PAGINATION_ERROR'
        });
      }
      next(error);
    }
  };
};

// Helper function to create offset-based pagination response
const createOffsetPaginationResponse = async (query, countQuery, req) => {
  try {
    const { page, limit, skip } = req.pagination;
    
    // Execute queries in parallel
    const [data, totalCount] = await Promise.all([
      query.skip(skip).limit(limit),
      countQuery
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    };
  } catch (error) {
    throw new Error('Fehler beim Erstellen der paginierten Antwort: ' + error.message);
  }
};

// Helper function to create cursor-based pagination response
const createCursorPaginationResponse = async (query, req, defaultSortField = '_id') => {
  try {
    const { limit, sort, direction } = req.pagination;
    
    // Fetch one extra document to check if there's more data
    const data = await query.limit(limit + 1);
    
    const hasMore = data.length > limit;
    if (hasMore) {
      data.pop(); // Remove the extra document
    }
    
    // Reverse data if fetching previous page
    if (direction === 'prev') {
      data.reverse();
    }
    
    // Create cursors
    let nextCursor = null;
    let prevCursor = null;
    
    if (data.length > 0) {
      const sortField = Object.keys(sort)[0] || defaultSortField;
      
      // Next cursor
      if (hasMore || direction === 'prev') {
        const lastItem = data[data.length - 1];
        nextCursor = Buffer.from(JSON.stringify({
          value: lastItem[sortField],
          id: lastItem._id.toString()
        })).toString('base64');
      }
      
      // Previous cursor
      if (data.length > 0) {
        const firstItem = data[0];
        prevCursor = Buffer.from(JSON.stringify({
          value: firstItem[sortField],
          id: firstItem._id.toString()
        })).toString('base64');
      }
    }
    
    return {
      success: true,
      data,
      pagination: {
        hasMore,
        nextCursor,
        prevCursor,
        limit,
        direction,
        count: data.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    };
  } catch (error) {
    throw new Error('Fehler beim Erstellen der Cursor-paginierten Antwort: ' + error.message);
  }
};

// Create search filter helper
const createSearchFilter = (searchTerm, fields = []) => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }
  
  const searchRegex = new RegExp(searchTerm, 'i');
  
  return {
    $or: fields.map(field => ({
      [field]: searchRegex
    }))
  };
};

// Create date range filter helper
const createDateRangeFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  
  if (startDate || endDate) {
    filter[field] = {};
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter[field].$gte = start;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  
  return filter;
};

// Advanced filtering middleware
const createFilterMiddleware = (filterConfig = {}) => {
  return (req, res, next) => {
    try {
      const filters = req.filters || {};
      
      Object.entries(filterConfig).forEach(([key, config]) => {
        const value = req.query[key];
        
        if (value !== undefined && value !== '') {
          switch (config.type) {
            case 'exact':
              filters[config.field || key] = value;
              break;
              
            case 'regex':
              filters[config.field || key] = {
                $regex: value,
                $options: config.options || 'i'
              };
              break;
              
            case 'number':
              const num = Number(value);
              if (!isNaN(num)) {
                filters[config.field || key] = num;
              }
              break;
              
            case 'boolean':
              filters[config.field || key] = value === 'true';
              break;
              
            case 'date':
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                filters[config.field || key] = date;
              }
              break;
              
            case 'range':
              const rangeFilter = {};
              const minValue = req.query[`${key}Min`];
              const maxValue = req.query[`${key}Max`];
              
              if (minValue !== undefined) {
                rangeFilter.$gte = config.isNumber ? Number(minValue) : minValue;
              }
              if (maxValue !== undefined) {
                rangeFilter.$lte = config.isNumber ? Number(maxValue) : maxValue;
              }
              
              if (Object.keys(rangeFilter).length > 0) {
                filters[config.field || key] = rangeFilter;
              }
              break;
              
            case 'array':
              const arrayValue = Array.isArray(value) ? value : value.split(',');
              filters[config.field || key] = { $in: arrayValue };
              break;
              
            case 'custom':
              if (config.handler && typeof config.handler === 'function') {
                const customFilter = config.handler(value, req);
                if (customFilter) {
                  Object.assign(filters, customFilter);
                }
              }
              break;
              
            default:
              filters[config.field || key] = value;
          }
        }
      });
      
      req.filters = filters;
      next();
    } catch (error) {
      next(new PaginationError('Fehler beim Anwenden der Filter: ' + error.message));
    }
  };
};

// Sorting validation middleware
const validateSort = (allowedFields = []) => {
  return (req, res, next) => {
    try {
      if (req.query.sortBy && allowedFields.length > 0) {
        const [field] = req.query.sortBy.split(':');
        
        if (!allowedFields.includes(field)) {
          throw new PaginationError(
            `Sortierung nach '${field}' nicht erlaubt. Erlaubte Felder: ${allowedFields.join(', ')}`
          );
        }
      }
      
      next();
    } catch (error) {
      if (error instanceof PaginationError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: 'SORT_VALIDATION_ERROR'
        });
      }
      next(error);
    }
  };
};

module.exports = {
  // Main pagination middleware
  paginateOffset,
  paginateCursor,
  
  // Response helpers
  createOffsetPaginationResponse,
  createCursorPaginationResponse,
  
  // Filter helpers
  createSearchFilter,
  createDateRangeFilter,
  createFilterMiddleware,
  
  // Validation
  validateSort,
  
  // Error class
  PaginationError,
  
  // Legacy support
  createPaginatedResponse: createOffsetPaginationResponse
};