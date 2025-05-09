// routes/umzug.routes.js
const express = require('express');
const router = express.Router();
const umzugController = require('../controllers/umzug.controller');
const authMiddleware = require('../middleware/auth');
const validators = require('../middleware/validation');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// GET /api/umzuege - Alle Umzüge abrufen
router.get(
  '/',
  umzugController.getAllUmzuege
);

// GET /api/umzuege/:id - Einen Umzug nach ID abrufen
router.get(
  '/:id',
  umzugController.getUmzugById
);

// POST /api/umzuege - Neuen Umzug erstellen
router.post(
  '/',
  validators.umzugValidation,
  umzugController.createUmzug
);

// PUT /api/umzuege/:id - Umzug aktualisieren
router.put(
  '/:id',
  umzugController.updateUmzug
);

// POST /api/umzuege/:id/task - Task hinzufügen
router.post(
  '/:id/task',
  umzugController.addTask
);

// PUT /api/umzuege/:id/task/:taskId - Task aktualisieren
router.put(
  '/:id/task/:taskId',
  umzugController.updateTask
);

// POST /api/umzuege/:id/dokument - Dokument hinzufügen
router.post(
  '/:id/dokument',
  umzugController.addDokument
);

// POST /api/umzuege/:id/notiz - Notiz hinzufügen
router.post(
  '/:id/notiz',
  umzugController.addNotiz
);

module.exports = router;