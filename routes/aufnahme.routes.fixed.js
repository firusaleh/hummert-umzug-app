// routes/aufnahme.routes.fixed.js
const express = require('express');
const router = express.Router();
const aufnahmeController = require('../controllers/aufnahme.controller');
const { auth, authorize } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { paginate, sort, filter } = require('../middleware/pagination');
const fileUpload = require('../middleware/fileUpload');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules
const aufnahmeValidation = {
  create: [
    body('kunde.name')
      .trim()
      .notEmpty().withMessage('Kundenname ist erforderlich')
      .isLength({ min: 2, max: 100 }),
    body('kunde.telefon')
      .trim()
      .notEmpty().withMessage('Telefonnummer ist erforderlich')
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/),
    body('kunde.email')
      .optional()
      .trim()
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('umzugsdetails.typ')
      .optional()
      .isIn(['privat', 'gewerblich']).withMessage('Ungültiger Umzugstyp'),
    body('auszugsadresse.strasse')
      .trim()
      .notEmpty().withMessage('Straße ist erforderlich'),
    body('auszugsadresse.hausnummer')
      .trim()
      .notEmpty().withMessage('Hausnummer ist erforderlich'),
    body('auszugsadresse.plz')
      .trim()
      .notEmpty()
      .matches(/^\d{5}$/).withMessage('PLZ muss 5-stellig sein'),
    body('auszugsadresse.ort')
      .trim()
      .notEmpty().withMessage('Ort ist erforderlich'),
    body('einzugsadresse.strasse')
      .trim()
      .notEmpty().withMessage('Straße ist erforderlich'),
    body('einzugsadresse.hausnummer')
      .trim()
      .notEmpty().withMessage('Hausnummer ist erforderlich'),
    body('einzugsadresse.plz')
      .trim()
      .notEmpty()
      .matches(/^\d{5}$/).withMessage('PLZ muss 5-stellig sein'),
    body('einzugsadresse.ort')
      .trim()
      .notEmpty().withMessage('Ort ist erforderlich')
  ],
  
  addRaum: [
    body('name')
      .trim()
      .notEmpty().withMessage('Raumname ist erforderlich'),
    body('typ')
      .optional()
      .isIn(['wohnzimmer', 'schlafzimmer', 'kueche', 'bad', 'buero', 'keller', 'dachboden', 'garage', 'sonstiges']),
    body('flaeche')
      .optional()
      .isFloat({ min: 1, max: 500 }).withMessage('Fläche muss zwischen 1 und 500 m² liegen'),
    body('etage')
      .optional()
      .isInt({ min: -5, max: 20 })
  ],
  
  addMoebel: [
    body('name')
      .trim()
      .notEmpty().withMessage('Möbelname ist erforderlich'),
    body('anzahl')
      .isInt({ min: 1 }).withMessage('Anzahl muss mindestens 1 sein'),
    body('kategorie')
      .optional()
      .isIn(['schrank', 'tisch', 'stuhl', 'bett', 'sofa', 'elektronik', 'karton', 'sonstiges']),
    body('groesse.laenge')
      .optional()
      .isFloat({ min: 0 }),
    body('groesse.breite')
      .optional()
      .isFloat({ min: 0 }),
    body('groesse.hoehe')
      .optional()
      .isFloat({ min: 0 }),
    body('gewicht')
      .optional()
      .isFloat({ min: 0 }),
    body('eigenschaften')
      .optional()
      .isArray(),
    body('eigenschaften.*')
      .isIn(['zerbrechlich', 'schwer', 'wertvoll', 'demontage_erforderlich', 'klavier', 'kunstwerk'])
  ],
  
  update: [
    body('status')
      .optional()
      .isIn(['entwurf', 'in_bearbeitung', 'abgeschlossen']),
    body('umzugsdetails.geplanteDatum')
      .optional()
      .isISO8601().withMessage('Ungültiges Datum'),
    body('besonderheiten')
      .optional()
      .trim()
      .isLength({ max: 2000 })
  ],
  
  validateId: [
    param('id')
      .isMongoId().withMessage('Ungültige Aufnahme-ID')
  ],
  
  query: [
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),
    query('status')
      .optional()
      .isIn(['entwurf', 'in_bearbeitung', 'abgeschlossen']),
    query('search')
      .optional()
      .trim()
  ]
};

// All routes require authentication
router.use(auth);

