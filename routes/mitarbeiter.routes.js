// routes/mitarbeiter.routes.js - Updated with pagination support
const express = require('express');
const router = express.Router();
const mitarbeiterController = require('../controllers/mitarbeiter.controller');
const authMiddleware = require('../middleware/auth');
const { mitarbeiter: mitarbeiterValidation } = require('../middleware/validators');
const pagination = require('../middleware/pagination.fixed');

// All routes require authentication
router.use(authMiddleware.auth);

// GET /api/mitarbeiter - Get all employees with pagination
router.get(
  '/',
  pagination.paginateOffset(20, 100),
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

// GET /api/mitarbeiter/:id/arbeitszeit - Get work times for an employee
router.get(
  '/:id/arbeitszeit',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.arbeitszeitQuery,
  mitarbeiterController.getArbeitszeiten
);

// POST /api/mitarbeiter/:id/dokument - Add document
router.post(
  '/:id/dokument',
  mitarbeiterValidation.validateId,
  mitarbeiterValidation.addDokument,
  mitarbeiterController.addDokument
);

// DELETE /api/mitarbeiter/:id - Delete employee
router.delete(
  '/:id',
  mitarbeiterValidation.validateId,
  mitarbeiterController.deleteMitarbeiter
);

module.exports = router;