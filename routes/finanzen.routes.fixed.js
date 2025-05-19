// routes/finanzen.routes.fixed.js
const express = require('express');
const router = express.Router();
const finanzenController = require('../controllers/finanzen.controller');
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

// Common validation rules
const commonValidation = {
  validateId: param('id').isMongoId().withMessage('Ungültige ID'),
  validateMongoId: (field) => param(field).isMongoId().withMessage(`Ungültige ${field}`),
  paginationQuery: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().trim(),
    query('search').optional().trim()
  ]
};

// Angebot validation
const angebotValidation = {
  create: [
    body('kunde').notEmpty().isMongoId().withMessage('Kunde ist erforderlich'),
    body('gueltigBis')
      .notEmpty()
      .isISO8601()
      .custom(value => new Date(value) > new Date())
      .withMessage('Gültigkeitsdatum muss in der Zukunft liegen'),
    body('positionsliste').isArray({ min: 1 }).withMessage('Mindestens eine Position erforderlich'),
    body('positionsliste.*.bezeichnung').trim().notEmpty(),
    body('positionsliste.*.menge').isFloat({ min: 0.01 }),
    body('positionsliste.*.einheit').notEmpty(),
    body('positionsliste.*.einzelpreis').isFloat({ min: 0 }),
    body('preisgestaltung.mehrwertsteuer.satz')
      .optional()
      .isIn([0, 7, 19])
      .withMessage('Ungültiger Mehrwertsteuersatz')
  ],
  update: [
    body('gueltigBis')
      .optional()
      .isISO8601()
      .custom(value => new Date(value) > new Date()),
    body('status')
      .optional()
      .isIn(['Entwurf', 'Gesendet', 'Akzeptiert', 'Abgelehnt', 'Abgelaufen']),
    body('positionsliste.*.einzelpreis')
      .optional()
      .isFloat({ min: 0 })
  ]
};

// Rechnung validation
const rechnungValidation = {
  create: [
    body('kunde').notEmpty().isMongoId().withMessage('Kunde ist erforderlich'),
    body('leistungszeitraum.von').notEmpty().isISO8601(),
    body('leistungszeitraum.bis')
      .notEmpty()
      .isISO8601()
      .custom((value, { req }) => new Date(value) >= new Date(req.body.leistungszeitraum.von))
      .withMessage('Enddatum muss nach Startdatum liegen'),
    body('positionsliste').isArray({ min: 1 }),
    body('positionsliste.*.bezeichnung').trim().notEmpty(),
    body('positionsliste.*.menge').isFloat({ min: 0.01 }),
    body('positionsliste.*.einzelpreis').isFloat({ min: 0 }),
    body('positionsliste.*.steuersatz').isIn([0, 7, 19])
  ],
  addPayment: [
    body('betrag').isFloat({ min: 0.01 }).withMessage('Betrag muss positiv sein'),
    body('zahlungsmethode')
      .isIn(['Überweisung', 'Bar', 'Kreditkarte', 'PayPal', 'SEPA-Lastschrift']),
    body('referenz').optional().trim()
  ]
};

// Projektkosten validation
const projektkostenValidation = {
  create: [
    body('bezeichnung').trim().notEmpty().withMessage('Bezeichnung ist erforderlich'),
    body('kategorie')
      .notEmpty()
      .isIn(['Personal', 'Fahrzeuge', 'Material', 'Verpackung', 'Unterauftrag', 'Versicherung', 'Miete', 'Kraftstoff', 'Verpflegung', 'Sonstiges']),
    body('kostenart')
      .notEmpty()
      .isIn(['Fixkosten', 'Variable Kosten', 'Einmalkosten']),
    body('betrag.betragNetto').isFloat({ min: 0 }),
    body('betrag.steuersatz').isIn([0, 7, 19]),
    body('umzug').optional().isMongoId(),
    body('projekt').optional().isMongoId()
  ],
  update: [
    body('bezahlstatus')
      .optional()
      .isIn(['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt', 'Storniert']),
    body('betrag.betragNetto').optional().isFloat({ min: 0 })
  ]
};

// All routes require authentication
router.use(auth);

// Angebot (Quote) routes
router.get('/angebote',
  commonValidation.paginationQuery,
  validate,
  paginate,
  filter(['status', 'kunde']),
  sort(['createdAt', 'angebotNummer']),
  asyncHandler(finanzenController.getAllAngebote)
);

router.get('/angebote/:id',
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.getAngebotById)
);

router.post('/angebote',
  authorize('admin', 'mitarbeiter'),
  angebotValidation.create,
  validate,
  asyncHandler(finanzenController.createAngebot)
);

router.put('/angebote/:id',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  angebotValidation.update,
  validate,
  asyncHandler(finanzenController.updateAngebot)
);

router.post('/angebote/:id/versenden',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  body('empfaenger').trim().notEmpty(),
  body('nachricht').optional().trim(),
  validate,
  asyncHandler(finanzenController.versendeAngebot)
);

router.post('/angebote/:id/neue-version',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.createNeueVersion)
);

// Rechnung (Invoice) routes
router.get('/rechnungen',
  commonValidation.paginationQuery,
  query('status').optional().isIn(['Entwurf', 'Gesendet', 'Teilweise bezahlt', 'Bezahlt', 'Überfällig', 'Storniert']),
  validate,
  paginate,
  filter(['status', 'kunde']),
  sort(['ausstellungsdatum', 'rechnungNummer']),
  asyncHandler(finanzenController.getAllRechnungen)
);

