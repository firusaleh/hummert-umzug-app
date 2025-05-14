// routes/auth.routes.js - Aktualisierte Version mit Admin-Route
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { check } = require('express-validator');
const { auth } = require('../middleware/auth');

// Registrierungsvalidierung
const registerValidation = [
  check('email', 'Bitte eine gültige E-Mail angeben').isEmail(),
  check('password', 'Passwort muss mindestens 6 Zeichen haben').isLength({ min: 6 })
];

// Login-Validierung
const loginValidation = [
  check('email', 'Bitte eine gültige E-Mail angeben').isEmail(),
  check('password', 'Passwort darf nicht leer sein').exists()
];

// Öffentliche Routen
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Route zum Erstellen eines Admin-Benutzers
// Diese Route sollte in der Produktion entfernt oder geschützt werden
router.post('/create-admin', registerValidation, authController.createAdmin);

// Geschützte Routen
router.get('/me', auth, authController.getMe);
router.get('/check', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;