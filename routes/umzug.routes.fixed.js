// routes/umzug.routes.fixed.js
const express = require('express');
const router = express.Router();
const umzugController = require('../controllers/umzug.controller.fixed');
const { protect } = require('../middleware/auth');
const { paginateOffset, paginateCursor } = require('../middleware/pagination');
const { validateUmzug } = require('../middleware/validators/umzug.validator');

// Apply authentication to all routes
router.use(protect);

// Umzug routes with pagination
router.get('/', 
  paginateOffset(),
  umzugController.getAllUmzuege.bind(umzugController)
);

router.get('/stream',
  paginateCursor(),
  umzugController.getUmzuegeStream.bind(umzugController)
);

router.get('/:id', 
  umzugController.getUmzugById.bind(umzugController)
);

router.post('/', 
  validateUmzug,
  umzugController.createUmzug.bind(umzugController)
);

router.put('/:id',
  validateUmzug,
  umzugController.updateUmzug.bind(umzugController)
);

router.put('/:id/status',
  umzugController.updateStatus.bind(umzugController)
);

// Task management
router.post('/:id/tasks',
  umzugController.addTask.bind(umzugController)
);

router.put('/:id/tasks/:taskId',
  umzugController.updateTask.bind(umzugController)
);

router.delete('/:id/tasks/:taskId',
  umzugController.deleteTask.bind(umzugController)
);

// Document management
router.post('/:id/dokumente',
  umzugController.addDokument.bind(umzugController)
);

router.delete('/:id/dokumente/:dokumentId',
  umzugController.deleteDokument.bind(umzugController)
);

// Note management
router.post('/:id/notizen',
  umzugController.addNotiz.bind(umzugController)
);

router.delete('/:id/notizen/:notizId',
  umzugController.deleteNotiz.bind(umzugController)
);

module.exports = router;