// models/user.fixed.js - Enhanced user model with comprehensive validation and security
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const validator = require('validator');

// Custom validators
const validators = {
  // Enhanced email validation
  email: (value) => {
    return validator.isEmail(value);
  },
  
  // German phone number validation
  phone: (value) => {
    if (!value) return true; // Optional field
    const germanPhoneRegex = /^(\+49|0)[1-9][0-9]{1,14}$/;
    return germanPhoneRegex.test(value.replace(/[\s\-]/g, ''));
  },
  
  // Password strength validation
  password: (value) => {
    if (!value) return false;
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(value);
  }
};

// User schema definition
const userSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
    minlength: [2, 'Name muss mindestens 2 Zeichen lang sein'],
    maxlength: [50, 'Name darf maximal 50 Zeichen lang sein']
  },
  
  email: {
    type: String,
    required: [true, 'E-Mail ist erforderlich'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: validators.email,
      message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
    }
  },
  
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [8, 'Passwort muss mindestens 8 Zeichen lang sein'],
    select: false, // Don't return password by default
    validate: {
      validator: validators.password,
      message: 'Passwort muss mindestens 8 Zeichen, einen Groß- und Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten'
    }
  },
  
  // Role and permissions
  role: {
    type: String,
    enum: {
      values: ['admin', 'mitarbeiter', 'kunde', 'gast'],
      message: '{VALUE} ist keine gültige Rolle'
    },
    default: 'mitarbeiter'
  },
  
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: {
    type: String,
    select: false
  },
  
  verificationExpire: {
    type: Date,
    select: false
  },
  
  // Contact information
  telefon: {
    type: String,
    validate: {
      validator: validators.phone,
      message: 'Bitte geben Sie eine gültige deutsche Telefonnummer ein'
    }
  },
  
  profileImage: {
    type: String,
    default: null
  },
  
  position: {
    type: String,
    maxlength: [100, 'Position darf maximal 100 Zeichen lang sein']
  },
  
  // Address
  address: {
    street: String,
    houseNumber: String,
    postalCode: {
      type: String,
      validate: {
        validator: (v) => !v || /^[0-9]{5}$/.test(v),
        message: 'Ungültige deutsche Postleitzahl'
      }
    },
    city: String,
    country: {
      type: String,
      default: 'Deutschland'
    }
  },
  
  // Security
  lastLogin: {
    type: Date,
    index: true
  },
  
  lastLoginIP: String,
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  
  passwordChangedAt: Date,
  
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  
  // Two-factor authentication
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  // API access
  apiKey: {
    type: String,
    select: false,
    unique: true,
    sparse: true
  },
  
  apiKeyCreatedAt: Date,
  
  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['de', 'en'],
      default: 'de'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Metadata
  registeredFrom: {
    type: String,
    enum: ['web', 'mobile', 'api', 'admin'],
    default: 'web'
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.verificationToken;
      delete ret.verificationExpire;
      delete ret.twoFactorSecret;
      delete ret.apiKey;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'address.postalCode': 1 });
userSchema.index({ deletedAt: 1 });

// Virtual properties
userSchema.virtual('fullName').get(function() {
  return this.name;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Account lockout constants
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
const MAX_LOGIN_ATTEMPTS = 5;

// Pre-save hooks
userSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this.passwordChangedAt = Date.now() - 1000; // Ensure JWT issued after password change
    }
    
    // Generate API key if needed
    if (this.isNew && !this.apiKey && this.role === 'admin') {
      this.apiKey = crypto.randomBytes(32).toString('hex');
      this.apiKeyCreatedAt = Date.now();
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods = {
  // Compare password
  async comparePassword(candidatePassword) {
    if (!candidatePassword) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  },
  
  // Check if password changed after JWT issued
  passwordChangedAfter(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },
  
  // Generate password reset token
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    return resetToken;
  },
  
  // Generate email verification token
  createVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.verificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    
    this.verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    return verificationToken;
  },
  
  // Handle failed login attempts
  async handleFailedLogin() {
    this.loginAttempts += 1;
    
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
      this.lockUntil = Date.now() + LOCK_TIME;
    }
    
    await this.save();
  },
  
  // Reset login attempts on successful login
  async handleSuccessfulLogin(ip) {
    const updates = {
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: Date.now(),
      lastLoginIP: ip,
      lastActivity: Date.now()
    };
    
    Object.assign(this, updates);
    await this.save();
  },
  
  // Generate 2FA secret
  generate2FASecret() {
    const secret = crypto.randomBytes(20).toString('hex');
    this.twoFactorSecret = secret;
    return secret;
  },
  
  // Verify 2FA token
  verify2FAToken(token) {
    // Implement TOTP verification logic here
    // This is a placeholder
    return true;
  },
  
  // Update activity timestamp
  async updateActivity() {
    this.lastActivity = Date.now();
    await this.save();
  },
  
  // Soft delete user
  async softDelete(deletedBy) {
    this.deletedAt = Date.now();
    this.deletedBy = deletedBy;
    this.isActive = false;
    await this.save();
  },
  
  // Restore soft deleted user
  async restore() {
    this.deletedAt = null;
    this.deletedBy = null;
    this.isActive = true;
    await this.save();
  }
};

// Static methods
userSchema.statics = {
  // Find active users
  findActive() {
    return this.find({ isActive: true, deletedAt: null });
  },
  
  // Find by email including soft deleted
  findByEmailIncludeDeleted(email) {
    return this.findOne({ email });
  },
  
  // Find users by role
  findByRole(role) {
    return this.find({ role, isActive: true, deletedAt: null });
  },
  
  // Validate reset token
  findByResetToken(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    return this.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
  },
  
  // Validate verification token
  findByVerificationToken(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    return this.findOne({
      verificationToken: hashedToken,
      verificationExpire: { $gt: Date.now() }
    });
  },
  
  // Find by API key
  findByApiKey(apiKey) {
    return this.findOne({ apiKey, isActive: true });
  },
  
  // Cleanup expired tokens
  async cleanupExpiredTokens() {
    const now = Date.now();
    
    await this.updateMany(
      { resetPasswordExpire: { $lt: now } },
      { 
        $unset: { 
          resetPasswordToken: 1, 
          resetPasswordExpire: 1 
        } 
      }
    );
    
    await this.updateMany(
      { verificationExpire: { $lt: now } },
      { 
        $unset: { 
          verificationToken: 1, 
          verificationExpire: 1 
        } 
      }
    );
  },
  
  // Get user statistics
  async getStatistics() {
    const stats = await this.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          },
          byRole: {
            $push: {
              role: '$role',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          activeUsers: 1,
          verifiedUsers: 1,
          roleDistribution: {
            $reduce: {
              input: '$byRole',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  { [`$$this.role`]: { $add: [{ $ifNull: [`$$value.$$this.role`, 0] }, 1] } }
                ]
              }
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      roleDistribution: {}
    };
  }
};

// Plugins
userSchema.plugin(require('mongoose-unique-validator'), {
  message: '{PATH} ist bereits vergeben'
});

const User = mongoose.model('User', userSchema);

module.exports = User;