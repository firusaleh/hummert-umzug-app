/**
 * base.service.js - Base service class with common functionality
 * Provides reusable methods for CRUD operations and error handling
 */

const { AppError, createNotFoundError } = require('../utils/error.utils');

class BaseService {
  /**
   * Find a document by ID with optional population and projection
   * @param {Model} model - Mongoose model
   * @param {String} id - Document ID
   * @param {Object} options - Options for the operation
   * @returns {Promise<Document>} - The found document
   * @throws {AppError} - If document not found
   */
  static async findById(model, id, options = {}) {
    const { 
      populate = [], 
      select = '', 
      lean = false, 
      resourceName = 'Ressource',
      throwIfNotFound = true
    } = options;
    
    if (!id) {
      throw new AppError('ID ist erforderlich', 400);
    }
    
    let query = model.findById(id);
    
    if (select) {
      query = query.select(select);
    }
    
    if (populate && populate.length > 0) {
      // Handle an array of population objects or strings
      populate.forEach(field => {
        if (typeof field === 'string') {
          query = query.populate(field);
        } else {
          query = query.populate(field);
        }
      });
    }
    
    if (lean) {
      query = query.lean();
    }
    
    const doc = await query;
    
    if (!doc && throwIfNotFound) {
      throw createNotFoundError(resourceName);
    }
    
    return doc;
  }
  
  /**
   * Find all documents with options for filtering, pagination, sorting
   * @param {Model} model - Mongoose model
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Options for the operation
   * @returns {Promise<{data: Document[], pagination: Object}>} - Paginated results
   */
  static async findAll(model, filter = {}, options = {}) {
    const {
      populate = [],
      select = '',
      lean = false,
      sort = { createdAt: -1 },
      limit = 100,
      skip = 0,
      count = true
    } = options;
    
    let query = model.find(filter);
    
    if (select) {
      query = query.select(select);
    }
    
    if (populate && populate.length > 0) {
      populate.forEach(field => {
        if (typeof field === 'string') {
          query = query.populate(field);
        } else {
          query = query.populate(field);
        }
      });
    }
    
    query = query.sort(sort).skip(skip).limit(limit);
    
    if (lean) {
      query = query.lean();
    }
    
    const [data, total] = await Promise.all([
      query,
      count ? model.countDocuments(filter) : undefined
    ]);
    
    return {
      data,
      pagination: count ? {
        total,
        limit,
        skip,
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(skip / limit) + 1
      } : undefined
    };
  }
  
  /**
   * Create a new document
   * @param {Model} model - Mongoose model
   * @param {Object} data - Document data
   * @param {Object} options - Options for the operation
   * @returns {Promise<Document>} - The created document
   */
  static async create(model, data, options = {}) {
    const { 
      populate = [], 
      select = '',
      validateBeforeCreate = null
    } = options;
    
    // Execute custom validation if provided
    if (typeof validateBeforeCreate === 'function') {
      await validateBeforeCreate(data);
    }
    
    let doc = await model.create(data);
    
    if (populate.length > 0 || select) {
      // Reload the document to apply population and selection
      const query = model.findById(doc._id);
      
      if (select) {
        query.select(select);
      }
      
      if (populate && populate.length > 0) {
        populate.forEach(field => {
          if (typeof field === 'string') {
            query.populate(field);
          } else {
            query.populate(field);
          }
        });
      }
      
      doc = await query;
    }
    
    return doc;
  }
  
  /**
   * Update a document by ID
   * @param {Model} model - Mongoose model
   * @param {String} id - Document ID
   * @param {Object} data - Update data
   * @param {Object} options - Options for the operation
   * @returns {Promise<Document>} - The updated document
   * @throws {AppError} - If document not found
   */
  static async update(model, id, data, options = {}) {
    const { 
      populate = [], 
      select = '', 
      runValidators = true,
      resourceName = 'Ressource',
      validateBeforeUpdate = null
    } = options;
    
    // First check if document exists
    const exists = await model.findById(id);
    if (!exists) {
      throw createNotFoundError(resourceName);
    }
    
    // Execute custom validation if provided
    if (typeof validateBeforeUpdate === 'function') {
      await validateBeforeUpdate(data, exists);
    }
    
    // Update the document
    const query = model.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators
      }
    );
    
    if (select) {
      query.select(select);
    }
    
    if (populate && populate.length > 0) {
      populate.forEach(field => {
        if (typeof field === 'string') {
          query.populate(field);
        } else {
          query.populate(field);
        }
      });
    }
    
    const doc = await query;
    return doc;
  }
  
  /**
   * Delete a document by ID
   * @param {Model} model - Mongoose model
   * @param {String} id - Document ID
   * @param {Object} options - Options for the operation
   * @returns {Promise<Boolean>} - True if document was deleted
   * @throws {AppError} - If document not found
   */
  static async delete(model, id, options = {}) {
    const { 
      resourceName = 'Ressource',
      validateBeforeDelete = null
    } = options;
    
    // First check if document exists
    const doc = await model.findById(id);
    if (!doc) {
      throw createNotFoundError(resourceName);
    }
    
    // Execute custom validation if provided
    if (typeof validateBeforeDelete === 'function') {
      await validateBeforeDelete(doc);
    }
    
    await doc.deleteOne();
    return true;
  }
  
  /**
   * Check if a document exists
   * @param {Model} model - Mongoose model
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Boolean>} - True if document exists
   */
  static async exists(model, filter) {
    const count = await model.countDocuments(filter).limit(1);
    return count > 0;
  }
  
  /**
   * Execute an aggregation pipeline
   * @param {Model} model - Mongoose model
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} - Aggregation results
   */
  static async aggregate(model, pipeline) {
    return await model.aggregate(pipeline);
  }
}

module.exports = BaseService;