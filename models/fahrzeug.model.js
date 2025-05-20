// models/fahrzeug.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FahrzeugSchema = new Schema({
  kennzeichen: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  bezeichnung: {
    type: String,
    required: true,
    trim: true
  },
  typ: {
    type: String,
    required: true,
    enum: ['LKW', 'Transporter', 'PKW', 'Anhänger', 'Sonstige'],
    default: 'Transporter'
  },
  kapazitaet: {
    ladeflaeche: {
      laenge: { type: Number }, // in cm
      breite: { type: Number },  // in cm
      hoehe: { type: Number }    // in cm
    },
    ladegewicht: { type: Number } // in kg
  },
  baujahr: {
    type: Number
  },
  anschaffungsdatum: {
    type: Date
  },
  tuev: {
    type: Date
  },
  fuehrerscheinklasse: {
    type: String,
    enum: ['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'],
    default: 'B'
  },
  status: {
    type: String,
    enum: ['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'],
    default: 'Verfügbar'
  },
  aktuelleFahrt: {
    type: Schema.Types.ObjectId,
    ref: 'Umzug'
  },
  bild: {
    type: String
  },
  kilometerstand: {
    type: Number,
    default: 0
  },
  naechsterService: {
    type: Date
  },
  versicherung: {
    gesellschaft: { type: String },
    vertragsnummer: { type: String },
    ablaufdatum: { type: Date }
  },
  notizen: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual für Volumen der Ladefläche
FahrzeugSchema.virtual('kapazitaet.volumen').get(function() {
  if (this.kapazitaet && this.kapazitaet.ladeflaeche) {
    const { laenge, breite, hoehe } = this.kapazitaet.ladeflaeche;
    if (laenge && breite && hoehe) {
      return (laenge * breite * hoehe) / 1000000; // Umrechnung in Kubikmeter
    }
  }
  return null;
});

// Virtual für den vollen Namen des Fahrzeugs
FahrzeugSchema.virtual('vollname').get(function() {
  return `${this.bezeichnung} (${this.kennzeichen})`;
});

// Virtual für das Alter des Fahrzeugs
FahrzeugSchema.virtual('alter').get(function() {
  if (this.baujahr) {
    const aktuell = new Date().getFullYear();
    return aktuell - this.baujahr;
  }
  return null;
});

// Virtual für TÜV-Status
FahrzeugSchema.virtual('tuevStatus').get(function() {
  if (!this.tuev) return 'Unbekannt';
  
  const heute = new Date();
  const tuevDatum = new Date(this.tuev);
  
  const differenzInTagen = Math.ceil((tuevDatum - heute) / (1000 * 60 * 60 * 24));
  
  if (differenzInTagen < 0) return 'Abgelaufen';
  if (differenzInTagen <= 30) return 'Bald fällig';
  return 'Gültig';
});

const Fahrzeug = mongoose.model('Fahrzeug', FahrzeugSchema);

module.exports = Fahrzeug;