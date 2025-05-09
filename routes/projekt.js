// routes/project.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');

// POST /api/projects
router.post('/', protect, validation.projectValidation, projectController.createProject);

// GET /api/projects
router.get('/', protect, projectController.getProjects);

// GET /api/projects/:id
router.get('/:id', protect, projectController.getProjectById);

// PUT /api/projects/:id
router.put('/:id', protect, validation.projectValidation, projectController.updateProject);

// DELETE /api/projects/:id
router.delete('/:id', protect, projectController.deleteProject);

module.exports = router;
