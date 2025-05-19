// models/user.js - Korrigierte Version
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Verbesserte E-Mail-Validierung
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
  // Zusätzliche Profilinformationen
  profileImage: {
    type: String,
    default: ''
  },
  telefon: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: ''
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  } 
});

// Index für E-Mail-Suche erstellen
userSchema.index({ email: 1 });

// Passwort vor dem Speichern hashen
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

// Methode zum Vergleichen von Passwörtern
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Fehler beim Passwortvergleich:', error);
    return false;
  }
};

// Methode zum Generieren eines Reset-Passwort-Tokens
userSchema.methods.generateResetPasswordToken = function() {
  // Token generieren
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Token hashen und im Benutzer speichern
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token-Ablaufzeit festlegen (10 Minuten)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;