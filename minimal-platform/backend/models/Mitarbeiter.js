const mongoose = require('mongoose');

const mitarbeiterSchema = new mongoose.Schema({
  vorname: {
    type: String,
    required: true
  },
  nachname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  telefon: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['aktiv', 'inaktiv'],
    default: 'aktiv'
  }
}, {
  timestamps: true
});

// Virtual for full name
mitarbeiterSchema.virtual('name').get(function() {
  return `${this.vorname} ${this.nachname}`;
});

module.exports = mongoose.model('Mitarbeiter', mitarbeiterSchema);