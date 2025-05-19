// routes/mitarbeiter.routes.js - Updated with pagination support
const express = require('express');
const router = express.Router();
const mitarbeiterController = require('../controllers/mitarbeiter.controller');
const authMiddleware = require('../middleware/auth');
const { mitarbeiter: mitarbeiterValidation } = require('../middleware/validators');
const { 
  offsetPagination, 
  addSortingAndFiltering 
} = require('../middleware/pagination');

// All routes require authentication
router.use(authMiddleware.auth);

// GET /api/mitarbeiter - Get all employees with pagination
router.get(
  '/',
  offsetPagination,
  addSortingAndFiltering(['nachname', 'vorname', 'position', 'isActive']),
  mitarbeiterValidation.list,
  mitarbeiterController.getAllMitarbeiter
);

// GET /api/mitarbeiter/:id - Get employee by ID
router.get(
  '/:id',
  mitarbeiterValidation.validateId,
  mitarbeiterController.getMitarbeiterById
);

// POST /api/mitarbeiter - Create new employee
router.post(
  '/',
  mitarbeiterValidation.create,
  mitarbeiterController.createMitarbeiter
);

// PUT /api/mitarbeiter/:id - Update employee
router.put(
  '/:id',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.update,
  mitarbeiterController.updateMitarbeiter
);

// POST /api/mitarbeiter/:id/arbeitszeit - Add work time
router.post(
  '/:id/arbeitszeit',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.addArbeitszeit,
  mitarbeiterController.addArbeitszeit
);

// POST /api/mitarbeiter/:id/dokument - Add document
router.post(
  '/:id/dokument',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.addDokument,
  mitarbeiterController.addDokument
);

module.exports = router;