// models/user.indexed.js - User model with indexes
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true
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
    }
  },
  password: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein']
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'mitarbeiter'], 
      message: '{VALUE} ist keine gültige Rolle'
    },
    default: 'mitarbeiter'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  collation: { locale: 'de', strength: 2 } // German collation for text searches
});

// Define indexes
userSchema.index({ email: 1 }, { unique: true }); // Primary lookup
userSchema.index({ role: 1, isActive: 1 }); // Role-based queries
userSchema.index({ lastLogin: -1 }); // Activity sorting
userSchema.index({ name: 'text', email: 'text' }, { // Full-text search
  weights: { name: 2, email: 1 },
  default_language: 'german'
});

// Password hashing middleware
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

// Update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Static method to find active users by role
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method for text search
userSchema.statics.search = function(searchTerm) {
  return this.find({ $text: { $search: searchTerm } })
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Don't return password in JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;