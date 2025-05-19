// routes/mitarbeiter.routes.fixed.js
const express = require('express');
const router = express.Router();
const mitarbeiterController = require('../controllers/mitarbeiter.controller');
const { auth, admin, authorize } = require('../middleware/auth');
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
const mitarbeiterValidation = {
  create: [
    body('vorname')
      .trim()
      .notEmpty().withMessage('Vorname ist erforderlich')
      .isLength({ min: 2, max: 50 }),
    body('nachname')
      .trim()
      .notEmpty().withMessage('Nachname ist erforderlich')
      .isLength({ min: 2, max: 50 }),
    body('geburtsdatum')
      .optional()
      .isISO8601().withMessage('Ungültiges Geburtsdatum')
      .custom((value) => {
        const age = (new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000);
        return age >= 18 && age <= 70;
      }).withMessage('Mitarbeiter muss zwischen 18 und 70 Jahre alt sein'),
    body('telefon')
      .trim()
      .notEmpty().withMessage('Telefonnummer ist erforderlich')
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/).withMessage('Ungültige deutsche Telefonnummer'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('position')
      .notEmpty()
      .isIn(['fahrer', 'helfer', 'teamleiter', 'disponent', 'buero'])
      .withMessage('Ungültige Position'),
    body('einstellungsdatum')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Einstellungsdatum'),
    body('gehalt')
      .optional()
      .isFloat({ min: 0 }).withMessage('Gehalt muss positiv sein'),
    body('fuehrerscheinklassen')
      .optional()
      .isArray(),
    body('fuehrerscheinklassen.*')
      .isIn(['B', 'BE', 'C', 'CE', 'C1', 'C1E']).withMessage('Ungültige Führerscheinklasse')
  ],
  
  update: [
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('telefon')
      .optional()
      .trim()
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/).withMessage('Ungültige deutsche Telefonnummer'),
    body('position')
      .optional()
      .isIn(['fahrer', 'helfer', 'teamleiter', 'disponent', 'buero']),
    body('isActive')
      .optional()
      .isBoolean()
  ],
  
  addArbeitszeit: [
    body('datum')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Datum'),
    body('startzeit')
      .notEmpty()
      .isISO8601().withMessage('Ungültige Startzeit'),
    body('endzeit')
      .notEmpty()
      .isISO8601().withMessage('Ungültige Endzeit')
      .custom((value, { req }) => new Date(value) > new Date(req.body.startzeit))
      .withMessage('Endzeit muss nach Startzeit liegen'),
    body('pausen')
      .optional()
      .isArray(),
    body('pausen.*.start')
      .isISO8601().withMessage('Ungültige Pausenstart-Zeit'),
    body('pausen.*.ende')
      .isISO8601().withMessage('Ungültige Pausenend-Zeit'),
    body('projekt')
      .optional()
      .isMongoId().withMessage('Ungültige Projekt-ID')
  ],
  
  addQualifikation: [
    body('bezeichnung')
      .trim()
      .notEmpty().withMessage('Bezeichnung ist erforderlich'),
    body('erworbenAm')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Erwerbsdatum'),
    body('gueltigBis')
      .optional()
      .isISO8601().withMessage('Ungültiges Ablaufdatum')
      .custom((value, { req }) => !req.body.erworbenAm || new Date(value) > new Date(req.body.erworbenAm))
      .withMessage('Ablaufdatum muss nach Erwerbsdatum liegen')
  ],
  
  validateId: [
    param('id')
      .isMongoId().withMessage('Ungültige Mitarbeiter-ID')
  ],
  
  query: [
    query('page')
      .optional()
      .isInt({ min: 1 }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),
    query('position')
      .optional()
      .isIn(['fahrer', 'helfer', 'teamleiter', 'disponent', 'buero']),
    query('isActive')
      .optional()
      .isBoolean(),
    query('search')
      .optional()
      .trim()
  ]
};

// All routes require authentication
router.use(auth);

// Routes

// GET /api/mitarbeiter - Get all employees with pagination
router.get('/',
  mitarbeiterValidation.query,
  validate,
  paginate,
  filter(['position', 'isActive']),
  sort(['nachname', 'vorname', 'createdAt']),
  asyncHandler(mitarbeiterController.getAllMitarbeiter)
);

