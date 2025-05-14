// models/projektkosten.model.js
const mongoose = require('mongoose');

const projektkostenSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true
  },
  umzug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug'
  },
  kategorie: {
    type: String,
    enum: ['Personal', 'Fahrzeuge', 'Material', 'Unterauftrag', 'Sonstiges'],
    required: true
  },
  betrag: {
    type: Number,
    required: true
  },
  datum: {
    type: Date,
    default: Date.now,
    required: true
  },
  beschreibung: {
    type: String
  },
  belege: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bezahlstatus: {
    type: String,
    enum: ['Offen', 'Bezahlt', 'Storniert'],
    default: 'Offen'
  },
  bezahltAm: {
    type: Date
  },
  zahlungsmethode: {
    type: String,
    enum: ['Überweisung', 'Bar', 'Kreditkarte', 'PayPal', 'Sonstige'],
    default: 'Überweisung'
  }
}, { timestamps: true });

const Projektkosten = mongoose.model('Projektkosten', projektkostenSchema);

module.exports = Projektkosten;
