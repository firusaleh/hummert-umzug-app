// routes/task.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');

// POST /api/tasks
router.post('/', protect, validation.taskValidation, taskController.createTask);

// GET /api/tasks
router.get('/', protect, taskController.getTasks);

// GET /api/tasks/:id
router.get('/:id', protect, taskController.getTaskById);

// PUT /api/tasks/:id
router.put('/:id', protect, validation.taskValidation, taskController.updateTask);

// DELETE /api/tasks/:id
router.delete('/:id', protect, taskController.deleteTask);

module.exports = router;