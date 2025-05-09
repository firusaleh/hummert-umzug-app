// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');
const validators = require('../middleware/validation');

// POST /api/auth/register - Benutzer registrieren
router.post(
  '/register',
  validators.registerValidation,
  authController.register
);

// POST /api/auth/login - Benutzer anmelden
router.post(
  '/login',
  validators.loginValidation,
  authController.login
);

// GET /api/auth/me - Aktuellen Benutzer abrufen
router.get(
  '/me',
  authMiddleware.auth,
  authController.getMe
);

module.exports = router;