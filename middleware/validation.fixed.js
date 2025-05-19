// middleware/validation.fixed.js - Enhanced validation middleware
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Custom sanitizers
const sanitizers = {
  // Remove HTML tags and trim whitespace
  sanitizeString: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim(); // Remove whitespace
  },
  
  // Convert German phone format to international
  normalizePhone: (value) => {
    if (!value) return value;
    // Remove all non-numeric except +
    let phone = value.replace(/[^0-9+]/g, '');
    // Convert German format
    if (phone.startsWith('0')) {
      phone = '+49' + phone.substring(1);
    }
    return phone;
  },
  
  // Normalize email to lowercase
  normalizeEmail: (value) => {
    if (!value) return value;
    return value.toLowerCase().trim();
  }
};

// Custom validators
const customValidators = {
  // Validate German postal code
  isGermanPostalCode: (value) => {
    return /^[0-9]{5}$/.test(value);
  },
  
  // Validate German phone number
  isGermanPhone: (value) => {
    const cleaned = value.replace(/[^0-9+]/g, '');
    return /^(\+49|0)[1-9][0-9]{7,14}$/.test(cleaned);
  },
  
  // Validate MongoDB ObjectId
  isObjectId: (value) => {
    return mongoose.Types.ObjectId.isValid(value);
  },
  
  // Validate date is not in past
  isNotPastDate: (value) => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  },
  
  // Validate date range
  isValidDateRange: (endDate, { req }) => {
    const startDate = new Date(req.body.startDatum || req.body.startDate);
    const end = new Date(endDate);
    return end >= startDate;
  },
  
  // Validate working hours
  isValidWorkingHours: (endTime, { req }) => {
    const start = req.body.startzeit || req.body.startTime;
    if (!start) return false;
    
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  }
};

// Enhanced validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for better readability
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      value: error.value,
      message: error.msg,
      location: error.location
    }));
    
    // Group errors by field
    const errorsByField = formattedErrors.reduce((acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error.message);
      return acc;
    }, {});
    
    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: formattedErrors,
      errorsByField
    });
  }
  
  next();
};

// User registration validation
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name ist erforderlich')
    .isLength({ min: 2, max: 50 }).withMessage('Name muss zwischen 2 und 50 Zeichen lang sein')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('email')
    .trim()
    .notEmpty().withMessage('E-Mail ist erforderlich')
    .isEmail().withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail()
    .customSanitizer(sanitizers.normalizeEmail),
  
  body('password')
    .notEmpty().withMessage('Passwort ist erforderlich')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten'),
  
  body('role')
    .optional()
    .isIn(['admin', 'mitarbeiter', 'kunde']).withMessage('Ungültige Rolle'),
  
  handleValidationErrors
];

// User login validation
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-Mail ist erforderlich')
    .isEmail().withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Passwort ist erforderlich'),
  
  handleValidationErrors
];

// Employee validation
const mitarbeiterValidation = [
  body('vorname')
    .trim()
    .notEmpty().withMessage('Vorname ist erforderlich')
    .isLength({ min: 2, max: 30 }).withMessage('Vorname muss zwischen 2 und 30 Zeichen lang sein')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('nachname')
    .trim()
    .notEmpty().withMessage('Nachname ist erforderlich')
    .isLength({ min: 2, max: 30 }).withMessage('Nachname muss zwischen 2 und 30 Zeichen lang sein')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('telefon')
    .trim()
    .notEmpty().withMessage('Telefonnummer ist erforderlich')
    .custom(customValidators.isGermanPhone).withMessage('Ungültige deutsche Telefonnummer')
    .customSanitizer(sanitizers.normalizePhone),
  
  body('position')
    .optional()
    .isIn(['Fahrer', 'Packer', 'Vorarbeiter', 'Büro']).withMessage('Ungültige Position'),
  
  body('fuehrerscheinklassen')
    .optional()
    .isArray().withMessage('Führerscheinklassen müssen als Array angegeben werden'),
  
  body('fuehrerscheinklassen.*')
    .isIn(['B', 'BE', 'C', 'CE', 'C1', 'C1E']).withMessage('Ungültige Führerscheinklasse'),
  
  handleValidationErrors
];

// Move validation
const umzugValidation = [
  body('kundennummer')
    .optional()
    .matches(/^KD-\d{6}$/).withMessage('Kundennummer muss dem Format KD-XXXXXX entsprechen'),
  
  body('startDatum')
    .notEmpty().withMessage('Startdatum ist erforderlich')
    .isISO8601().withMessage('Ungültiges Datumsformat')
    .custom(customValidators.isNotPastDate).withMessage('Startdatum darf nicht in der Vergangenheit liegen'),
  
  body('endDatum')
    .notEmpty().withMessage('Enddatum ist erforderlich')
    .isISO8601().withMessage('Ungültiges Datumsformat')
    .custom(customValidators.isValidDateRange).withMessage('Enddatum muss nach dem Startdatum liegen'),
  
  body('auftraggeber.name')
    .trim()
    .notEmpty().withMessage('Name des Auftraggebers ist erforderlich')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('auftraggeber.telefon')
    .trim()
    .notEmpty().withMessage('Telefonnummer des Auftraggebers ist erforderlich')
    .custom(customValidators.isGermanPhone).withMessage('Ungültige Telefonnummer')
    .customSanitizer(sanitizers.normalizePhone),
  
  body('auftraggeber.email')
    .optional()
    .isEmail().withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
  
  // Address validation
  body(['auszugsadresse', 'einzugsadresse']).forEach(prefix => [
    body(`${prefix}.strasse`)
      .trim()
      .notEmpty().withMessage(`Straße (${prefix}) ist erforderlich`)
      .customSanitizer(sanitizers.sanitizeString),
    
    body(`${prefix}.hausnummer`)
      .trim()
      .notEmpty().withMessage(`Hausnummer (${prefix}) ist erforderlich`),
    
    body(`${prefix}.plz`)
      .trim()
      .notEmpty().withMessage(`PLZ (${prefix}) ist erforderlich`)
      .custom(customValidators.isGermanPostalCode).withMessage('Ungültige deutsche Postleitzahl'),
    
    body(`${prefix}.ort`)
      .trim()
      .notEmpty().withMessage(`Ort (${prefix}) ist erforderlich`)
      .customSanitizer(sanitizers.sanitizeString),
    
    body(`${prefix}.etage`)
      .optional()
      .isInt({ min: -2, max: 20 }).withMessage('Ungültige Etage')
  ]).flat(),
  
  body('status')
    .optional()
    .isIn(['geplant', 'in_durchfuehrung', 'abgeschlossen', 'storniert'])
    .withMessage('Ungültiger Status'),
  
  handleValidationErrors
];

