// routes/client.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');

// POST /api/clients
router.post('/', protect, validation.clientValidation, clientController.createClient);

// GET /api/clients
router.get('/', protect, clientController.getClients);

// GET /api/clients/:id
router.get('/:id', protect, clientController.getClientById);

// PUT /api/clients/:id
router.put('/:id', protect, validation.clientValidation, clientController.updateClient);

// DELETE /api/clients/:id
router.delete('/:id', protect, clientController.deleteClient);

module.exports = router;