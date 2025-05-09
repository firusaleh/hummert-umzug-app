// models/aufnahme.model.js
const mongoose = require('mongoose');

const moebelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  anzahl: {
    type: Number,
    required: true,
    default: 1
  },
  kategorie: {
    type: String,
    enum: ['schrank', 'tisch', 'stuhl', 'sofa', 'bett', 'karton', 'sonstiges'],
    default: 'sonstiges'
  },
  groesse: {
    laenge: Number, // in cm
    breite: Number, // in cm
    hoehe: Number, // in cm
    volumen: Number // in m³
  },
  gewicht: Number, // in kg
  zerbrechlich: {
    type: Boolean,
    default: false
  },
  besonderheiten: String,
  demontage: {
    type: Boolean,
    default: false
  },
  montage: {
    type: Boolean,
    default: false
  },
  verpackung: {
    type: Boolean,
    default: false
  },
  bilder: [String] // Pfade zu Bildern
});

const raumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  flaeche: Number, // in m²
  etage: Number,
  besonderheiten: String,
  moebel: [moebelSchema]
});

const aufnahmeSchema = new mongoose.Schema({
  datum: {
    type: Date,
    required: true,
    default: Date.now
  },
  kundenName: {
    type: String,
    required: true,
    trim: true
  },
  auszugsadresse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug.auszugsadresse'
  },
  einzugsadresse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug.einzugsadresse'
  },
  raeume: [raumSchema],
  gesamtvolumen: Number, // in m³
  aufnehmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notizen: String,
  bilder: [String], // Pfade zu Bildern
  dokumente: [{
    name: String,
    pfad: String,
    datum: Date
  }],
  angebotspreis: {
    netto: Number,
    brutto: Number
  },
  status: {
    type: String,
    enum: ['in_bearbeitung', 'abgeschlossen', 'angebot_erstellt', 'bestellt'],
    default: 'in_bearbeitung'
  }
}, { timestamps: true });

const Aufnahme = mongoose.model('Aufnahme', aufnahmeSchema);

module.exports = Aufnahme;