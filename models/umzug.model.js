// models/umzug.model.js
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

const kontaktSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  telefon: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isKunde: {
    type: Boolean,
    default: true
  }
});

const umzugSchema = new mongoose.Schema({
  kundennummer: {
    type: String,
    trim: true
  },
  auftraggeber: kontaktSchema,
  kontakte: [kontaktSchema],
  auszugsadresse: adresseSchema,
  einzugsadresse: adresseSchema,
  zwischenstopps: [adresseSchema],
  startDatum: {
    type: Date,
    required: true
  },
  endDatum: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
    default: 'geplant'
  },
  preis: {
    netto: Number,
    brutto: Number,
    mwst: {
      type: Number,
      default: 19
    },
    bezahlt: {
      type: Boolean,
      default: false
    },
    zahlungsart: {
      type: String,
      enum: ['bar', 'überweisung', 'ec', 'kreditkarte', 'paypal', 'rechnung'],
      default: 'rechnung'
    }
  },
  aufnahmeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aufnahme'
  },
  fahrzeuge: [{
    typ: String,
    kennzeichen: String
  }],
  mitarbeiter: [{
    mitarbeiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mitarbeiter'
    },
    rolle: {
      type: String,
      enum: ['fahrer', 'helfer', 'projektleiter'],
      default: 'helfer'
    }
  }],
  notizen: [{ 
    text: String,
    ersteller: String,
    datum: {
      type: Date,
      default: Date.now
    }
  }],
  dokumente: [{
    name: String,
    pfad: String,
    kategorie: String,
    datum: {
      type: Date,
      default: Date.now
    }
  }],
  tasks: [{
    beschreibung: String,
    erledigt: {
      type: Boolean,
      default: false
    },
    faelligkeit: Date,
    prioritaet: {
      type: String,
      enum: ['niedrig', 'mittel', 'hoch'],
      default: 'mittel'
    },
    zugewiesen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  extraLeistungen: [{
    beschreibung: String,
    preis: Number,
    menge: {
      type: Number,
      default: 1
    }
  }]
}, { timestamps: true });

// Pre-save middleware to validate dates
umzugSchema.pre('save', function(next) {
  if (this.startDatum && this.endDatum && this.startDatum > this.endDatum) {
    return next(new Error('Startdatum muss vor Enddatum liegen'));
  }
  
  // Ensure dates are valid Date objects
  if (this.startDatum && !(this.startDatum instanceof Date)) {
    this.startDatum = new Date(this.startDatum);
  }
  if (this.endDatum && !(this.endDatum instanceof Date)) {
    this.endDatum = new Date(this.endDatum);
  }
  
  next();
});

// Virtual for display-friendly address
umzugSchema.virtual('auszugsadresseFormatted').get(function() {
  const addr = this.auszugsadresse;
  return addr ? `${addr.strasse} ${addr.hausnummer}, ${addr.plz} ${addr.ort}` : '';
});

umzugSchema.virtual('einzugsadresseFormatted').get(function() {
  const addr = this.einzugsadresse;
  return addr ? `${addr.strasse} ${addr.hausnummer}, ${addr.plz} ${addr.ort}` : '';
});

const Umzug = mongoose.model('Umzug', umzugSchema);

module.exports = Umzug;