// routes/umzug.routes.js - Updated with pagination support
const express = require('express');
const router = express.Router();
const umzugController = require('../controllers/umzug.controller');
const authMiddleware = require('../middleware/auth');
const { umzug: umzugValidation } = require('../middleware/validators');
const pagination = require('../middleware/pagination');

// All routes require authentication
router.use(authMiddleware.auth);

// GET /api/umzuege - Get all moves with offset pagination
router.get(
  '/',
  pagination.paginateOffset(20, 100),
  umzugValidation.list,
  umzugController.getAllUmzuege
);

// GET /api/umzuege/stream - Get moves with cursor-based pagination (for real-time)
router.get(
  '/stream',
  pagination.paginateCursor(),
  umzugController.getUmzuegeStream
);

// GET /api/umzuege/:id - Get move by ID with param validation
router.get(
  '/:id',
  umzugValidation.validateId,
  umzugController.getUmzugById
);

// POST /api/umzuege - Create new move
router.post(
  '/',
  umzugValidation.create,
  umzugController.createUmzug
);

// PUT /api/umzuege/:id - Update move
router.put(
  '/:id',
  umzugValidation.validateId,
  umzugValidation.update,
  umzugController.updateUmzug
);

// POST /api/umzuege/:id/task - Add task
router.post(
  '/:id/task',
  umzugValidation.validateId,
  umzugValidation.addTask,
  umzugController.addTask
);

// PUT /api/umzuege/:id/task/:taskId - Update task
router.put(
  '/:id/task/:taskId',
  umzugValidation.validateTaskId,
  umzugValidation.updateTask,
  umzugController.updateTask
);

// POST /api/umzuege/:id/dokument - Add document
router.post(
  '/:id/dokument',
  umzugValidation.validateId,
  umzugValidation.addDokument,
  umzugController.addDokument
);

// POST /api/umzuege/:id/notiz - Add note
router.post(
  '/:id/notiz',
  umzugValidation.validateId,
  umzugValidation.addNotiz,
  umzugController.addNotiz
);

// DELETE /api/umzuege/:id - Delete move
router.delete(
  '/:id',
  umzugValidation.validateId,
  umzugController.deleteUmzug
);

module.exports = router;