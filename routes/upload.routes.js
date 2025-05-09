// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth');

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware.auth);

// POST /api/uploads - Datei hochladen
router.post(
  '/',
  uploadController.uploadDatei
);

// GET /api/uploads - Alle Uploads abrufen
router.get(
  '/',
  uploadController.getAllUploads
);

// GET /api/uploads/:id - Upload nach ID abrufen
router.get(
  '/:id',
  uploadController.getUploadById
);

// DELETE /api/uploads/:id - Upload löschen
router.delete(
  '/:id',
  uploadController.deleteUpload
);

module.exports = router;