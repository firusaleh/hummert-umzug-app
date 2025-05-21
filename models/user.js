// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // Fix: Add crypto import

// Improved email validation regex that better matches RFC 5322 standard
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Password strength regex (min 8 chars, at least one letter and one number)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;

// Common phone number formats for European numbers
const phoneRegex = /^(\+[0-9]{1,3})?[0-9 ()-]{5,15}$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'E-Mail ist erforderlich'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return emailRegex.test(v);
      },
      message: props => `${props.value} ist keine gültige E-Mail-Adresse!`
    },
    index: true
  },
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [8, 'Passwort muss mindestens 8 Zeichen lang sein'],
    select: false // Don't include password in query results by default
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'mitarbeiter'], 
      message: '{VALUE} ist keine gültige Rolle'
    },
    default: 'mitarbeiter',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLogin: {
    type: Date,
    index: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  },
  // Additional profile information
  profileImage: {
    type: String,
    default: ''
  },
  telefon: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        return !v || phoneRegex.test(v);
      },
      message: props => `${props.value} ist keine gültige Telefonnummer!`
    }
  },
  position: {
    type: String,
    default: ''
  },
  // Password reset fields
  resetPasswordToken: {
    type: String,
    index: true
  },
  resetPasswordExpire: {
    type: Date
  },
  // Security settings
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.twoFactorSecret;
      delete ret.failedLoginAttempts;
      delete ret.__v;
      return ret;
    }
  } 
});

// Create compound indexes for frequent query patterns
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ name: 'text' });

// Password hashing before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // If password field is already selected (as happens in login controller)
    // we can just use it; otherwise, we need to fetch it
    const password = this.password;
    
    if (!password) {
      console.error('Passwortfeld fehlt im Benutzerobjekt');
      return false;
    }
    
    return await bcrypt.compare(candidatePassword, password);
  } catch (error) {
    console.error('Fehler beim Passwortvergleich:', error);
    return false;
  }
};

// Method to generate a reset password token
userSchema.methods.generateResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and store in user document
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set token expiration (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Method to handle failed login attempts
userSchema.methods.recordLoginAttempt = async function(success) {
  if (success) {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastLogin = new Date();
  } else {
    this.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts for 15 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }
  
  return this.save();
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.lockedUntil) return false;
  return new Date() < this.lockedUntil;
};

// Static method to find active users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true })
    .sort({ name: 1 })
    .lean();
};

// Add TTL index for password reset tokens
// Will automatically expire tokens after their expiration
userSchema.index({ resetPasswordExpire: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
module.exports = User;