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

// GET /api/auth/check - API-Verfügbarkeit und Authentifizierungsservice prüfen
router.get('/check', (req, res) => {
  try {
    // Dieser Endpunkt gibt einfach eine erfolgreiche Antwort zurück
    // ohne Authentifizierung zu erfordern - nur um die API-Verfügbarkeit zu prüfen
    res.status(200).json({
      status: 'ok',
      message: 'Authentifizierungsservice ist verfügbar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth-Check-Fehler:', error);
    res.status(500).json({
      status: 'error',
      message: 'Fehler bei der Authentifizierungsprüfung'
    });
  }
});

module.exports = router;