// routes/auth.routes.js - Updated with new validation system
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');
const { auth: authValidation } = require('../middleware/validators');

// Public routes with validation
router.post('/register', authValidation.register, authController.register);
router.post('/login', authValidation.login, authController.login);
router.post('/refresh', authController.refreshToken);

// Admin creation route (should be protected in production)
router.post('/create-admin', authValidation.createAdmin, authController.createAdmin);

// Protected routes
router.get('/me', auth, authController.getMe);
router.get('/check', auth, authController.checkAuth);

// New routes for password management (if controllers exist)
// router.post('/change-password', auth, authValidation.changePassword, authController.changePassword);
// router.post('/reset-password-request', authValidation.resetPasswordRequest, authController.resetPasswordRequest);
// router.post('/reset-password', authValidation.resetPassword, authController.resetPassword);
// router.put('/profile', auth, authValidation.updateProfile, authController.updateProfile);

module.exports = router;