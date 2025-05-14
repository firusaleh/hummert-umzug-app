// routes/mitarbeiter.routes.js - Aktualisierte Version ohne Admin-Check
const express = require('express');
const router = express.Router();
const mitarbeiterController = require('../controllers/mitarbeiter.controller');
const authMiddleware = require('../middleware/auth');
const validators = require('../middleware/validation');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// GET /api/mitarbeiter - Alle Mitarbeiter abrufen
router.get(
  '/',
  mitarbeiterController.getAllMitarbeiter
);

// GET /api/mitarbeiter/:id - Einen Mitarbeiter nach ID abrufen
router.get(
  '/:id',
  mitarbeiterController.getMitarbeiterById
);

// POST /api/mitarbeiter - Neuen Mitarbeiter erstellen
// Admin-Check entfernt
router.post(
  '/',
  validators.mitarbeiterValidation,
  mitarbeiterController.createMitarbeiter
);

// PUT /api/mitarbeiter/:id - Mitarbeiter aktualisieren
// Admin-Check entfernt
router.put(
  '/:id',
  validators.mitarbeiterValidation,
  mitarbeiterController.updateMitarbeiter
);

// POST /api/mitarbeiter/:id/arbeitszeit - Arbeitszeit hinzufügen
router.post(
  '/:id/arbeitszeit',
  mitarbeiterController.addArbeitszeit
);

// POST /api/mitarbeiter/:id/dokument - Dokument hinzufügen
router.post(
  '/:id/dokument',
  mitarbeiterController.addDokument
);

module.exports = router;