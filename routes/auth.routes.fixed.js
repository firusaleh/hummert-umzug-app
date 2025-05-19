// routes/auth.routes.fixed.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth, admin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const rateLimiter = require('../middleware/rateLimit');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules
const authValidation = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name ist erforderlich')
      .isLength({ min: 2, max: 100 }).withMessage('Name muss zwischen 2 und 100 Zeichen lang sein'),
    body('email')
      .trim()
      .notEmpty().withMessage('E-Mail ist erforderlich')
      .isEmail().withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Passwort ist erforderlich')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Passwort muss mindestens einen Klein- und Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten'),
    body('role')
      .optional()
      .isIn(['admin', 'mitarbeiter', 'helfer']).withMessage('Ungültige Rolle')
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('E-Mail ist erforderlich')
      .isEmail().withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Passwort ist erforderlich')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Aktuelles Passwort ist erforderlich'),
    body('newPassword')
      .notEmpty().withMessage('Neues Passwort ist erforderlich')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Passwort muss mindestens einen Klein- und Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('Neues Passwort darf nicht mit dem aktuellen Passwort identisch sein')
  ],
  
  resetPasswordRequest: [
    body('email')
      .trim()
      .notEmpty().withMessage('E-Mail ist erforderlich')
      .isEmail().withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      .normalizeEmail()
  ],
  
  resetPassword: [
    body('token')
      .notEmpty().withMessage('Reset-Token ist erforderlich'),
    body('password')
      .notEmpty().withMessage('Neues Passwort ist erforderlich')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Passwort muss mindestens einen Klein- und Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten')
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name muss zwischen 2 und 100 Zeichen lang sein'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/).withMessage('Bitte geben Sie eine gültige deutsche Telefonnummer ein')
  ]
};

// Public routes with rate limiting
router.post('/register', 
  rateLimiter.createAccountLimiter,
  authValidation.register, 
  validate,
  asyncHandler(authController.register)
);

router.post('/login', 
  rateLimiter.loginLimiter,
  authValidation.login, 
  validate,
  asyncHandler(authController.login)
);

router.post('/logout',
  auth,
  asyncHandler(authController.logout)
);

// Password management routes
router.post('/forgot-password',
  rateLimiter.passwordResetLimiter,
  authValidation.resetPasswordRequest,
  validate,
  asyncHandler(authController.forgotPassword)
);

router.post('/reset-password',
  rateLimiter.passwordResetLimiter,
  authValidation.resetPassword,
  validate,
  asyncHandler(authController.resetPassword)
);

// Protected routes
router.get('/me', 
  auth, 
  asyncHandler(authController.getMe)
);

router.put('/me',
  auth,
  authValidation.updateProfile,
  validate,
  asyncHandler(authController.updateProfile)
);

router.post('/change-password',
  auth,
  authValidation.changePassword,
  validate,
  asyncHandler(authController.changePassword)
);

// Admin only routes
router.post('/create-admin',
  auth,
  admin,
  authValidation.register,
  validate,
  asyncHandler(authController.createAdmin)
);

// Token refresh
router.post('/refresh-token',
  asyncHandler(authController.refreshToken)
);

// 2FA routes (if implemented)
router.post('/2fa/enable',
  auth,
  asyncHandler(authController.enable2FA)
);

router.post('/2fa/verify',
  auth,
  body('code').notEmpty().isLength({ min: 6, max: 6 }),
  validate,
  asyncHandler(authController.verify2FA)
);

router.post('/2fa/disable',
  auth,
  body('password').notEmpty(),
  validate,
  asyncHandler(authController.disable2FA)
);

// Session management
router.get('/sessions',
  auth,
  asyncHandler(authController.getSessions)
);

router.delete('/sessions/:sessionId',
  auth,
  asyncHandler(authController.terminateSession)
);

module.exports = router;