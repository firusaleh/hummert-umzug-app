// models/umzug.indexed.js - Umzug model with comprehensive indexes
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
  entfernung: {
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
  firma: {
    type: String,
    trim: true
  }
});

const umzugSchema = new mongoose.Schema({
  referenzNummer: {
    type: String,
    sparse: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Anfrage', 'Bestätigt', 'In Bearbeitung', 'Abgeschlossen', 'Storniert'],
    default: 'Anfrage',
    required: true
  },
  termin: {
    type: Date,
    required: true
  },
  kunde: kontaktSchema,
  vonAdresse: adresseSchema,
  nachAdresse: adresseSchema,
  umzugsdetails: {
    raeume: Number,
    flaeche: Number,
    personen: Number,
    kartons: Number,
    mobiliar: [String],
    sonderleistungen: [String]
  },
  personal: [{
    mitarbeiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mitarbeiter'
    },
    rolle: String,
    stunden: Number
  }],
  fahrzeuge: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fahrzeug'
  }],
  kosten: {
    arbeitskosten: Number,
    fahrtkosten: Number,
    materialkosten: Number,
    zusatzkosten: Number,
    gesamtNetto: Number,
    mwst: Number,
    gesamtBrutto: Number
  },
  bezahlung: {
    status: {
      type: String,
      enum: ['Offen', 'Teilweise bezahlt', 'Bezahlt'],
      default: 'Offen'
    },
    bezahltAm: Date,
    zahlungsart: String,
    rechnungNummer: String
  },
  dokumente: [{
    typ: String,
    pfad: String,
    datum: Date
  }],
  internaleBemerkungen: String,
  kundenbemerkungen: String
}, { 
  timestamps: true,
  collation: { locale: 'de', strength: 2 }
});

// Define indexes
umzugSchema.index({ status: 1, termin: -1 }); // Status filtering with date sorting
umzugSchema.index({ termin: 1 }); // Date-based queries
umzugSchema.index({ 'kunde.email': 1, status: 1 }); // Customer lookup
umzugSchema.index({ 'vonAdresse.plz': 1, 'nachAdresse.plz': 1 }); // Location searches
umzugSchema.index({ 'bezahlung.status': 1, 'bezahlung.bezahltAm': -1 }); // Payment tracking
umzugSchema.index({ referenzNummer: 1 }, { unique: true, sparse: true }); // Reference lookup
umzugSchema.index({ 
  'kunde.name': 'text', 
  'kunde.firma': 'text',
  'internaleBemerkungen': 'text' 
}, {
  weights: { 
    'kunde.name': 3,
    'kunde.firma': 2,
    'internaleBemerkungen': 1
  },
  default_language: 'german'
}); // Full-text search

// Pre-save middleware
umzugSchema.pre('save', function(next) {
  // Generate reference number if not exists
  if (!this.referenzNummer && this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.referenzNummer = `UMZ-${year}${month}-${random}`;
  }
  
  // Calculate total costs
  if (this.kosten) {
    const netto = (this.kosten.arbeitskosten || 0) + 
                  (this.kosten.fahrtkosten || 0) + 
                  (this.kosten.materialkosten || 0) + 
                  (this.kosten.zusatzkosten || 0);
    
    this.kosten.gesamtNetto = netto;
    this.kosten.mwst = netto * 0.19;
    this.kosten.gesamtBrutto = netto * 1.19;
  }
  
  next();
});

// Static methods
umzugSchema.statics.findByStatus = function(status, options = {}) {
  const query = this.find({ status });
  
  if (options.dateRange) {
    query.where('termin').gte(options.dateRange.start).lte(options.dateRange.end);
  }
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ termin: -1 });
  }
  
  return query;
};

umzugSchema.statics.findUpcoming = function(days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    termin: { $gte: startDate, $lte: endDate },
    status: { $in: ['Bestätigt', 'In Bearbeitung'] }
  }).sort({ termin: 1 });
};

umzugSchema.statics.findOverduePayments = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({
    'bezahlung.status': { $in: ['Offen', 'Teilweise bezahlt'] },
    termin: { $lt: thirtyDaysAgo }
  }).sort({ termin: 1 });
};

umzugSchema.statics.search = function(searchTerm) {
  return this.find({ $text: { $search: searchTerm } })
    .select({ score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Instance methods
umzugSchema.methods.calculatePersonalCosts = function() {
  let totalHours = 0;
  let totalCost = 0;
  
  this.personal.forEach(assignment => {
    totalHours += assignment.stunden || 0;
    // Assume 25€ per hour (should come from Mitarbeiter model)
    totalCost += (assignment.stunden || 0) * 25;
  });
  
  return { totalHours, totalCost };
};

umzugSchema.methods.isOverdue = function() {
  if (this.bezahlung.status === 'Bezahlt') return false;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.termin < thirtyDaysAgo;
};

// Virtual properties
umzugSchema.virtual('distanz').get(function() {
  // This would calculate actual distance using coordinates
  // For now, return a placeholder
  return 0;
});

umzugSchema.virtual('personalCount').get(function() {
  return this.personal.length;
});

const Umzug = mongoose.model('Umzug', umzugSchema);

module.exports = Umzug;