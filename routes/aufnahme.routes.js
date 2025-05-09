// routes/aufnahme.routes.js
const express = require('express');
const router = express.Router();
const aufnahmeController = require('../controllers/aufnahme.controller');
const authMiddleware = require('../middleware/auth');
const validators = require('../middleware/validation');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// GET /api/aufnahmen - Alle Aufnahmen abrufen
router.get(
  '/',
  aufnahmeController.getAllAufnahmen
);

// GET /api/aufnahmen/:id - Eine Aufnahme nach ID abrufen
router.get(
  '/:id',
  aufnahmeController.getAufnahmeById
);

// POST /api/aufnahmen - Neue Aufnahme erstellen
router.post(
  '/',
  validators.aufnahmeValidation,
  aufnahmeController.createAufnahme
);

// PUT /api/aufnahmen/:id - Aufnahme aktualisieren
router.put(
  '/:id',
  aufnahmeController.updateAufnahme
);

// POST /api/aufnahmen/:id/raum - Raum hinzufügen
router.post(
  '/:id/raum',
  aufnahmeController.addRaum
);

// POST /api/aufnahmen/:id/raum/:raumId/moebel - Möbel hinzufügen
router.post(
  '/:id/raum/:raumId/moebel',
  aufnahmeController.addMoebel
);

// POST /api/aufnahmen/:id/bild - Bild hinzufügen
router.post(
  '/:id/bild',
  aufnahmeController.addBild
);

// POST /api/aufnahmen/:id/angebot - Angebot erstellen
router.post(
  '/:id/angebot',
  aufnahmeController.erstelleAngebot
);

module.exports = router;