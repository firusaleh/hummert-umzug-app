// routes/auth.secure.routes.js - Secure Authentication Routes
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.secure.controller');
const { body, validationResult } = require('express-validator');
const { authenticate, authLimiter, refreshTokenMiddleware } = require('../middleware/auth.secure');

// Validation rules
const registerValidation = [
  body('email')
    .isEmail().withMessage('Bitte eine gültige E-Mail-Adresse angeben')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Name muss mindestens 2 Zeichen lang sein')
    .matches(/^[a-zA-ZäöüßÄÖÜ\s'-]+$/).withMessage('Name enthält ungültige Zeichen'),
  body('role')
    .optional()
    .isIn(['admin', 'mitarbeiter']).withMessage('Ungültige Rolle')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Bitte eine gültige E-Mail-Adresse angeben')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Passwort darf nicht leer sein'),
  body('rememberMe')
    .optional()
    .isBoolean().withMessage('RememberMe muss ein Boolean sein')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Bitte eine gültige E-Mail-Adresse angeben')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('token')
    .notEmpty().withMessage('Token ist erforderlich'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten')
];

// Public routes with rate limiting
router.post('/register', authLimiter, registerValidation, AuthController.register);
router.post('/login', authLimiter, loginValidation, AuthController.login);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, AuthController.resetPassword);

// Token refresh route
router.post('/refresh-token', refreshTokenMiddleware, (req, res) => {
  res.json({
    success: true,
    accessToken: req.newAccessToken
  });
});

// Protected routes
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.get('/sessions', authenticate, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticate, AuthController.revokeSession);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is healthy',
    version: '2.0.0'
  });
});

module.exports = router;