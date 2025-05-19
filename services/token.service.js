// services/token.service.js - Token Management Service
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Token = require('../models/token.model');
const jwtConfig = require('../config/jwt.config');

class TokenService {
  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(user, deviceInfo = {}) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      type: 'access'
    };

    // Generate access token
    const accessToken = jwt.sign(
      payload,
      jwtConfig.access.secret,
      {
        expiresIn: jwtConfig.access.expiresIn,
        algorithm: jwtConfig.access.algorithm,
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience
      }
    );

    // Generate refresh token
    const refreshPayload = {
      id: user._id,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex') // JWT ID for tracking
    };

    const refreshToken = jwt.sign(
      refreshPayload,
      jwtConfig.refresh.secret,
      {
        expiresIn: jwtConfig.refresh.expiresIn,
        algorithm: jwtConfig.refresh.algorithm,
        issuer: jwtConfig.refresh.issuer,
        audience: jwtConfig.refresh.audience
      }
    );

    // Store refresh token in database
    const decoded = jwt.decode(refreshToken);
    await Token.create({
      token: refreshToken,
      type: 'refresh',
      userId: user._id,
      expiresAt: new Date(decoded.exp * 1000),
      deviceInfo
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, jwtConfig.access.secret, {
        algorithms: [jwtConfig.access.algorithm],
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token) {
    try {
      // First verify JWT signature
      const decoded = jwt.verify(token, jwtConfig.refresh.secret, {
        algorithms: [jwtConfig.refresh.algorithm],
        issuer: jwtConfig.refresh.issuer,
        audience: jwtConfig.refresh.audience
      });

      // Then check if token exists in database and is valid
      const tokenDoc = await Token.isTokenValid(token, 'refresh');
      if (!tokenDoc) {
        throw new Error('Token not found or revoked');
      }

      return { decoded, tokenDoc };
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken, deviceInfo = {}) {
    const { decoded, tokenDoc } = await this.verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const payload = {
      id: decoded.id,
      type: 'access'
    };

    // Get user data for token payload
    const User = require('../models/user');
    const user = await User.findById(decoded.id).select('email role');
    
    if (!user) {
      throw new Error('User not found');
    }

    payload.email = user.email;
    payload.role = user.role;

    const newAccessToken = jwt.sign(
      payload,
      jwtConfig.access.secret,
      {
        expiresIn: jwtConfig.access.expiresIn,
        algorithm: jwtConfig.access.algorithm,
        issuer: jwtConfig.access.issuer,
        audience: jwtConfig.access.audience
      }
    );

    // Update last used time for refresh token
    tokenDoc.lastUsed = new Date();
    tokenDoc.deviceInfo = { ...tokenDoc.deviceInfo, ...deviceInfo };
    await tokenDoc.save();

    return newAccessToken;
  }

  /**
   * Revoke token (blacklist)
   */
  static async revokeToken(token, type = 'access', revokedBy = null, reason = '') {
    // For access tokens, add to blacklist
    if (type === 'access') {
      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      await Token.create({
        token,
        type: 'blacklist',
        userId: decoded.id,
        expiresAt: new Date(decoded.exp * 1000),
        revoked: true,
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason
      });
    } else {
      // For refresh tokens, mark as revoked
      const tokenDoc = await Token.findOne({ token, type: 'refresh' });
      if (tokenDoc) {
        await tokenDoc.revoke(revokedBy, reason);
      }
    }
  }

  /**
   * Check if access token is blacklisted
   */
  static async isBlacklisted(token) {
    const blacklisted = await Token.findOne({
      token,
      type: 'blacklist',
      revoked: true
    });
    return !!blacklisted;
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId, revokedBy = null) {
    await Token.revokeAllForUser(userId, revokedBy);
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId) {
    return await Token.find({
      userId,
      type: 'refresh',
      revoked: false,
      expiresAt: { $gt: new Date() }
    }).sort({ lastUsed: -1 });
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens() {
    return await Token.cleanupExpired();
  }
}

module.exports = TokenService;