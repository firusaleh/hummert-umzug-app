// models/aufnahme.model.js
const mongoose = require('mongoose');

const adresseSchema = new mongoose.Schema({
  strasse: {
    type: String,
    required: true,
    trim: true
  },
  hausnummer: {
    type: String,
    required: true,
    trim: true
  },
  plz: {
    type: String,
    required: true,
    trim: true
  },
  ort: {
    type: String,
    required: true,
    trim: true
  },
  land: {
    type: String,
    default: 'Deutschland',
    trim: true
  },
  etage: {
    type: Number,
    default: 0
  },
  aufzug: {
    type: Boolean,
    default: false
  },
  entfernung: { // in Metern zur Parkposition
    type: Number,
    default: 0
  }
});

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
  kontaktperson: {
    type: String,
    trim: true
  },
  telefon: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  umzugstyp: {
    type: String,
    enum: ['privat', 'gewerbe', 'senioren', 'fernumzug', 'buero'],
    default: 'privat'
  },
  umzugsvolumen: {
    type: Number,
    default: 0
  },
  uhrzeit: {
    type: String,
    default: '09:00'
  },
  auszugsadresse: adresseSchema,
  einzugsadresse: adresseSchema,
  raeume: [raumSchema],
  gesamtvolumen: Number, // in m³
  aufnehmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  mitarbeiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mitarbeiter'
  },
  notizen: String,
  besonderheiten: String,
  bewertung: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  bilder: [String], // Pfade zu Bildern
  dokumente: [{
    name: String,
    pfad: String,
    datum: Date
  }],
  angebotspreis: {
    netto: Number,
    brutto: Number,
    mwst: {
      type: Number,
      default: 19
    }
  },
  status: {
    type: String,
    enum: ['in_bearbeitung', 'abgeschlossen', 'angebot_erstellt', 'bestellt'],
    default: 'in_bearbeitung'
  }
}, { timestamps: true });

const Aufnahme = mongoose.model('Aufnahme', aufnahmeSchema);

module.exports = Aufnahme;