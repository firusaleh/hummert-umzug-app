// controllers/auth.controller.fixed.js - Fixed auth controller with proper error handling
const BaseController = require('./base.controller.enhanced');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class AuthController extends BaseController {
  /**
   * User registration
   */
  static register = this.asyncHandler(async (req, res) => {
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { email, password, name, role = 'mitarbeiter' } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return this.error(res, 'E-Mail-Adresse bereits registriert', 400);
    }
    
    // Create user with transaction
    const user = await this.withTransaction(async (session) => {
      const newUser = await User.create([{
        email,
        password, // Will be hashed by model middleware
        name: name || email.split('@')[0],
        role,
        isActive: true
      }], { session });
      
      // Create initial notification
      await this.sendNotification(newUser[0]._id, 'info', {
        titel: 'Willkommen bei LagerLogix',
        inhalt: 'Ihr Account wurde erfolgreich erstellt.'
      });
      
      return newUser[0];
    });
    
    // Generate token
    const token = this.generateToken(user);
    
    // Return user data without password
    const userData = user.toObject();
    delete userData.password;
    
    return this.success(res, {
      user: userData,
      token
    }, 'Registrierung erfolgreich', 201);
  });

  /**
   * User login
   */
  static login = this.asyncHandler(async (req, res) => {
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { email, password } = req.body;
    
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return this.error(res, 'Ungültige Anmeldedaten', 401);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return this.error(res, 'Account ist deaktiviert', 403);
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return this.error(res, 'Ungültige Anmeldedaten', 401);
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = this.generateToken(user);
    
    // Return user data without password
    const userData = user.toObject();
    delete userData.password;
    
    return this.success(res, {
      user: userData,
      token
    }, 'Anmeldung erfolgreich');
  });

  /**
   * Get current user profile
   */
  static getProfile = this.asyncHandler(async (req, res) => {
    // Authorization check
    const authError = this.authorize(req, res);
    if (authError) return authError;
    
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return this.error(res, 'Benutzer nicht gefunden', 404);
    }
    
    return this.success(res, { user });
  });

  /**
   * Update user profile
   */
  static updateProfile = this.asyncHandler(async (req, res) => {
    // Authorization check
    const authError = this.authorize(req, res);
    if (authError) return authError;
    
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { name, email } = req.body;
    const updates = {};
    
    // Only update provided fields
    if (name) updates.name = this.sanitizeInput(name);
    if (email) updates.email = email;
    
    // Check if new email is already taken
    if (email && email !== req.user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (emailExists) {
        return this.error(res, 'E-Mail-Adresse bereits vergeben', 400);
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    return this.success(res, { user: updatedUser }, 'Profil aktualisiert');
  });

  /**
   * Change password
   */
  static changePassword = this.asyncHandler(async (req, res) => {
    // Authorization check
    const authError = this.authorize(req, res);
    if (authError) return authError;
    
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return this.error(res, 'Aktuelles Passwort ist falsch', 400);
    }
    
    // Update password
    user.password = newPassword; // Will be hashed by model middleware
    await user.save();
    
    // Send notification
    await this.sendNotification(user._id, 'info', {
      titel: 'Passwort geändert',
      inhalt: 'Ihr Passwort wurde erfolgreich geändert.'
    });
    
    return this.success(res, null, 'Passwort erfolgreich geändert');
  });

  /**
   * Logout (invalidate token - requires token blacklist implementation)
   */
  static logout = this.asyncHandler(async (req, res) => {
    // Authorization check
    const authError = this.authorize(req, res);
    if (authError) return authError;
    
    // In a production app, you would blacklist the token here
    // await TokenBlacklist.create({ token: req.token, userId: req.user._id });
    
    return this.success(res, null, 'Erfolgreich abgemeldet');
  });

  /**
   * Request password reset
   */
  static requestPasswordReset = this.asyncHandler(async (req, res) => {
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return this.success(res, null, 'Wenn die E-Mail-Adresse existiert, wurde ein Link gesendet');
    }
    
    // Generate reset token
    const resetToken = this.generateResetToken();
    
    // Save reset token and expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // Send email (implement email service)
    // await emailService.sendPasswordResetEmail(user.email, resetToken);
    
    return this.success(res, null, 'Wenn die E-Mail-Adresse existiert, wurde ein Link gesendet');
  });

  /**
   * Reset password with token
   */
  static resetPassword = this.asyncHandler(async (req, res) => {
    // Handle validation errors
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;
    
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return this.error(res, 'Ungültiger oder abgelaufener Token', 400);
    }
    
    // Reset password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    // Send confirmation
    await this.sendNotification(user._id, 'info', {
      titel: 'Passwort zurückgesetzt',
      inhalt: 'Ihr Passwort wurde erfolgreich zurückgesetzt.'
    });
    
    return this.success(res, null, 'Passwort erfolgreich zurückgesetzt');
  });

  /**
   * Check authentication status
   */
  static checkAuth = this.asyncHandler(async (req, res) => {
    // Authorization check
    const authError = this.authorize(req, res);
    if (authError) return authError;
    
    const user = await User.findById(req.user._id).select('-password');
    
    return this.success(res, { 
      authenticated: true,
      user 
    });
  });

  /**
   * Helper: Generate JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRE || '7d';
    
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Helper: Generate password reset token
   */
  static generateResetToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = AuthController;