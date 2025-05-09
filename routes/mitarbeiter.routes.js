// routes/mitarbeiter.routes.js
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
router.post(
  '/',
  authMiddleware.checkRole('admin'),
  validators.mitarbeiterValidation,
  mitarbeiterController.createMitarbeiter
);

// PUT /api/mitarbeiter/:id - Mitarbeiter aktualisieren
router.put(
  '/:id',
  authMiddleware.checkRole('admin'),
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