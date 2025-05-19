// routes/zeiterfassung.routes.fixed.js
const express = require('express');
const router = express.Router();
const zeiterfassungController = require('../controllers/zeiterfassung.controller');
const { auth, authorize } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { paginate, sort, filter } = require('../middleware/pagination');

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
const zeiterfassungValidation = {
  create: [
    body('mitarbeiterId')
      .notEmpty()
      .isMongoId().withMessage('Ungültige Mitarbeiter-ID'),
    body('datum')
      .notEmpty()
      .isISO8601().withMessage('Ungültiges Datum'),
    body('startzeit')
      .notEmpty()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format HH:MM erforderlich'),
    body('endzeit')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format HH:MM erforderlich')
      .custom((value, { req }) => {
        if (!value || !req.body.startzeit) return true;
        const [startH, startM] = req.body.startzeit.split(':').map(Number);
        const [endH, endM] = value.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        return endMinutes > startMinutes;
      }).withMessage('Endzeit muss nach Startzeit liegen'),
    body('pausen')
      .optional()
      .isArray(),
    body('pausen.*.start')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('pausen.*.ende')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('projektId')
      .optional()
      .isMongoId(),
    body('taetigkeit')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('fahrzeugId')
      .optional()
      .isMongoId()
  ],
  
  update: [
    body('endzeit')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('pausen')
      .optional()
      .isArray(),
    body('taetigkeit')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('status')
      .optional()
      .isIn(['erfasst', 'genehmigt', 'abgelehnt', 'korrektur'])
  ],
  
  approve: [
    body('genehmigt').notEmpty().isBoolean(),
    body('kommentar').optional().trim()
  ],
  
  validateId: [
    param('id').isMongoId().withMessage('Ungültige Zeiterfassungs-ID')
  ],
  
  query: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('mitarbeiterId').optional().isMongoId(),
    query('datum').optional().isISO8601(),
    query('vonDatum').optional().isISO8601(),
    query('bisDatum').optional().isISO8601(),
    query('status').optional().isIn(['erfasst', 'genehmigt', 'abgelehnt', 'korrektur']),
    query('projektId').optional().isMongoId()
  ]
};

// All routes require authentication
router.use(auth);

// Routes

// GET /api/zeiterfassung - Get time entries with pagination
router.get('/',
  zeiterfassungValidation.query,
  validate,
  paginate,
  filter(['mitarbeiterId', 'status', 'projektId']),
  sort(['datum', 'createdAt']),
  asyncHandler(zeiterfassungController.getAllZeiterfassungen)
);

// GET /api/zeiterfassung/current - Get current user's time entries
router.get('/current',
  zeiterfassungValidation.query,
  validate,
  paginate,
  sort(['datum', 'createdAt']),
  asyncHandler(zeiterfassungController.getMyZeiterfassungen)
);

// GET /api/zeiterfassung/active - Get active time entries
router.get('/active',
  asyncHandler(zeiterfassungController.getActiveZeiterfassungen)
);

// GET /api/zeiterfassung/:id - Get specific time entry
router.get('/:id',
  zeiterfassungValidation.validateId,
  validate,
  asyncHandler(zeiterfassungController.getZeiterfassungById)
);

// POST /api/zeiterfassung - Create time entry
router.post('/',
  zeiterfassungValidation.create,
  validate,
  asyncHandler(zeiterfassungController.createZeiterfassung)
);

// PUT /api/zeiterfassung/:id - Update time entry
router.put('/:id',
  zeiterfassungValidation.validateId,
  zeiterfassungValidation.update,
  validate,
  asyncHandler(zeiterfassungController.updateZeiterfassung)
);

// POST /api/zeiterfassung/:id/checkout - Check out (end time entry)
router.post('/:id/checkout',
  zeiterfassungValidation.validateId,
  body('endzeit').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  validate,
  asyncHandler(zeiterfassungController.checkOut)
);

// POST /api/zeiterfassung/:id/pause - Add/update pause
router.post('/:id/pause',
  zeiterfassungValidation.validateId,
  body('start').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('ende').notEmpty().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  validate,
  asyncHandler(zeiterfassungController.addPause)
);

// DELETE /api/zeiterfassung/:id - Delete time entry
router.delete('/:id',
  authorize('admin', 'mitarbeiter'),
  zeiterfassungValidation.validateId,
  validate,
  asyncHandler(zeiterfassungController.deleteZeiterfassung)
);

// Approval workflow
router.post('/:id/approve',
  authorize('admin', 'teamleiter'),
  zeiterfassungValidation.validateId,
  zeiterfassungValidation.approve,
  validate,
  asyncHandler(zeiterfassungController.approveZeiterfassung)
);

router.post('/bulk-approve',
  authorize('admin', 'teamleiter'),
  body('ids').isArray(),
  body('ids.*').isMongoId(),
  body('genehmigt').notEmpty().isBoolean(),
  validate,
  asyncHandler(zeiterfassungController.bulkApprove)
);

// Reports
router.get('/report/monthly',
  query('year').notEmpty().isInt({ min: 2000, max: 2100 }),
  query('month').notEmpty().isInt({ min: 1, max: 12 }),
  query('mitarbeiterId').optional().isMongoId(),
  validate,
  asyncHandler(zeiterfassungController.getMonthlyReport)
);

router.get('/report/project',
  query('projektId').notEmpty().isMongoId(),
  query('vonDatum').optional().isISO8601(),
  query('bisDatum').optional().isISO8601(),
  validate,
  asyncHandler(zeiterfassungController.getProjectReport)
);

router.get('/report/overtime',
  query('year').notEmpty().isInt({ min: 2000, max: 2100 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('mitarbeiterId').optional().isMongoId(),
  validate,
  asyncHandler(zeiterfassungController.getOvertimeReport)
);

// Export
router.get('/export',
  authorize('admin'),
  query('format').isIn(['csv', 'excel', 'pdf']),
  query('vonDatum').notEmpty().isISO8601(),
  query('bisDatum').notEmpty().isISO8601(),
  query('mitarbeiterId').optional().isMongoId(),
  validate,
  asyncHandler(zeiterfassungController.exportZeiterfassung)
);

// Summary statistics
router.get('/stats/summary',
  query('vonDatum').optional().isISO8601(),
  query('bisDatum').optional().isISO8601(),
  validate,
  asyncHandler(zeiterfassungController.getSummaryStats)
);

// Working time validation
router.post('/validate',
  body('mitarbeiterId').notEmpty().isMongoId(),
  body('datum').notEmpty().isISO8601(),
  body('arbeitszeiten').isArray(),
  validate,
  asyncHandler(zeiterfassungController.validateWorkingTime)
);

module.exports = router;