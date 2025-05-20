/**
 * clientController.js - Client controller with standardized error handling
 * Handles HTTP requests related to clients
 */

const ClientService = require('../services/client.service');
const { catchAsync, createValidationError } = require('../utils/error.utils');
const { validationResult } = require('express-validator');

/**
 * @desc    Create a new client
 * @route   POST /api/clients
 * @access  Private
 */
exports.createClient = catchAsync(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }
  
  const client = await ClientService.createClient(req.body, req.user);
  
  res.status(201).json({
    success: true,
    data: client
  });
});

/**
 * @desc    Get all clients
 * @route   GET /api/clients
 * @access  Private
 */
exports.getClients = catchAsync(async (req, res) => {
  const { name, type, email, page = 1, limit = 25, sort } = req.query;
  
  // Prepare filter
  const filter = {};
  
  if (name) filter.name = name;
  if (type) filter.type = type;
  if (email) filter.email = email;
  
  // Prepare options
  const options = {
    limit: parseInt(limit, 10),
    skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    sort: sort ? JSON.parse(sort) : { createdAt: -1 }
  };
  
  const { data: clients, pagination } = await ClientService.getClients(filter, options);
  
  res.status(200).json({
    success: true,
    count: clients.length,
    pagination,
    data: clients
  });
});

/**
 * @desc    Get client by ID
 * @route   GET /api/clients/:id
 * @access  Private
 */
exports.getClientById = catchAsync(async (req, res) => {
  const client = await ClientService.getClientById(req.params.id);
  
  res.status(200).json({
    success: true,
    data: client
  });
});

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 * @access  Private
 */
exports.updateClient = catchAsync(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }
  
  const client = await ClientService.updateClient(req.params.id, req.body);
  
  res.status(200).json({
    success: true,
    data: client
  });
});

/**
 * @desc    Delete client
 * @route   DELETE /api/clients/:id
 * @access  Private
 */
exports.deleteClient = catchAsync(async (req, res) => {
  await ClientService.deleteClient(req.params.id);
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Get client statistics
 * @route   GET /api/clients/stats
 * @access  Private/Admin
 */
exports.getClientStats = catchAsync(async (req, res) => {
  const stats = await ClientService.getClientStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});