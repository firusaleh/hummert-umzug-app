// models/mitarbeiter.model.js
const mongoose = require('mongoose');

const arbeitszeitSchema = new mongoose.Schema({
  datum: {
    type: Date,
    required: true
  },
  startzeit: {
    type: Date,
    required: true
  },
  endzeit: {
    type: Date,
    required: true
  },
  pausen: [{
    start: Date,
    ende: Date
  }],
  notizen: String
});

const mitarbeiterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vorname: {
    type: String,
    required: true,
    trim: true
  },
  nachname: {
    type: String,
    required: true,
    trim: true
  },
  telefon: {
    type: String,
    trim: true
  },
  adresse: {
    strasse: String,
    hausnummer: String,
    plz: String,
    ort: String
  },
  position: {
    type: String,
    trim: true
  },
  einstellungsdatum: {
    type: Date
  },
  arbeitszeiten: [arbeitszeitSchema],
  faehigkeiten: [String],
  fuehrerscheinklassen: [String],
  notizen: String,
  dokumente: [{
    name: String,
    pfad: String,
    datum: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Mitarbeiter = mongoose.model('Mitarbeiter', mitarbeiterSchema);

module.exports = Mitarbeiter;