// Routes

// GET /api/aufnahmen - Get all assessments with pagination
router.get('/',
  aufnahmeValidation.query,
  validate,
  paginate,
  filter(['status']),
  sort(['createdAt', 'referenznummer']),
  asyncHandler(aufnahmeController.getAllAufnahmen)
);

// GET /api/aufnahmen/stats - Get statistics
router.get('/stats',
  authorize('admin', 'mitarbeiter'),
  asyncHandler(aufnahmeController.getStats)
);

// GET /api/aufnahmen/:id - Get assessment by ID
router.get('/:id',
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.getAufnahmeById)
);

// POST /api/aufnahmen - Create new assessment
router.post('/',
  aufnahmeValidation.create,
  validate,
  asyncHandler(aufnahmeController.createAufnahme)
);

// PUT /api/aufnahmen/:id - Update assessment
router.put('/:id',
  aufnahmeValidation.validateId,
  aufnahmeValidation.update,
  validate,
  asyncHandler(aufnahmeController.updateAufnahme)
);

// DELETE /api/aufnahmen/:id - Delete assessment
router.delete('/:id',
  authorize('admin'),
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.deleteAufnahme)
);

// Room management
router.post('/:id/raeume',
  aufnahmeValidation.validateId,
  aufnahmeValidation.addRaum,
  validate,
  asyncHandler(aufnahmeController.addRaum)
);

router.put('/:id/raeume/:raumId',
  param('id').isMongoId(),
  param('raumId').isMongoId(),
  aufnahmeValidation.addRaum,
  validate,
  asyncHandler(aufnahmeController.updateRaum)
);

router.delete('/:id/raeume/:raumId',
  param('id').isMongoId(),
  param('raumId').isMongoId(),
  validate,
  asyncHandler(aufnahmeController.deleteRaum)
);

// Furniture management
router.post('/:id/raeume/:raumId/moebel',
  param('id').isMongoId(),
  param('raumId').isMongoId(),
  aufnahmeValidation.addMoebel,
  validate,
  asyncHandler(aufnahmeController.addMoebel)
);

router.put('/:id/raeume/:raumId/moebel/:moebelId',
  param('id').isMongoId(),
  param('raumId').isMongoId(),
  param('moebelId').isMongoId(),
  aufnahmeValidation.addMoebel,
  validate,
  asyncHandler(aufnahmeController.updateMoebel)
);

router.delete('/:id/raeume/:raumId/moebel/:moebelId',
  param('id').isMongoId(),
  param('raumId').isMongoId(),
  param('moebelId').isMongoId(),
  validate,
  asyncHandler(aufnahmeController.deleteMoebel)
);

// Photo management
router.post('/:id/fotos',
  aufnahmeValidation.validateId,
  validate,
  fileUpload.array('fotos', 10),
  asyncHandler(aufnahmeController.uploadFotos)
);

router.delete('/:id/fotos/:fotoId',
  param('id').isMongoId(),
  param('fotoId').isMongoId(),
  validate,
  asyncHandler(aufnahmeController.deleteFoto)
);

// Generate offer
router.post('/:id/angebot',
  aufnahmeValidation.validateId,
  body('gueltigBis').optional().isISO8601(),
  body('rabatt').optional().isFloat({ min: 0, max: 100 }),
  validate,
  asyncHandler(aufnahmeController.generateAngebot)
);

// Export to PDF
router.get('/:id/export',
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.exportToPDF)
);

// Complete assessment
router.post('/:id/complete',
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.completeAufnahme)
);

// Calculate volume
router.get('/:id/volumen',
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.calculateVolume)
);

// Get price estimation
router.get('/:id/preisschaetzung',
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.getPriceEstimation)
);

// Duplicate assessment
router.post('/:id/duplicate',
  authorize('admin', 'mitarbeiter'),
  aufnahmeValidation.validateId,
  validate,
  asyncHandler(aufnahmeController.duplicateAufnahme)
);

// Notes
router.post('/:id/notizen',
  aufnahmeValidation.validateId,
  body('text').trim().notEmpty().isLength({ max: 1000 }),
  validate,
  asyncHandler(aufnahmeController.addNote)
);

router.delete('/:id/notizen/:notizId',
  param('id').isMongoId(),
  param('notizId').isMongoId(),
  validate,
  asyncHandler(aufnahmeController.deleteNote)
);

module.exports = router;