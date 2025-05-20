// middleware/validators/benachrichtigung.validators.js
const Joi = require('joi');
const { validators, createValidationMiddleware } = require('./common.validators');

// Benachrichtigung (notification) schema for creation
const benachrichtigungSchemas = {
  create: Joi.object({
    empfaenger: validators.objectId.required()
      .messages({ 'any.required': 'Empfänger ist erforderlich' }),
    titel: validators.safeString.required()
      .messages({ 'any.required': 'Titel ist erforderlich' }),
    inhalt: validators.safeString.required()
      .messages({ 'any.required': 'Inhalt ist erforderlich' }),
    typ: Joi.string().valid('info', 'warnung', 'erinnerung', 'erfolg')
      .default('info'),
    linkUrl: validators.safeString.uri().optional(),
    bezug: Joi.object({
      typ: Joi.string().valid('umzug', 'aufnahme', 'mitarbeiter', 'task', 'system')
        .default('system'),
      id: validators.objectId.optional()
    }).optional()
  }),
  
  // Email notification schema
  email: Joi.object({
    empfaenger: validators.objectId.required()
      .messages({ 'any.required': 'Empfänger ist erforderlich' }),
    betreff: validators.safeString.required()
      .messages({ 'any.required': 'Betreff ist erforderlich' }),
    inhalt: validators.safeString.required()
      .messages({ 'any.required': 'Inhalt ist erforderlich' }),
    html: Joi.boolean().default(false)
  }),
  
  // Mass notification schema
  mass: Joi.object({
    empfaengerGruppe: Joi.string().valid('alle', 'mitarbeiter', 'spezifisch').optional(),
    empfaengerIds: Joi.array().items(validators.objectId).optional(),
    titel: validators.safeString.required()
      .messages({ 'any.required': 'Titel ist erforderlich' }),
    inhalt: validators.safeString.required()
      .messages({ 'any.required': 'Inhalt ist erforderlich' }),
    typ: Joi.string().valid('info', 'warnung', 'erinnerung', 'erfolg')
      .default('info'),
    linkUrl: validators.safeString.uri().optional()
  }),
  
  // Notification settings update schema
  settings: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    typen: Joi.object({
      info: Joi.boolean().optional(),
      warnung: Joi.boolean().optional(),
      erinnerung: Joi.boolean().optional(),
      erfolg: Joi.boolean().optional()
    }).optional()
  })
};

// Query validation schemas
const benachrichtigungQuerySchemas = {
  list: Joi.object({
    gelesen: Joi.string().valid('true', 'false').optional(),
    typ: Joi.string().valid('info', 'warnung', 'erinnerung', 'erfolg').optional(),
    search: validators.safeString.optional(),
    sortBy: Joi.string().valid(
      'createdAt:asc', 'createdAt:desc', 
      'titel:asc', 'titel:desc', 
      'typ:asc', 'typ:desc'
    ).default('createdAt:desc'),
    cursor: validators.safeString.optional(),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

// Path parameter validation
const benachrichtigungParamSchemas = {
  id: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'ID ist erforderlich' })
  })
};

// Create validation middleware
const benachrichtigungValidation = {
  validateCreate: createValidationMiddleware(benachrichtigungSchemas.create),
  validateEmail: createValidationMiddleware(benachrichtigungSchemas.email),
  validateMass: createValidationMiddleware(benachrichtigungSchemas.mass),
  validateSettings: createValidationMiddleware(benachrichtigungSchemas.settings),
  validateId: createValidationMiddleware(benachrichtigungParamSchemas.id, 'params'),
  validateList: createValidationMiddleware(benachrichtigungQuerySchemas.list, 'query')
};

module.exports = benachrichtigungValidation;