// routes/benachrichtigung.routes.js - Updated with validation and pagination support
const express = require('express');
const router = express.Router();
const benachrichtigungController = require('../controllers/benachrichtigung.controller');
const { auth, checkRole } = require('../middleware/auth');
const pagination = require('../middleware/pagination');
const validate = require('../middleware/validators/benachrichtigung.validators');

// Alle Routen benötigen Authentifizierung
router.use(auth);

// GET /api/benachrichtigungen - Alle Benachrichtigungen des Benutzers abrufen mit Cursor Pagination
router.get(
  '/',
  validate.validateList,
  pagination.paginateCursor ? pagination.paginateCursor() : (req, res, next) => next(),
  benachrichtigungController.getMeineBenachrichtigungen
);

// GET /api/benachrichtigungen/ungelesen - Anzahl ungelesener Benachrichtigungen
router.get(
  '/ungelesen',
  benachrichtigungController.getUngeleseneAnzahl
);

// GET /api/benachrichtigungen/:id - Einzelne Benachrichtigung abrufen
router.get(
  '/:id',
  validate.validateId,
  benachrichtigungController.getBenachrichtigung
);

// GET /api/benachrichtigungen/einstellungen - Benachrichtigungseinstellungen abrufen
router.get(
  '/einstellungen',
  benachrichtigungController.getEinstellungen
);

// PUT /api/benachrichtigungen/:id/gelesen - Benachrichtigung als gelesen markieren
router.put(
  '/:id/gelesen',
  validate.validateId,
  benachrichtigungController.markiereAlsGelesen
);

// PUT /api/benachrichtigungen/alle-gelesen - Alle Benachrichtigungen als gelesen markieren
router.put(
  '/alle-gelesen',
  benachrichtigungController.alleAlsGelesenMarkieren
);

// PUT /api/benachrichtigungen/einstellungen - Benachrichtigungseinstellungen aktualisieren
router.put(
  '/einstellungen',
  validate.validateSettings,
  benachrichtigungController.updateEinstellungen
);

// POST /api/benachrichtigungen - Neue Benachrichtigung erstellen (benötigt Admin-Rolle)
router.post(
  '/',
  checkRole('admin'),
  validate.validateCreate,
  benachrichtigungController.createBenachrichtigung
);

// POST /api/benachrichtigungen/masse - Massenbenachrichtigungen erstellen (benötigt Admin-Rolle)
router.post(
  '/masse',
  checkRole('admin'),
  validate.validateMass,
  benachrichtigungController.createMassenbenachrichtigung
);

// POST /api/benachrichtigungen/task-erinnerungen - Erinnerungen für offene Tasks erstellen (benötigt Admin-Rolle)
router.post(
  '/task-erinnerungen',
  checkRole('admin'),
  benachrichtigungController.erstelleTaskErinnerungen
);

// POST /api/benachrichtigungen/email - E-Mail-Benachrichtigung senden (benötigt Admin-Rolle)
router.post(
  '/email',
  checkRole('admin'),
  validate.validateEmail,
  benachrichtigungController.sendEmailBenachrichtigung
);

// DELETE /api/benachrichtigungen/:id - Benachrichtigung löschen
router.delete(
  '/:id',
  validate.validateId,
  benachrichtigungController.deleteBenachrichtigung
);

module.exports = router;