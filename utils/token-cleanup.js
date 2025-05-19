// utils/token-cleanup.js - Token Cleanup Utility
const TokenService = require('../services/token.service');
const jwtConfig = require('../config/jwt.config');

class TokenCleanup {
  static intervalId = null;

  /**
   * Start the token cleanup process
   */
  static start() {
    if (this.intervalId) {
      console.log('Token cleanup already running');
      return;
    }

    // Run cleanup immediately on start
    this.runCleanup();

    // Schedule periodic cleanup
    this.intervalId = setInterval(
      () => this.runCleanup(),
      jwtConfig.security.tokenCleanupIntervalMs
    );

    console.log('Token cleanup service started');
  }

  /**
   * Stop the token cleanup process
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Token cleanup service stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  static async runCleanup() {
    try {
      const result = await TokenService.cleanupExpiredTokens();
      console.log(`Token cleanup completed. Removed ${result.deletedCount} expired tokens`);
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }
}

module.exports = TokenCleanup;