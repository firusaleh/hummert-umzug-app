// File upload validation schemas
const Joi = require('joi');
const { validators, createValidationMiddleware } = require('./common.validators');

// Allowed file types
const ALLOWED_MIMETYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
];

const ALLOWED_EXTENSIONS = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  // Archives
  '.zip', '.rar', '.7z'
];

// File validation schemas
const fileSchemas = {
  upload: Joi.object({
    kategorie: validators.germanEnum(
      ['dokument', 'bild', 'vertrag', 'rechnung', 'angebot', 'protokoll', 'sonstiges'],
      'Kategorie'
    ).optional().default('dokument'),
    bezugId: validators.objectId.optional(),
    bezugModell: validators.germanEnum(
      ['Umzug', 'Mitarbeiter', 'Angebot', 'Rechnung', 'Dokument'],
      'Bezugsmodell'
    ).optional().default('Dokument'),
    beschreibung: validators.safeString.max(500).optional(),
    tags: Joi.array().items(validators.safeString).max(10).optional()
  }),
  
  // Multi-file upload
  multiUpload: Joi.object({
    files: Joi.array().min(1).max(10).required()
      .messages({
        'any.required': 'Mindestens eine Datei ist erforderlich',
        'array.min': 'Mindestens eine Datei ist erforderlich',
        'array.max': 'Maximal 10 Dateien gleichzeitig erlaubt'
      }),
    kategorie: validators.germanEnum(
      ['dokument', 'bild', 'vertrag', 'rechnung', 'angebot', 'protokoll', 'sonstiges'],
      'Kategorie'
    ).optional().default('dokument'),
    bezugId: validators.objectId.optional(),
    bezugModell: validators.germanEnum(
      ['Umzug', 'Mitarbeiter', 'Angebot', 'Rechnung', 'Dokument'],
      'Bezugsmodell'
    ).optional().default('Dokument'),
    beschreibung: validators.safeString.max(500).optional(),
    tags: Joi.array().items(validators.safeString).max(10).optional()
  }),
  
  update: Joi.object({
    kategorie: validators.germanEnum(
      ['dokument', 'bild', 'vertrag', 'rechnung', 'angebot', 'protokoll', 'sonstiges'],
      'Kategorie'
    ).optional(),
    beschreibung: validators.safeString.max(500).optional(),
    tags: Joi.array().items(validators.safeString).max(10).optional()
  })
};

// Query validation schemas
const fileQuerySchemas = {
  list: Joi.object({
    kategorie: validators.germanEnum(
      ['dokument', 'bild', 'vertrag', 'rechnung', 'angebot', 'protokoll', 'sonstiges'],
      'Kategorie'
    ).optional(),
    bezugId: validators.objectId.optional(),
    bezugModell: validators.germanEnum(
      ['Umzug', 'Mitarbeiter', 'Angebot', 'Rechnung', 'Dokument'],
      'Bezugsmodell'
    ).optional(),
    mimetype: Joi.string().optional(),
    search: validators.safeString.optional(),
    tags: Joi.array().items(validators.safeString).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('originalname', 'groesse', 'createdAt').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// File validation middleware
const fileValidationMiddleware = {
  // Single file validation
  validateFile: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    // Validate file size (10MB max by default)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Datei ist zu groß. Maximale Größe: 10MB'
      });
    }
    
    // Validate MIME type
    if (!ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Dateityp nicht erlaubt',
        allowedTypes: ALLOWED_MIMETYPES
      });
    }
    
    // Validate file extension
    const ext = '.' + req.file.originalname.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Dateierweiterung nicht erlaubt',
        allowedExtensions: ALLOWED_EXTENSIONS
      });
    }
    
    // Sanitize filename
    req.file.sanitizedName = req.file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
    
    next();
  },
  
  // Multiple files validation
  validateFiles: (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Dateien hochgeladen'
      });
    }
    
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Zu viele Dateien. Maximal 10 Dateien gleichzeitig erlaubt'
      });
    }
    
    const errors = [];
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    
    req.files.forEach((file, index) => {
      // Validate file size
      if (file.size > maxSize) {
        errors.push({
          file: file.originalname,
          error: 'Datei ist zu groß. Maximale Größe: 10MB'
        });
      }
      
      // Validate MIME type
      if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
        errors.push({
          file: file.originalname,
          error: 'Dateityp nicht erlaubt'
        });
      }
      
      // Validate file extension
      const ext = '.' + file.originalname.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push({
          file: file.originalname,
          error: 'Dateierweiterung nicht erlaubt'
        });
      }
      
      // Sanitize filename
      file.sanitizedName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_');
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Fehler bei der Dateivalidierung',
        errors
      });
    }
    
    next();
  }
};

// Path parameter validation
const fileParamSchemas = {
  id: Joi.object({
    id: validators.objectId.required()
      .messages({ 'any.required': 'Datei-ID ist erforderlich' })
  })
};

// Create validation middleware
const fileValidation = {
  upload: createValidationMiddleware(fileSchemas.upload),
  multiUpload: createValidationMiddleware(fileSchemas.multiUpload),
  update: createValidationMiddleware(fileSchemas.update),
  list: createValidationMiddleware(fileQuerySchemas.list, 'query'),
  validateId: createValidationMiddleware(fileParamSchemas.id, 'params'),
  validateFile: fileValidationMiddleware.validateFile,
  validateFiles: fileValidationMiddleware.validateFiles
};

module.exports = fileValidation;