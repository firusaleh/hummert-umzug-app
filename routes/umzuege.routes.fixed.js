// routes/umzuege.routes.fixed.js
const express = require('express');
const router = express.Router();
const umzugController = require('../controllers/umzug.controller');
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
const umzugValidation = {
  create: [
    body('auftraggeber.name')
      .trim()
      .notEmpty().withMessage('Auftraggeber Name ist erforderlich')
      .isLength({ min: 2, max: 100 }),
    body('auftraggeber.telefon')
      .trim()
      .notEmpty().withMessage('Telefonnummer ist erforderlich')
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/),
    body('auftraggeber.email')
      .optional()
      .trim()
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
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
      .notEmpty().withMessage('Ort ist erforderlich'),
    body('startDatum')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Datum')
      .custom((value) => new Date(value) > new Date())
      .withMessage('Startdatum muss in der Zukunft liegen'),
    body('endDatum')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Datum')
      .custom((value, { req }) => new Date(value) >= new Date(req.body.startDatum))
      .withMessage('Enddatum muss nach oder am Startdatum liegen')
  ],
  
  update: [
    body('status')
      .optional()
      .isIn(['angefragt', 'geplant', 'bestaetigt', 'in_durchfuehrung', 'abgeschlossen', 'storniert'])
      .withMessage('Ungültiger Status'),
    body('startDatum')
      .optional()
      .isISO8601().withMessage('Ungültiges Datum'),
    body('endDatum')
      .optional()
      .isISO8601().withMessage('Ungültiges Datum')
      .custom((value, { req }) => !req.body.startDatum || new Date(value) >= new Date(req.body.startDatum))
      .withMessage('Enddatum muss nach oder am Startdatum liegen')
  ],
  
  addTask: [
    body('beschreibung')
      .trim()
      .notEmpty().withMessage('Beschreibung ist erforderlich'),
    body('prioritaet')
      .optional()
      .isIn(['niedrig', 'mittel', 'hoch']).withMessage('Ungültige Priorität'),
    body('faelligkeit')
      .optional()
      .isISO8601().withMessage('Ungültiges Datum')
  ],
  
  addNotiz: [
    body('text')
      .trim()
      .notEmpty().withMessage('Notiztext ist erforderlich')
      .isLength({ max: 1000 }).withMessage('Notiz darf maximal 1000 Zeichen lang sein')
  ],
  
  validateId: [
    param('id')
      .isMongoId().withMessage('Ungültige Umzug-ID')
  ],
  
  query: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Seitenzahl muss mindestens 1 sein'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit muss zwischen 1 und 100 liegen'),
    query('status')
      .optional()
      .isIn(['angefragt', 'geplant', 'bestaetigt', 'in_durchfuehrung', 'abgeschlossen', 'storniert']),
    query('startDate')
      .optional()
      .isISO8601().withMessage('Ungültiges Startdatum'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Ungültiges Enddatum'),
    query('sort')
      .optional()
      .isIn(['startDatum', '-startDatum', 'created', '-created']),
    query('search')
      .optional()
      .trim()
  ]
};

// All routes require authentication
router.use(auth);

// Routes

// GET /api/umzuege - Get all moves with pagination
router.get('/',
  umzugValidation.query,
  validate,
  paginate,
  filter(['status', 'startDatum', 'endDatum']),
  sort(['startDatum', 'createdAt']),
  asyncHandler(umzugController.getAllUmzuege)
);

// GET /api/umzuege/stats - Get statistics
router.get('/stats',
  authorize('admin', 'mitarbeiter'),
  asyncHandler(umzugController.getStats)
);

// GET /api/umzuege/:id - Get move by ID
router.get('/:id',
  umzugValidation.validateId,
  validate,
  asyncHandler(umzugController.getUmzugById)
);

// POST /api/umzuege - Create new move
router.post('/',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.create,
  validate,
  asyncHandler(umzugController.createUmzug)
);

// PUT /api/umzuege/:id - Update move
router.put('/:id',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.validateId,
  umzugValidation.update,
  validate,
  asyncHandler(umzugController.updateUmzug)
);

// DELETE /api/umzuege/:id - Delete move
router.delete('/:id',
  authorize('admin'),
  umzugValidation.validateId,
  validate,
  asyncHandler(umzugController.deleteUmzug)
);

// Status management
router.post('/:id/status',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.validateId,
  body('status').isIn(['angefragt', 'geplant', 'bestaetigt', 'in_durchfuehrung', 'abgeschlossen', 'storniert']),
  body('reason').optional().trim(),
  validate,
  asyncHandler(umzugController.updateStatus)
);

// Task management
router.post('/:id/tasks',
  umzugValidation.validateId,
  umzugValidation.addTask,
  validate,
  asyncHandler(umzugController.addTask)
);

router.put('/:id/tasks/:taskId',
  param('id').isMongoId(),
  param('taskId').isMongoId(),
  body('erledigt').optional().isBoolean(),
  body('beschreibung').optional().trim(),
  validate,
  asyncHandler(umzugController.updateTask)
);

router.delete('/:id/tasks/:taskId',
  authorize('admin', 'mitarbeiter'),
  param('id').isMongoId(),
  param('taskId').isMongoId(),
  validate,
  asyncHandler(umzugController.deleteTask)
);

// Notes
router.post('/:id/notes',
  umzugValidation.validateId,
  umzugValidation.addNotiz,
  validate,
  asyncHandler(umzugController.addNote)
);

router.delete('/:id/notes/:noteId',
  authorize('admin'),
  param('id').isMongoId(),
  param('noteId').isMongoId(),
  validate,
  asyncHandler(umzugController.deleteNote)
);

// Documents/Files
router.post('/:id/documents',
  umzugValidation.validateId,
  validate,
  fileUpload.single('document'),
  asyncHandler(umzugController.uploadDocument)
);

router.get('/:id/documents/:documentId',
  param('id').isMongoId(),
  param('documentId').isMongoId(),
  validate,
  asyncHandler(umzugController.getDocument)
);

router.delete('/:id/documents/:documentId',
  authorize('admin', 'mitarbeiter'),
  param('id').isMongoId(),
  param('documentId').isMongoId(),
  validate,
  asyncHandler(umzugController.deleteDocument)
);

// Extra services
router.post('/:id/services',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.validateId,
  body('beschreibung').trim().notEmpty(),
  body('preis').isFloat({ min: 0 }),
  body('menge').optional().isInt({ min: 1 }),
  validate,
  asyncHandler(umzugController.addExtraService)
);

router.delete('/:id/services/:serviceId',
  authorize('admin'),
  param('id').isMongoId(),
  param('serviceId').isMongoId(),
  validate,
  asyncHandler(umzugController.deleteExtraService)
);

// Invoice generation
router.post('/:id/invoice',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.validateId,
  validate,
  asyncHandler(umzugController.generateInvoice)
);

// Cancel move
router.post('/:id/cancel',
  authorize('admin'),
  umzugValidation.validateId,
  body('reason').trim().notEmpty(),
  validate,
  asyncHandler(umzugController.cancelUmzug)
);

// Export to PDF
router.get('/:id/export',
  umzugValidation.validateId,
  validate,
  asyncHandler(umzugController.exportToPDF)
);

// Assign team
router.post('/:id/team',
  authorize('admin', 'mitarbeiter'),
  umzugValidation.validateId,
  body('mitarbeiter').isArray(),
  body('mitarbeiter.*').isMongoId(),
  body('role').optional().isIn(['fahrer', 'helfer', 'teamleiter']),
  validate,
  asyncHandler(umzugController.assignTeam)
);

module.exports = router;