// GET /api/mitarbeiter/stats - Get statistics
router.get('/stats',
  authorize('admin'),
  asyncHandler(mitarbeiterController.getStats)
);

// GET /api/mitarbeiter/:id - Get employee by ID
router.get('/:id',
  mitarbeiterValidation.validateId,
  validate,
  asyncHandler(mitarbeiterController.getMitarbeiterById)
);

// POST /api/mitarbeiter - Create new employee
router.post('/',
  authorize('admin'),
  mitarbeiterValidation.create,
  validate,
  asyncHandler(mitarbeiterController.createMitarbeiter)
);

// PUT /api/mitarbeiter/:id - Update employee
router.put('/:id',
  authorize('admin'),
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.update,
  validate,
  asyncHandler(mitarbeiterController.updateMitarbeiter)
);

// DELETE /api/mitarbeiter/:id - Deactivate employee
router.delete('/:id',
  authorize('admin'),
  mitarbeiterValidation.validateId,
  validate,
  asyncHandler(mitarbeiterController.deactivateMitarbeiter)
);

// Working hours management
router.post('/:id/arbeitszeiten',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.addArbeitszeit,
  validate,
  asyncHandler(mitarbeiterController.addArbeitszeit)
);

router.get('/:id/arbeitszeiten',
  mitarbeiterValidation.validateId,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate,
  asyncHandler(mitarbeiterController.getArbeitszeiten)
);

router.put('/:id/arbeitszeiten/:arbeitszeitId',
  param('id').isMongoId(),
  param('arbeitszeitId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.updateArbeitszeit)
);

router.delete('/:id/arbeitszeiten/:arbeitszeitId',
  authorize('admin'),
  param('id').isMongoId(),
  param('arbeitszeitId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.deleteArbeitszeit)
);

// Qualifications
router.post('/:id/qualifikationen',
  authorize('admin'),
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.addQualifikation,
  validate,
  asyncHandler(mitarbeiterController.addQualifikation)
);

router.delete('/:id/qualifikationen/:qualifikationId',
  authorize('admin'),
  param('id').isMongoId(),
  param('qualifikationId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.deleteQualifikation)
);

// Documents
router.post('/:id/dokumente',
  mitarbeiterValidation.validateId,
  validate,
  fileUpload.single('dokument'),
  asyncHandler(mitarbeiterController.uploadDokument)
);

router.get('/:id/dokumente/:dokumentId',
  param('id').isMongoId(),
  param('dokumentId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.getDokument)
);

router.delete('/:id/dokumente/:dokumentId',
  authorize('admin'),
  param('id').isMongoId(),
  param('dokumentId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.deleteDokument)
);

// Availability
router.get('/:id/verfuegbarkeit',
  mitarbeiterValidation.validateId,
  query('startDate').notEmpty().isISO8601(),
  query('endDate').notEmpty().isISO8601(),
  validate,
  asyncHandler(mitarbeiterController.getVerfuegbarkeit)
);

router.post('/:id/verfuegbarkeit',
  mitarbeiterValidation.validateId,
  body('datum').notEmpty().isISO8601(),
  body('verfuegbar').notEmpty().isBoolean(),
  body('grund').optional().trim(),
  validate,
  asyncHandler(mitarbeiterController.setVerfuegbarkeit)
);

// Monthly report
router.get('/:id/monatsbericht',
  mitarbeiterValidation.validateId,
  query('year').notEmpty().isInt({ min: 2000, max: 2100 }),
  query('month').notEmpty().isInt({ min: 1, max: 12 }),
  validate,
  asyncHandler(mitarbeiterController.getMonatsbericht)
);

// Skills
router.post('/:id/skills',
  authorize('admin'),
  mitarbeiterValidation.validateId,
  body('skill').trim().notEmpty(),
  body('level').isIn(['Anfänger', 'Fortgeschritten', 'Experte']),
  validate,
  asyncHandler(mitarbeiterController.addSkill)
);

router.delete('/:id/skills/:skillId',
  authorize('admin'),
  param('id').isMongoId(),
  param('skillId').isMongoId(),
  validate,
  asyncHandler(mitarbeiterController.deleteSkill)
);

module.exports = router;