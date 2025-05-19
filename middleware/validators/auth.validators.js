// Authentication validation schemas
const Joi = require('joi');
const { validators, createValidationMiddleware } = require('./common.validators');

// Authentication schemas
const authSchemas = {
  register: Joi.object({
    name: validators.safeString
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Name ist erforderlich',
        'string.min': 'Name muss mindestens 2 Zeichen lang sein',
        'string.max': 'Name darf maximal 50 Zeichen lang sein'
      }),
    email: validators.email
      .required()
      .messages({
        'any.required': 'E-Mail ist erforderlich'
      }),
    password: validators.simplePassword // Using simple password for backward compatibility
      .required()
      .messages({
        'any.required': 'Passwort ist erforderlich'
      }),
    role: validators.germanEnum(
      ['admin', 'mitarbeiter', 'fahrer', 'praktikant'],
      'Rolle'
    ).optional().default('mitarbeiter')
  }),
  
  login: Joi.object({
    email: validators.email
      .required()
      .messages({
        'any.required': 'E-Mail ist erforderlich'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Passwort ist erforderlich'
      })
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Aktuelles Passwort ist erforderlich'
      }),
    newPassword: validators.strongPassword
      .required()
      .messages({
        'any.required': 'Neues Passwort ist erforderlich'
      }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'any.required': 'Passwortbestätigung ist erforderlich',
        'any.only': 'Passwörter stimmen nicht überein'
      })
  }),
  
  resetPasswordRequest: Joi.object({
    email: validators.email
      .required()
      .messages({
        'any.required': 'E-Mail ist erforderlich'
      })
  }),
  
  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Token ist erforderlich'
      }),
    newPassword: validators.strongPassword
      .required()
      .messages({
        'any.required': 'Neues Passwort ist erforderlich'
      }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'any.required': 'Passwortbestätigung ist erforderlich',
        'any.only': 'Passwörter stimmen nicht überein'
      })
  }),
  
  updateProfile: Joi.object({
    name: validators.safeString
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Name muss mindestens 2 Zeichen lang sein',
        'string.max': 'Name darf maximal 50 Zeichen lang sein'
      }),
    email: validators.email.optional(),
    telefon: validators.phoneNumber.optional(),
    adresse: Joi.object({
      strasse: validators.safeString.optional(),
      hausnummer: validators.safeString.optional(),
      plz: validators.germanPostalCode.optional(),
      ort: validators.safeString.optional()
    }).optional()
  }),
  
  createAdmin: Joi.object({
    name: validators.safeString
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Name ist erforderlich',
        'string.min': 'Name muss mindestens 2 Zeichen lang sein',
        'string.max': 'Name darf maximal 50 Zeichen lang sein'
      }),
    email: validators.email
      .required()
      .messages({
        'any.required': 'E-Mail ist erforderlich'
      }),
    password: validators.strongPassword
      .required()
      .messages({
        'any.required': 'Passwort ist erforderlich'
      })
  })
};

// Query validation schemas
const authQuerySchemas = {
  listUsers: Joi.object({
    role: validators.germanEnum(
      ['admin', 'mitarbeiter', 'fahrer', 'praktikant'],
      'Rolle'
    ).optional(),
    isActive: Joi.boolean().optional(),
    search: validators.safeString.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('name', 'email', 'createdAt', 'lastLogin').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Create validation middleware
const authValidation = {
  register: createValidationMiddleware(authSchemas.register),
  login: createValidationMiddleware(authSchemas.login),
  changePassword: createValidationMiddleware(authSchemas.changePassword),
  resetPasswordRequest: createValidationMiddleware(authSchemas.resetPasswordRequest),
  resetPassword: createValidationMiddleware(authSchemas.resetPassword),
  updateProfile: createValidationMiddleware(authSchemas.updateProfile),
  createAdmin: createValidationMiddleware(authSchemas.createAdmin),
  listUsers: createValidationMiddleware(authQuerySchemas.listUsers, 'query')
};

module.exports = authValidation;