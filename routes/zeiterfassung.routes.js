// routes/zeiterfassung.routes.js
const express = require('express');
const router = express.Router();
const zeiterfassungController = require('../controllers/zeiterfassung.controller');
const authMiddleware = require('../middleware/auth');
const validators = require('../middleware/validation');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// GET /api/zeiterfassung/mitarbeiter - Mitarbeiter für Zeiterfassung abrufen
router.get(
  '/mitarbeiter',
  zeiterfassungController.getMitarbeiterForZeiterfassung
);

// GET /api/zeiterfassung/projekte - Umzugsprojekte für Zeiterfassung abrufen
router.get(
  '/projekte',
  zeiterfassungController.getUmzugsprojekte
);

// GET /api/zeiterfassung/projekt/:projektId - Zeiterfassungen für ein Projekt abrufen
router.get(
  '/projekt/:projektId',
  zeiterfassungController.getZeiterfassungenByProjekt
);

// POST /api/zeiterfassung - Neue Zeiterfassung erstellen
router.post(
  '/',
  validators.zeiterfassungValidation,
  zeiterfassungController.createZeiterfassung
);

// PUT /api/zeiterfassung/:id - Zeiterfassung aktualisieren
router.put(
  '/:id',
  validators.zeiterfassungValidation,
  zeiterfassungController.updateZeiterfassung
);

// DELETE /api/zeiterfassung/:id - Zeiterfassung löschen
router.delete(
  '/:id',
  zeiterfassungController.deleteZeiterfassung
);

// POST /api/zeiterfassung/mitarbeiter - Neuen Mitarbeiter für Zeiterfassung erstellen
router.post(
  '/mitarbeiter',
  authMiddleware.checkRole('admin'),
  validators.mitarbeiterValidation,
  zeiterfassungController.addMitarbeiter
);

// DELETE /api/zeiterfassung/mitarbeiter/:id - Mitarbeiter aus Zeiterfassung entfernen
router.delete(
  '/mitarbeiter/:id',
  authMiddleware.checkRole('admin'),
  zeiterfassungController.deleteMitarbeiter
);

module.exports = router;