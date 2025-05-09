// routes/file.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

// POST /api/files/upload
router.post('/upload', protect, fileController.upload.single('file'), fileController.uploadFile);

// GET /api/files
router.get('/', protect, fileController.getFiles);

// DELETE /api/files/:id
router.delete('/:id', protect, fileController.deleteFile);

// GET /api/files/download/:id - Route zum Herunterladen einer Datei

module.exports = router;