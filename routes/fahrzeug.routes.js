// routes/fahrzeug.routes.js
const express = require('express');
const router = express.Router();
const fahrzeugController = require('../controllers/fahrzeug.controller');
const authMiddleware = require('../middleware/auth');
const { fahrzeug: fahrzeugValidation } = require('../middleware/validators');
const pagination = require('../middleware/pagination.fixed');

// All routes require authentication
router.use(authMiddleware.auth);

// GET /api/fahrzeuge - Get all vehicles with pagination
router.get(
  '/',
  pagination.paginateOffset(20, 100),
  fahrzeugValidation.list,
  fahrzeugController.getAllFahrzeuge
);

// GET /api/fahrzeuge/:id - Get vehicle by ID
router.get(
  '/:id',
  fahrzeugValidation.validateId,
  fahrzeugController.getFahrzeugById
);

// POST /api/fahrzeuge - Create new vehicle
router.post(
  '/',
  fahrzeugValidation.create,
  fahrzeugController.createFahrzeug
);

// PUT /api/fahrzeuge/:id - Update vehicle
router.put(
  '/:id',
  fahrzeugValidation.update,
  fahrzeugController.updateFahrzeug
);

// PATCH /api/fahrzeuge/:id/status - Update vehicle status
router.patch(
  '/:id/status',
  fahrzeugValidation.updateStatus,
  fahrzeugController.updateFahrzeugStatus
);

// PATCH /api/fahrzeuge/:id/kilometerstand - Update kilometer reading
router.patch(
  '/:id/kilometerstand',
  fahrzeugValidation.updateKilometerstand,
  fahrzeugController.updateKilometerstand
);

// DELETE /api/fahrzeuge/:id - Delete vehicle
router.delete(
  '/:id',
  fahrzeugValidation.validateId,
  fahrzeugController.deleteFahrzeug
);

// POST /api/fahrzeuge/:id/image - Upload vehicle image
router.post(
  '/:id/image',
  fahrzeugValidation.validateId,
  fahrzeugController.uploadFahrzeugImage
);

module.exports = router;