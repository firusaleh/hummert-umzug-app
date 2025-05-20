// models/token.model.js - Token Blacklist and Refresh Token Model
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['refresh', 'blacklist'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceId: String
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  revoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedReason: String
}, {
  timestamps: true
});

// Create compound index for efficient queries
tokenSchema.index({ userId: 1, type: 1, revoked: 1 });
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to clean up expired tokens
tokenSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  return await this.deleteMany({ expiresAt: { $lt: now } });
};

// Instance method to revoke token
tokenSchema.methods.revoke = async function(revokedBy, reason = 'Manual revocation') {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  return await this.save();
};

// Static method to check if token is valid
tokenSchema.statics.isTokenValid = async function(token, type) {
  const tokenDoc = await this.findOne({ 
    token, 
    type,
    revoked: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (tokenDoc) {
    tokenDoc.lastUsed = new Date();
    await tokenDoc.save();
    return tokenDoc;
  }
  
  return null;
};

// Static method to revoke all tokens for a user
tokenSchema.statics.revokeAllForUser = async function(userId, revokedBy, reason = 'Logout all devices') {
  return await this.updateMany(
    { userId, revoked: false },
    { 
      revoked: true, 
      revokedAt: new Date(),
      revokedBy,
      revokedReason: reason
    }
  );
};

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;