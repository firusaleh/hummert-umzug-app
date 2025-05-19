// Common validation schemas using Joi
const Joi = require('joi');

// Custom validators
const validators = {
  // German phone number validation (with international format support)
  phoneNumber: Joi.string()
    .pattern(/^[+]?[0-9\s\-\(\)]{8,20}$/)
    .messages({
      'string.pattern.base': 'Bitte geben Sie eine gültige Telefonnummer an'
    }),
  
  // German postal code
  germanPostalCode: Joi.string()
    .pattern(/^[0-9]{5}$/)
    .messages({
      'string.pattern.base': 'PLZ muss genau 5 Ziffern haben'
    }),
  
  // IBAN validation
  iban: Joi.string()
    .pattern(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/)
    .messages({
      'string.pattern.base': 'Ungültige IBAN-Nummer'
    }),
  
  // Time format HH:MM
  timeFormat: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({
      'string.pattern.base': 'Zeit muss im Format HH:MM sein'
    }),
  
  // Positive number validation
  positiveNumber: Joi.number()
    .positive()
    .messages({
      'number.positive': 'Der Wert muss positiv sein'
    }),
  
  // Safe string (prevents XSS)
  safeString: Joi.string()
    .pattern(/^[^<>"'&]*$/)
    .messages({
      'string.pattern.base': 'Der Text enthält ungültige Zeichen'
    }),
  
  // Enum wrapper for German error messages
  germanEnum: (values, field) => Joi.string()
    .valid(...values)
    .messages({
      'any.only': `${field} muss einer der folgenden Werte sein: ${values.join(', ')}`
    }),
  
  // Date in ISO format
  isoDate: Joi.date()
    .iso()
    .messages({
      'date.format': 'Datum muss im ISO-Format sein (YYYY-MM-DD)'
    }),
  
  // MongoDB ObjectId validation
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Ungültige ID'
    }),
  
  // URL validation
  url: Joi.string()
    .uri()
    .messages({
      'string.uri': 'Ungültige URL'
    }),
  
  // File path validation (prevent path traversal)
  safePath: Joi.string()
    .pattern(/^[^\0]*$/)
    .custom((value, helpers) => {
      if (value.includes('..') || value.includes('/./') || value.includes('/\\')) {
        return helpers.error('path.traversal');
      }
      return value;
    })
    .messages({
      'path.traversal': 'Ungültiger Dateipfad',
      'string.pattern.base': 'Ungültiger Dateipfad'
    }),
  
  // Email with TLD validation
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .max(254)
    .messages({
      'string.email': 'Ungültige E-Mail-Adresse',
      'string.max': 'E-Mail-Adresse ist zu lang'
    }),
  
  // Strong password
  strongPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.min': 'Passwort muss mindestens 8 Zeichen lang sein',
      'string.pattern.base': 'Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten'
    }),
  
  // Simple password (for backward compatibility)
  simplePassword: Joi.string()
    .min(6)
    .messages({
      'string.min': 'Passwort muss mindestens 6 Zeichen lang sein'
    })
};

// Common schemas
const schemas = {
  // Address schema
  address: Joi.object({
    strasse: validators.safeString.required()
      .messages({ 'any.required': 'Straße ist erforderlich' }),
    hausnummer: validators.safeString.required()
      .messages({ 'any.required': 'Hausnummer ist erforderlich' }),
    zusatz: validators.safeString.optional().allow(''),
    plz: validators.germanPostalCode.required()
      .messages({ 'any.required': 'PLZ ist erforderlich' }),
    ort: validators.safeString.required()
      .messages({ 'any.required': 'Ort ist erforderlich' }),
    land: validators.safeString.optional().default('Deutschland')
  }),
  
  // Contact person schema
  contact: Joi.object({
    name: validators.safeString.required()
      .messages({ 'any.required': 'Name ist erforderlich' }),
    telefon: validators.phoneNumber.optional(),
    email: validators.email.optional(),
    position: validators.safeString.optional()
  }),
  
  // Price schema
  price: Joi.object({
    netto: validators.positiveNumber.required()
      .messages({ 'any.required': 'Nettobetrag ist erforderlich' }),
    brutto: validators.positiveNumber.required()
      .messages({ 'any.required': 'Bruttobetrag ist erforderlich' }),
    mwst: validators.positiveNumber.default(19),
    bezahlt: Joi.boolean().default(false),
    zahlungsart: validators.germanEnum(
      ['rechnung', 'bar', 'ueberweisung', 'paypal', 'kreditkarte'],
      'Zahlungsart'
    ).default('rechnung')
  }),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: validators.safeString.optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Date range
  dateRange: Joi.object({
    start: validators.isoDate.required()
      .messages({ 'any.required': 'Startdatum ist erforderlich' }),
    end: validators.isoDate.required()
      .messages({ 'any.required': 'Enddatum ist erforderlich' })
  }).custom((value, helpers) => {
    if (value.start > value.end) {
      return helpers.error('dateRange.invalid');
    }
    return value;
  }).messages({
    'dateRange.invalid': 'Startdatum muss vor Enddatum liegen'
  })
};

// Validation error formatter
const formatValidationErrors = (error) => {
  if (!error.details) return [];
  
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
};

// Middleware generator
const createValidationMiddleware = (schema, validationType = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[validationType];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: formatValidationErrors(error)
      });
    }
    
    // Replace the original data with the validated and sanitized data
    req[validationType] = value;
    next();
  };
};

module.exports = {
  validators,
  schemas,
  formatValidationErrors,
  createValidationMiddleware
};
