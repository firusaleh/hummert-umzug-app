// middleware/validators/fahrzeug.validator.js
const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('mongoose');

const validateId = [
  param('id')
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Ungültige Fahrzeug-ID');
      }
      return true;
    })
];

const list = [
  query('typ')
    .optional()
    .isIn(['LKW', 'Transporter', 'PKW', 'Anhänger', 'Sonstige'])
    .withMessage('Ungültiger Fahrzeugtyp'),
  
  query('status')
    .optional()
    .isIn(['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'])
    .withMessage('Ungültiger Status'),
  
  query('fuehrerscheinklasse')
    .optional()
    .isIn(['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'])
    .withMessage('Ungültige Führerscheinklasse')
];

const create = [
  body('kennzeichen')
    .trim()
    .notEmpty()
    .withMessage('Kennzeichen ist erforderlich')
    .matches(/^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2} [0-9A-ZÄÖÜ]{1,6}$/)
    .withMessage('Ungültiges Kennzeichen-Format (z.B. M-AB 1234 oder HH-MS 2023E)'),
  
  body('bezeichnung')
    .trim()
    .notEmpty()
    .withMessage('Bezeichnung ist erforderlich'),
  
  body('typ')
    .isIn(['LKW', 'Transporter', 'PKW', 'Anhänger', 'Sonstige'])
    .withMessage('Ungültiger Fahrzeugtyp'),
  
  body('status')
    .optional()
    .isIn(['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'])
    .withMessage('Ungültiger Status'),
  
  body('fuehrerscheinklasse')
    .optional()
    .isIn(['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'])
    .withMessage('Ungültige Führerscheinklasse'),
  
  body('baujahr')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage(`Baujahr muss zwischen 1950 und ${new Date().getFullYear()} liegen`)
    .toInt(),
  
  body('anschaffungsdatum')
    .optional()
    .isISO8601()
    .withMessage('Anschaffungsdatum muss ein gültiges Datum sein'),
  
  body('tuev')
    .optional()
    .isISO8601()
    .withMessage('TÜV-Datum muss ein gültiges Datum sein'),
  
  body('kilometerstand')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Kilometerstand muss eine positive Zahl sein')
    .toInt(),
  
  body('naechsterService')
    .optional()
    .isISO8601()
    .withMessage('Datum für nächsten Service muss ein gültiges Datum sein'),
  
  body('kapazitaet.ladeflaeche.laenge')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Länge der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.laenge = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladeflaeche.breite')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Breite der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.breite = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladeflaeche.hoehe')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Höhe der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.hoehe = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladegewicht')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet exists
      if (req.body.kapazitaet && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Ladegewicht muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladegewicht = parseFloat(value);
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Aktivstatus muss ein Boolean sein')
];

// Update validation - similar to create but all fields are optional
const update = [
  validateId,
  
  body('kennzeichen')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Kennzeichen darf nicht leer sein')
    .matches(/^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2} [0-9A-ZÄÖÜ]{1,6}$/)
    .withMessage('Ungültiges Kennzeichen-Format (z.B. M-AB 1234 oder HH-MS 2023E)'),
  
  body('bezeichnung')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Bezeichnung darf nicht leer sein'),
  
  body('typ')
    .optional()
    .isIn(['LKW', 'Transporter', 'PKW', 'Anhänger', 'Sonstige'])
    .withMessage('Ungültiger Fahrzeugtyp'),
  
  body('status')
    .optional()
    .isIn(['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'])
    .withMessage('Ungültiger Status'),
  
  body('fuehrerscheinklasse')
    .optional()
    .isIn(['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'])
    .withMessage('Ungültige Führerscheinklasse'),
  
  body('baujahr')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage(`Baujahr muss zwischen 1950 und ${new Date().getFullYear()} liegen`)
    .toInt(),
  
  body('anschaffungsdatum')
    .optional()
    .isISO8601()
    .withMessage('Anschaffungsdatum muss ein gültiges Datum sein'),
  
  body('tuev')
    .optional()
    .isISO8601()
    .withMessage('TÜV-Datum muss ein gültiges Datum sein'),
  
  body('kilometerstand')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Kilometerstand muss eine positive Zahl sein')
    .toInt(),
  
  body('naechsterService')
    .optional()
    .isISO8601()
    .withMessage('Datum für nächsten Service muss ein gültiges Datum sein'),
  
  body('kapazitaet.ladeflaeche.laenge')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Länge der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.laenge = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladeflaeche.breite')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Breite der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.breite = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladeflaeche.hoehe')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet and ladeflaeche exist
      if (req.body.kapazitaet && req.body.kapazitaet.ladeflaeche && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Höhe der Ladefläche muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladeflaeche.hoehe = parseFloat(value);
      }
      return true;
    }),
  
  body('kapazitaet.ladegewicht')
    .optional()
    .custom((value, { req }) => {
      // Only validate if kapazitaet exists
      if (req.body.kapazitaet && value !== undefined) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          throw new Error('Ladegewicht muss positiv sein');
        }
        // Convert to number
        req.body.kapazitaet.ladegewicht = parseFloat(value);
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Aktivstatus muss ein Boolean sein')
];

// Validation for updating vehicle status
const updateStatus = [
  validateId,
  
  body('status')
    .isIn(['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'])
    .withMessage('Ungültiger Status'),
  
  body('aktuelleFahrt')
    .optional()
    .custom(value => {
      if (!isValidObjectId(value)) {
        throw new Error('Ungültige Umzugs-ID');
      }
      return true;
    })
];

// Validation for updating kilometer reading
const updateKilometerstand = [
  validateId,
  
  body('kilometerstand')
    .isInt({ min: 0 })
    .withMessage('Kilometerstand muss eine positive Zahl sein')
    .toInt()
];

module.exports = {
  validateId,
  list,
  create,
  update,
  updateStatus,
  updateKilometerstand
};