// middleware/pagination.js - Comprehensive pagination middleware
const mongoose = require('mongoose');

// Offset-based pagination middleware (traditional page navigation)
const paginateOffset = (defaultLimit = 10, maxLimit = 100) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
    const skip = (page - 1) * limit;
    
    // Sort configuration
    let sort = {};
    if (req.query.sortBy) {
      const sortParts = req.query.sortBy.split(':');
      const sortField = sortParts[0];
      const sortOrder = sortParts[1] === 'desc' ? -1 : 1;
      sort[sortField] = sortOrder;
    } else {
      sort = { createdAt: -1 }; // Default sort
    }
    
    // Filter configuration
    let filter = {};
    
    // Common filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { 'kunde.name': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }
    
    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      skip,
      sort,
      filter
    };
    
    next();
  };
};

// Cursor-based pagination middleware (infinite scroll / real-time data)
const paginateCursor = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
    const cursor = req.query.cursor;
    const direction = req.query.direction || 'next'; // 'next' or 'prev'
    
    // Sort configuration (always needs a unique field for cursor)
    let sort = { _id: -1 }; // Default sort by _id
    
    if (req.query.sortBy) {
      const sortParts = req.query.sortBy.split(':');
      const sortField = sortParts[0];
      const sortOrder = sortParts[1] === 'desc' ? -1 : 1;
      sort = { [sortField]: sortOrder, _id: sortOrder };
    }
    
    // Cursor filter
    let cursorFilter = {};
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        
        if (direction === 'next') {
          cursorFilter = {
            $or: [
              { [Object.keys(sort)[0]]: { $lt: decodedCursor.value } },
              {
                [Object.keys(sort)[0]]: decodedCursor.value,
                _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
              }
            ]
          };
        } else {
          cursorFilter = {
            $or: [
              { [Object.keys(sort)[0]]: { $gt: decodedCursor.value } },
              {
                [Object.keys(sort)[0]]: decodedCursor.value,
                _id: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) }
              }
            ]
          };
          // Reverse sort for previous page
          Object.keys(sort).forEach(key => {
            sort[key] = -sort[key];
          });
        }
      } catch (error) {
        // Invalid cursor, ignore
      }
    }
    
    // Additional filters
    let filter = { ...cursorFilter };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.search) {
      filter.$and = [
        cursorFilter,
        {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } }
          ]
        }
      ];
    }
    
    req.pagination = {
      limit,
      sort,
      filter,
      cursor,
      direction
    };
    
    next();
  };
};

// Helper function to create paginated response for offset pagination
const createPaginatedResponse = async (Model, query, pagination) => {
  const { page, limit, skip, sort, filter } = pagination;
  
  // Execute queries in parallel
  const [data, totalCount] = await Promise.all([
    Model.find({ ...query, ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Model.countDocuments({ ...query, ...filter })
  ]);
  
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
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
    }
  };
};

// Helper function to create paginated response for cursor pagination
const createCursorPaginatedResponse = async (Model, query, pagination) => {
  const { limit, sort, filter, direction } = pagination;
  
  // Fetch one extra document to check if there's more data
  const data = await Model.find({ ...query, ...filter })
    .sort(sort)
    .limit(limit + 1)
    .lean();
  
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
    const sortField = Object.keys(sort)[0];
    
    if (hasMore || direction === 'prev') {
      const lastItem = data[data.length - 1];
      nextCursor = Buffer.from(JSON.stringify({
        value: lastItem[sortField],
        id: lastItem._id.toString()
      })).toString('base64');
    }
    
    const firstItem = data[0];
    prevCursor = Buffer.from(JSON.stringify({
      value: firstItem[sortField],
      id: firstItem._id.toString()
    })).toString('base64');
  }
  
  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
      prevCursor,
      limit
    }
  };
};

// Sorting middleware
const sortMiddleware = (allowedFields = []) => {
  return (req, res, next) => {
    const sortBy = req.query.sortBy;
    
    if (sortBy) {
      const [field, order] = sortBy.split(':');
      
      if (allowedFields.length > 0 && !allowedFields.includes(field)) {
        return res.status(400).json({
          success: false,
          message: `Sortierung nach ${field} nicht erlaubt`
        });
      }
      
      req.sort = { [field]: order === 'desc' ? -1 : 1 };
    } else {
      req.sort = { createdAt: -1 }; // Default sort
    }
    
    next();
  };
};

// Filtering middleware
const filterMiddleware = (filterConfig = {}) => {
  return (req, res, next) => {
    const filter = {};
    
    // Apply configured filters
    Object.keys(filterConfig).forEach(key => {
      const value = req.query[key];
      if (value !== undefined) {
        const filterType = filterConfig[key];
        
        switch (filterType) {
          case 'exact':
            filter[key] = value;
            break;
          case 'regex':
            filter[key] = { $regex: value, $options: 'i' };
            break;
          case 'number':
            filter[key] = parseInt(value);
            break;
          case 'date':
            filter[key] = new Date(value);
            break;
          case 'dateRange':
            if (req.query[`${key}Start`] || req.query[`${key}End`]) {
              filter[key] = {};
              if (req.query[`${key}Start`]) {
                filter[key].$gte = new Date(req.query[`${key}Start`]);
              }
              if (req.query[`${key}End`]) {
                filter[key].$lte = new Date(req.query[`${key}End`]);
              }
            }
            break;
          case 'array':
            filter[key] = { $in: value.split(',') };
            break;
          default:
            filter[key] = value;
        }
      }
    });
    
    req.filter = filter;
    next();
  };
};

// Search middleware
const searchMiddleware = (searchFields = []) => {
  return (req, res, next) => {
    const search = req.query.search;
    
    if (search && searchFields.length > 0) {
      req.filter = {
        ...req.filter,
        $or: searchFields.map(field => ({
          [field]: { $regex: search, $options: 'i' }
        }))
      };
    }
    
    next();
  };
};

module.exports = {
  paginateOffset,
  paginateCursor,
  createPaginatedResponse,
  createCursorPaginatedResponse,
  sortMiddleware,
  filterMiddleware,
  searchMiddleware
};