// Survey validation
const aufnahmeValidation = [
  body('datum')
    .optional()
    .isISO8601().withMessage('Ungültiges Datumsformat'),
  
  body('kundenName')
    .trim()
    .notEmpty().withMessage('Kundenname ist erforderlich')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('telefon')
    .optional()
    .custom(customValidators.isGermanPhone).withMessage('Ungültige Telefonnummer')
    .customSanitizer(sanitizers.normalizePhone),
  
  body('email')
    .optional()
    .isEmail().withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
  
  body('gesamtvolumen')
    .optional()
    .isFloat({ min: 0 }).withMessage('Volumen muss eine positive Zahl sein'),
  
  body('angebotspreis.netto')
    .optional()
    .isFloat({ min: 0 }).withMessage('Nettopreis muss eine positive Zahl sein'),
  
  handleValidationErrors
];

// Time tracking validation
const zeiterfassungValidation = [
  body('mitarbeiterId')
    .notEmpty().withMessage('Mitarbeiter ist erforderlich')
    .custom(customValidators.isObjectId).withMessage('Ungültige Mitarbeiter-ID'),
  
  body('projektId')
    .notEmpty().withMessage('Projekt ist erforderlich')
    .custom(customValidators.isObjectId).withMessage('Ungültige Projekt-ID'),
  
  body('datum')
    .notEmpty().withMessage('Datum ist erforderlich')
    .isISO8601().withMessage('Ungültiges Datumsformat'),
  
  body('startzeit')
    .notEmpty().withMessage('Startzeit ist erforderlich')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Startzeit muss im Format HH:MM sein'),
  
  body('endzeit')
    .notEmpty().withMessage('Endzeit ist erforderlich')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Endzeit muss im Format HH:MM sein')
    .custom(customValidators.isValidWorkingHours).withMessage('Endzeit muss nach der Startzeit liegen'),
  
  body('pause')
    .optional()
    .isInt({ min: 0 }).withMessage('Pause darf nicht negativ sein'),
  
  body('taetigkeit')
    .trim()
    .notEmpty().withMessage('Tätigkeit ist erforderlich')
    .customSanitizer(sanitizers.sanitizeString),
  
  handleValidationErrors
];

// Finance validation
const financeValidation = [
  body('betrag')
    .notEmpty().withMessage('Betrag ist erforderlich')
    .isFloat({ min: 0 }).withMessage('Betrag muss eine positive Zahl sein'),
  
  body('kategorie')
    .notEmpty().withMessage('Kategorie ist erforderlich')
    .isIn(['Personal', 'Fahrzeuge', 'Material', 'Unterauftrag', 'Sonstiges'])
    .withMessage('Ungültige Kategorie'),
  
  body('beschreibung')
    .trim()
    .notEmpty().withMessage('Beschreibung ist erforderlich')
    .customSanitizer(sanitizers.sanitizeString),
  
  body('datum')
    .notEmpty().withMessage('Datum ist erforderlich')
    .isISO8601().withMessage('Ungültiges Datumsformat'),
  
  handleValidationErrors
];

// ID parameter validation
const idParamValidation = [
  param('id')
    .notEmpty().withMessage('ID ist erforderlich')
    .custom(customValidators.isObjectId).withMessage('Ungültige ID'),
  
  handleValidationErrors
];

// Query parameter validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Seite muss eine positive Zahl sein'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit muss zwischen 1 und 100 liegen'),
  
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z_]+$/).withMessage('Ungültiges Sortierfeld'),
  
  handleValidationErrors
];

// File upload validation
const fileUploadValidation = [
  body('file')
    .custom((value, { req }) => {
      if (!req.file && !req.files) {
        throw new Error('Keine Datei hochgeladen');
      }
      
      const file = req.file || req.files[0];
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedMimes.includes(file.mimetype)) {
        throw new Error('Ungültiger Dateityp');
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('Datei ist zu groß (max. 10MB)');
      }
      
      return true;
    }),
  
  handleValidationErrors
];

// Export all validations
module.exports = {
  // Auth validations
  registerValidation,
  loginValidation,
  
  // Resource validations
  mitarbeiterValidation,
  umzugValidation,
  aufnahmeValidation,
  zeiterfassungValidation,
  financeValidation,
  
  // Common validations
  idParamValidation,
  paginationValidation,
  fileUploadValidation,
  
  // Utilities
  handleValidationErrors,
  customValidators,
  sanitizers
};