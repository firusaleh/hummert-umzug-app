// controllers/auth.secure.controller.js - Secure Authentication Controller
const { User } = require('../models');
const TokenService = require('../services/token.service');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwtConfig = require('../config/jwt.config');

class AuthController {
  /**
   * User registration
   */
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password, name, role } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ 
          success: false,
          message: 'Benutzer mit dieser E-Mail existiert bereits' 
        });
      }

      // Create new user
      const user = new User({
        name: name || email.split('@')[0],
        email,
        password,
        role: role || 'mitarbeiter'
      });

      await user.save();

      // Generate token pair
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, {
        userAgent: req.get('user-agent'),
        ip: req.ip
      });

      // Set cookies
      res.cookie('refreshToken', refreshToken, jwtConfig.cookie);
      res.cookie('accessToken', accessToken, {
        ...jwtConfig.cookie,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');
      req.session = req.session || {};
      req.session.csrfToken = csrfToken;

      res.status(201).json({
        success: true,
        message: 'Benutzer erfolgreich registriert',
        accessToken,
        refreshToken,
        csrfToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Serverfehler bei der Registrierung', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * User login
   */
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password, rememberMe } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Ungültige Anmeldedaten' 
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Ungültige Anmeldedaten' 
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Dieses Konto wurde deaktiviert' 
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token pair
      const { accessToken, refreshToken } = await TokenService.generateTokenPair(user, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        rememberMe
      });

      // Set cookie options based on remember me
      const cookieOptions = {
        ...jwtConfig.cookie,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined // 30 days if remember me
      };

      // Set cookies
      res.cookie('refreshToken', refreshToken, cookieOptions);
      res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      // Generate CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');
      req.session = req.session || {};
      req.session.csrfToken = csrfToken;

      res.json({
        success: true,
        message: 'Login erfolgreich',
        accessToken,
        refreshToken,
        csrfToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Serverfehler beim Login', 
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Logout
   */
  static async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.token || req.cookies.accessToken;

      // Revoke tokens
      if (refreshToken) {
        await TokenService.revokeToken(refreshToken, 'refresh', req.user?.id, 'User logout');
      }
      if (accessToken) {
        await TokenService.revokeToken(accessToken, 'access', req.user?.id, 'User logout');
      }

      // Clear cookies
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');

      // Clear session
      if (req.session) {
        req.session.destroy();
      }

      res.json({
        success: true,
        message: 'Erfolgreich abgemeldet'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Abmelden',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req, res) {
    try {
      await TokenService.revokeAllUserTokens(req.user.id, req.user.id);

      // Clear current session cookies
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');

      res.json({
        success: true,
        message: 'Von allen Geräten abgemeldet'
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Abmelden von allen Geräten',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ 
          success: false, 
          message: 'Kein Refresh Token bereitgestellt' 
        });
      }

      const newAccessToken = await TokenService.refreshAccessToken(refreshToken, {
        userAgent: req.get('user-agent'),
        ip: req.ip
      });

      // Set new access token in cookie
      res.cookie('accessToken', newAccessToken, {
        ...jwtConfig.cookie,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.json({
        success: true,
        accessToken: newAccessToken
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ 
        success: false, 
        message: 'Token-Aktualisierung fehlgeschlagen',
        error: error.message 
      });
    }
  }

  /**
   * Get current user profile
   */
  static async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Benutzer nicht gefunden' 
        });
      }
      
      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Serverfehler beim Abrufen des Benutzerprofils' 
      });
    }
  }

  /**
   * Get active sessions
   */
  static async getSessions(req, res) {
    try {
      const sessions = await TokenService.getUserSessions(req.user.id);
      
      res.json({
        success: true,
        sessions: sessions.map(session => ({
          id: session._id,
          deviceInfo: session.deviceInfo,
          lastUsed: session.lastUsed,
          createdAt: session.createdAt
        }))
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Abrufen der aktiven Sitzungen' 
      });
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = await Token.findById(sessionId);
      if (!session || session.userId.toString() !== req.user.id.toString()) {
        return res.status(404).json({ 
          success: false, 
          message: 'Sitzung nicht gefunden' 
        });
      }

      await session.revoke(req.user.id, 'User revoked session');

      res.json({
        success: true,
        message: 'Sitzung erfolgreich beendet'
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Beenden der Sitzung' 
      });
    }
  }

  /**
   * Generate password reset token
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpire = Date.now() + jwtConfig.security.passwordResetTokenExpiry;
      await user.save();

      // TODO: Send email with reset link
      // For now, return token in development
      res.json({
        success: true,
        message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet.',
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Zurücksetzen des Passworts' 
      });
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ungültiger oder abgelaufener Token' 
        });
      }

      // Set new password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      // Revoke all existing tokens
      await TokenService.revokeAllUserTokens(user._id, user._id, 'Password reset');

      res.json({
        success: true,
        message: 'Passwort erfolgreich zurückgesetzt'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Fehler beim Zurücksetzen des Passworts' 
      });
    }
  }
}

module.exports = AuthController;