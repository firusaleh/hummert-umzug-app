// models/benachrichtigung.model.js
const mongoose = require('mongoose');

const benachrichtigungSchema = new mongoose.Schema({
  empfaenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Indiziert für schnellere Abfragen
  },
  titel: {
    type: String,
    required: true,
    trim: true
  },
  inhalt: {
    type: String,
    required: true
  },
  typ: {
    type: String,
    enum: ['info', 'warnung', 'erinnerung', 'erfolg'],
    default: 'info',
    index: true // Indiziert für Filterabfragen
  },
  gelesen: {
    type: Boolean,
    default: false,
    index: true // Indiziert für Filterabfragen
  },
  gelesenAm: {
    type: Date,
    default: null
  },
  linkUrl: String,
  bezug: {
    typ: {
      type: String,
      enum: ['umzug', 'aufnahme', 'mitarbeiter', 'task', 'system'],
      default: 'system'
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'bezug.typ'
    }
  },
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true, 
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id; // Füge id als Alternative zu _id hinzu
      delete ret.__v; // Verstecke Versionierungsfeld
      return ret;
    }
  }
});

// Virtuelle Eigenschaft für das Alter der Benachrichtigung
benachrichtigungSchema.virtual('alter').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24)); // Alter in Tagen
});

// Methode zum Markieren als gelesen
benachrichtigungSchema.methods.markiereAlsGelesen = async function() {
  this.gelesen = true;
  this.gelesenAm = new Date();
  return this.save();
};

// Statische Methode zum Finden ungelesener Benachrichtigungen eines Benutzers
benachrichtigungSchema.statics.findeUngelesene = function(benutzerId) {
  return this.find({ empfaenger: benutzerId, gelesen: false })
    .sort({ createdAt: -1 });
};

// Statische Methode zum Löschen alter Benachrichtigungen
benachrichtigungSchema.statics.loescheAlte = function(tage = 30) {
  const datumGrenze = new Date();
  datumGrenze.setDate(datumGrenze.getDate() - tage);
  return this.deleteMany({ 
    createdAt: { $lt: datumGrenze },
    gelesen: true
  });
};

// Hook: Vor dem Speichern
benachrichtigungSchema.pre('save', function(next) {
  // Wenn Benachrichtigung als gelesen markiert wird, setze das Datum
  if (this.isModified('gelesen') && this.gelesen && !this.gelesenAm) {
    this.gelesenAm = new Date();
  }
  next();
});

// Erstelle optimierte Textindizes für Volltextsuche
benachrichtigungSchema.index({ titel: 'text', inhalt: 'text' });

// Zusammengesetzter Index für häufige Abfragen
benachrichtigungSchema.index({ empfaenger: 1, gelesen: 1, createdAt: -1 });

const Benachrichtigung = mongoose.model('Benachrichtigung', benachrichtigungSchema);

module.exports = Benachrichtigung;