/**
 * client.service.js - Client service with business logic
 * Handles operations related to clients
 */

const Client = require('../models/client');
const Project = require('../models/project');
const BaseService = require('./base.service');
const { AppError } = require('../utils/error.utils');

class ClientService extends BaseService {
  /**
   * Create a new client
   * @param {Object} clientData - Client data
   * @param {Object} user - User creating the client
   * @returns {Promise<Object>} - Created client
   */
  static async createClient(clientData, user) {
    // Attach the user who created this client
    const data = {
      ...clientData,
      createdBy: user.id
    };
    
    return await this.create(Client, data, {
      populate: ['createdBy'],
      validateBeforeCreate: async (data) => {
        // Any custom validation before creating client
        if (data.email) {
          const existingEmail = await this.exists(Client, { email: data.email });
          if (existingEmail) {
            throw new AppError('Ein Kunde mit dieser E-Mail existiert bereits', 409);
          }
        }
      }
    });
  }
  
  /**
   * Get all clients with filtering
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Clients with pagination
   */
  static async getClients(filter = {}, options = {}) {
    // Prepare filter
    const queryFilter = { ...filter };
    
    // Handle name search with case-insensitive regex
    if (filter.name) {
      queryFilter.name = { $regex: filter.name, $options: 'i' };
      delete filter.name;
    }
    
    // Handle email search
    if (filter.email) {
      queryFilter.email = { $regex: filter.email, $options: 'i' };
      delete filter.email;
    }
    
    return await this.findAll(Client, queryFilter, {
      populate: ['createdBy'],
      ...options
    });
  }
  
  /**
   * Get a client by ID with related data
   * @param {String} id - Client ID
   * @returns {Promise<Object>} - Client with projects
   */
  static async getClientById(id) {
    return await this.findById(Client, id, {
      populate: [
        'createdBy',
        {
          path: 'projects',
          select: 'name startDate endDate status',
          options: { sort: { startDate: -1 } }
        }
      ],
      resourceName: 'Kunde'
    });
  }
  
  /**
   * Update a client
   * @param {String} id - Client ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated client
   */
  static async updateClient(id, updateData) {
    return await this.update(Client, id, updateData, {
      populate: ['createdBy'],
      resourceName: 'Kunde',
      validateBeforeUpdate: async (data, existingClient) => {
        // Check if email is being changed and already exists
        if (data.email && data.email !== existingClient.email) {
          const existingEmail = await this.exists(Client, { 
            email: data.email,
            _id: { $ne: id } // Exclude current client
          });
          
          if (existingEmail) {
            throw new AppError('Ein Kunde mit dieser E-Mail existiert bereits', 409);
          }
        }
      }
    });
  }
  
  /**
   * Delete a client
   * @param {String} id - Client ID
   * @returns {Promise<Boolean>} - True if client deleted
   */
  static async deleteClient(id) {
    return await this.delete(Client, id, {
      resourceName: 'Kunde',
      validateBeforeDelete: async (client) => {
        // Check if client has associated projects
        const projectCount = await Project.countDocuments({ client: id });
        
        if (projectCount > 0) {
          throw new AppError(
            `Der Kunde kann nicht gelöscht werden, da ${projectCount} Projekte mit diesem Kunden verknüpft sind.`,
            400
          );
        }
      }
    });
  }
  
  /**
   * Get client statistics
   * @returns {Promise<Object>} - Statistics
   */
  static async getClientStats() {
    // Total clients
    const totalClients = await Client.countDocuments();
    
    // Clients by type
    const clientsByType = await this.aggregate(Client, [
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Recent clients
    const recentClients = await Client.find()
      .select('name type email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);
    
    return {
      totalClients,
      clientsByType,
      recentClients
    };
  }
}

module.exports = ClientService;