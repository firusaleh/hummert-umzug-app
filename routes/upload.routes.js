// routes/upload.routes.js - Updated with new validation system
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const authMiddleware = require('../middleware/auth');
const { file: fileValidation } = require('../middleware/validators');

// All routes require authentication
router.use(authMiddleware.auth);

// POST /api/uploads - Upload single file
router.post(
  '/',
  fileValidation.validateFile, // Middleware to validate file before processing
  fileValidation.upload,
  uploadController.uploadDatei
);

// POST /api/uploads/multiple - Upload multiple files (if controller supports it)
// router.post(
//   '/multiple',
//   fileValidation.validateFiles,
//   fileValidation.multiUpload,
//   uploadController.uploadMultipleFiles
// );

// GET /api/uploads - Get all uploads with query validation
router.get(
  '/',
  fileValidation.list,
  uploadController.getAllUploads
);

// GET /api/uploads/:id - Get upload by ID with param validation
router.get(
  '/:id',
  fileValidation.validateId,
  uploadController.getUploadById
);

// PUT /api/uploads/:id - Update upload metadata
// router.put(
//   '/:id',
//   fileValidation.validateId,
//   fileValidation.update,
//   uploadController.updateUpload
// );

// DELETE /api/uploads/:id - Delete upload
router.delete(
  '/:id',
  fileValidation.validateId,
  uploadController.deleteUpload
);

module.exports = router;