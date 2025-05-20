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
    .matches(/^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2} [0-9]{1,4}$/)
    .withMessage('Ungültiges Kennzeichen-Format (z.B. M-AB 1234)'),
  
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
    .withMessage(`Baujahr muss zwischen 1950 und ${new Date().getFullYear()} liegen`),
  
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
    .withMessage('Kilometerstand muss eine positive Zahl sein'),
  
  body('naechsterService')
    .optional()
    .isISO8601()
    .withMessage('Datum für nächsten Service muss ein gültiges Datum sein'),
  
  body('kapazitaet.ladeflaeche.laenge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Länge der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladeflaeche.breite')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Breite der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladeflaeche.hoehe')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Höhe der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladegewicht')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ladegewicht muss positiv sein'),
  
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
    .matches(/^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2} [0-9]{1,4}$/)
    .withMessage('Ungültiges Kennzeichen-Format (z.B. M-AB 1234)'),
  
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
    .withMessage(`Baujahr muss zwischen 1950 und ${new Date().getFullYear()} liegen`),
  
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
    .withMessage('Kilometerstand muss eine positive Zahl sein'),
  
  body('naechsterService')
    .optional()
    .isISO8601()
    .withMessage('Datum für nächsten Service muss ein gültiges Datum sein'),
  
  body('kapazitaet.ladeflaeche.laenge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Länge der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladeflaeche.breite')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Breite der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladeflaeche.hoehe')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Höhe der Ladefläche muss positiv sein'),
  
  body('kapazitaet.ladegewicht')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ladegewicht muss positiv sein'),
  
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
];

module.exports = {
  validateId,
  list,
  create,
  update,
  updateStatus,
  updateKilometerstand
};