router.get('/rechnungen/:id',
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.getRechnungById)
);

router.post('/rechnungen',
  authorize('admin', 'mitarbeiter'),
  rechnungValidation.create,
  validate,
  asyncHandler(finanzenController.createRechnung)
);

router.put('/rechnungen/:id',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.updateRechnung)
);

router.post('/rechnungen/:id/zahlungen',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  rechnungValidation.addPayment,
  validate,
  asyncHandler(finanzenController.addZahlung)
);

router.post('/rechnungen/:id/mahnungen',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  body('mahngebuehr').optional().isFloat({ min: 0 }),
  validate,
  asyncHandler(finanzenController.createMahnung)
);

router.post('/rechnungen/:id/stornieren',
  authorize('admin'),
  commonValidation.validateId,
  body('grund').trim().notEmpty(),
  validate,
  asyncHandler(finanzenController.storniereRechnung)
);

// Projektkosten (Project Costs) routes
router.get('/projektkosten',
  commonValidation.paginationQuery,
  query('kategorie').optional(),
  query('bezahlstatus').optional(),
  query('startDatum').optional().isISO8601(),
  query('endDatum').optional().isISO8601(),
  validate,
  paginate,
  filter(['kategorie', 'bezahlstatus', 'kostenart']),
  sort(['datum', 'kostennummer']),
  asyncHandler(finanzenController.getAllProjektkosten)
);

router.get('/projektkosten/:id',
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.getProjektkostenById)
);

router.post('/projektkosten',
  projektkostenValidation.create,
  validate,
  asyncHandler(finanzenController.createProjektkosten)
);

router.put('/projektkosten/:id',
  commonValidation.validateId,
  projektkostenValidation.update,
  validate,
  asyncHandler(finanzenController.updateProjektkosten)
);

router.post('/projektkosten/:id/genehmigung',
  authorize('admin'),
  commonValidation.validateId,
  body('genehmigt').isBoolean(),
  body('kommentar').optional().trim(),
  validate,
  asyncHandler(finanzenController.genehmigeKosten)
);

router.post('/projektkosten/:id/bezahlung',
  authorize('admin', 'mitarbeiter'),
  commonValidation.validateId,
  body('zahlungsmethode').notEmpty(),
  body('referenznummer').optional().trim(),
  validate,
  asyncHandler(finanzenController.markiereAlsBezahlt)
);

// Finanzübersicht (Financial Overview) routes
router.get('/uebersicht',
  authorize('admin'),
  query('jahr').notEmpty().isInt({ min: 2000, max: 2100 }),
  query('monat').notEmpty().isInt({ min: 1, max: 12 }),
  validate,
  asyncHandler(finanzenController.getFinanzuebersicht)
);

router.post('/uebersicht/generieren',
  authorize('admin'),
  body('jahr').notEmpty().isInt({ min: 2000, max: 2100 }),
  body('monat').notEmpty().isInt({ min: 1, max: 12 }),
  validate,
  asyncHandler(finanzenController.generiereFinanzuebersicht)
);

router.post('/uebersicht/:jahr/:monat/finalisieren',
  authorize('admin'),
  param('jahr').isInt({ min: 2000, max: 2100 }),
  param('monat').isInt({ min: 1, max: 12 }),
  validate,
  asyncHandler(finanzenController.finalisiereUebersicht)
);

// Reports and analytics
router.get('/berichte/umsatz',
  authorize('admin'),
  query('von').notEmpty().isISO8601(),
  query('bis').notEmpty().isISO8601(),
  query('gruppierung').optional().isIn(['tag', 'woche', 'monat', 'jahr']),
  validate,
  asyncHandler(finanzenController.getUmsatzbericht)
);

router.get('/berichte/kosten',
  authorize('admin'),
  query('von').notEmpty().isISO8601(),
  query('bis').notEmpty().isISO8601(),
  query('kategorie').optional(),
  validate,
  asyncHandler(finanzenController.getKostenbericht)
);

router.get('/berichte/forderungen',
  authorize('admin'),
  validate,
  asyncHandler(finanzenController.getOffeneForderungen)
);

// Export routes
router.get('/export/rechnungen',
  authorize('admin'),
  query('format').isIn(['csv', 'excel', 'pdf']),
  query('von').optional().isISO8601(),
  query('bis').optional().isISO8601(),
  validate,
  asyncHandler(finanzenController.exportRechnungen)
);

router.get('/export/kosten',
  authorize('admin'),
  query('format').isIn(['csv', 'excel']),
  query('von').optional().isISO8601(),
  query('bis').optional().isISO8601(),
  validate,
  asyncHandler(finanzenController.exportKosten)
);

// File uploads for receipts/documents
router.post('/belege',
  fileUpload.single('beleg'),
  body('typ').isIn(['rechnung', 'quittung', 'vertrag', 'sonstiges']),
  body('beschreibung').optional().trim(),
  validate,
  asyncHandler(finanzenController.uploadBeleg)
);

router.get('/belege/:id',
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.getBeleg)
);

router.delete('/belege/:id',
  authorize('admin'),
  commonValidation.validateId,
  validate,
  asyncHandler(finanzenController.deleteBeleg)
);

module.exports = router;