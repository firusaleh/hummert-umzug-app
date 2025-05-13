// models/zeiterfassung.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const zeiterfassungSchema = new Schema({
  mitarbeiterId: {
    type: Schema.Types.ObjectId,
    ref: 'Mitarbeiter',
    required: true
  },
  projektId: {
    type: Schema.Types.ObjectId,
    ref: 'Umzug',
    required: true
  },
  datum: {
    type: Date,
    required: true
  },
  startzeit: {
    type: String,
    required: true
  },
  endzeit: {
    type: String,
    required: true
  },
  pause: {
    type: Number,
    default: 30
  },
  arbeitsstunden: {
    type: Number,
    required: true
  },
  taetigkeit: {
    type: String,
    required: true
  },
  notizen: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Vor dem Speichern updatedAt aktualisieren
zeiterfassungSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Vor dem Update updatedAt aktualisieren
zeiterfassungSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Zeiterfassung', zeiterfassungSchema);