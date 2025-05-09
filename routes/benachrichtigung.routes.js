// routes/benachrichtigung.routes.js
const express = require('express');
const router = express.Router();
const benachrichtigungController = require('../controllers/benachrichtigung.controller');
const authMiddleware = require('../middleware/auth');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// GET /api/benachrichtigungen - Alle Benachrichtigungen des Benutzers abrufen
router.get(
  '/',
  benachrichtigungController.getMeineBenachrichtigungen
);

// PUT /api/benachrichtigungen/:id/gelesen - Benachrichtigung als gelesen markieren
router.put(
  '/:id/gelesen',
  benachrichtigungController.markiereAlsGelesen
);

// PUT /api/benachrichtigungen/alle-gelesen - Alle Benachrichtigungen als gelesen markieren
router.put(
  '/alle-gelesen',
  benachrichtigungController.alleAlsGelesenMarkieren
);

// POST /api/benachrichtigungen - Neue Benachrichtigung erstellen
router.post(
  '/',
  benachrichtigungController.createBenachrichtigung
);

// POST /api/benachrichtigungen/task-erinnerungen - Erinnerungen für offene Tasks erstellen
router.post(
  '/task-erinnerungen',
  authMiddleware.checkRole('admin'),
  benachrichtigungController.erstelleTaskErinnerungen
);

// POST /api/benachrichtigungen/email - E-Mail-Benachrichtigung senden
router.post(
  '/email',
  benachrichtigungController.sendEmailBenachrichtigung
);

module.exports = router;