// routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, admin } = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', protect, userController.getProfile);

// PUT /api/users/profile
router.put('/profile', protect, userController.updateProfile);

// Andere Benutzerrouten (nur für Admins)
// GET /api/users - Alle Benutzer abrufen (nur Admin)
// GET /api/users/:id - Bestimmten Benutzer abrufen (nur Admin)
// DELETE /api/users/:id - Benutzer löschen (nur Admin)

module.exports = router;