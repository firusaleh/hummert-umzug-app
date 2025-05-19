// models/umzug.fixed.js - Enhanced move model with comprehensive validation
const mongoose = require('mongoose');
const validator = require('validator');

// Custom validators
const validators = {
  plz: (value) => {
    return /^[0-9]{5}$/.test(value);
  },
  
  telefon: (value) => {
    const cleanPhone = value.replace(/[\s\-]/g, '');
    return /^(\+49|0)[1-9][0-9]{1,14}$/.test(cleanPhone);
  },
  
  email: (value) => {
    return !value || validator.isEmail(value);
  },
  
  futureDate: (value) => {
    return value >= new Date();
  },
  
  dateRange: function(endDate) {
    return endDate >= this.startDatum;
  }
};

// Address sub-schema
const adresseSchema = new mongoose.Schema({
  strasse: {
    type: String,
    required: [true, 'Straße ist erforderlich'],
    trim: true,
    maxlength: [100, 'Straße darf maximal 100 Zeichen lang sein']
  },
  
  hausnummer: {
    type: String,
    required: [true, 'Hausnummer ist erforderlich'],
    trim: true,
    maxlength: [10, 'Hausnummer darf maximal 10 Zeichen lang sein']
  },
  
  plz: {
    type: String,
    required: [true, 'Postleitzahl ist erforderlich'],
    trim: true,
    validate: {
      validator: validators.plz,
      message: 'Ungültige deutsche Postleitzahl'
    }
  },
  
  ort: {
    type: String,
    required: [true, 'Ort ist erforderlich'],
    trim: true,
    maxlength: [100, 'Ort darf maximal 100 Zeichen lang sein']
  },
  
  land: {
    type: String,
    default: 'Deutschland',
    trim: true,
    maxlength: [50, 'Land darf maximal 50 Zeichen lang sein']
  },
  
  etage: {
    type: Number,
    min: [-2, 'Ungültige Etage'],
    max: [30, 'Ungültige Etage'],
    default: 0
  },
  
  aufzug: {
    type: Boolean,
    default: false
  },
  
  entfernung: {
    type: Number,
    min: [0, 'Entfernung kann nicht negativ sein'],
    max: [5000, 'Entfernung zu groß'],
    default: 0,
    description: 'Entfernung zum Parkplatz in Metern'
  },
  
  zusatzInfo: {
    type: String,
    maxlength: [500, 'Zusatzinformationen dürfen maximal 500 Zeichen lang sein']
  }
}, { _id: false });

// Contact sub-schema
const kontaktSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
    maxlength: [100, 'Name darf maximal 100 Zeichen lang sein']
  },
  
  telefon: {
    type: String,
    required: [true, 'Telefonnummer ist erforderlich'],
    trim: true,
    validate: {
      validator: validators.telefon,
      message: 'Ungültige Telefonnummer'
    }
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: validators.email,
      message: 'Ungültige E-Mail-Adresse'
    }
  },
  
  isKunde: {
    type: Boolean,
    default: true
  },
  
  rolle: {
    type: String,
    enum: ['hauptkontakt', 'nebenkontakt', 'notfallkontakt'],
    default: 'hauptkontakt'
  }
}, { _id: false });

// Vehicle sub-schema
const fahrzeugSchema = new mongoose.Schema({
  typ: {
    type: String,
    required: [true, 'Fahrzeugtyp ist erforderlich'],
    enum: ['3.5t', '7.5t', '12t', '18t', '40t', 'sprinter', 'pkw'],
    default: '3.5t'
  },
  
  kennzeichen: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{1,3}-[A-Z]{1,2}\s?\d{1,4}$/, 'Ungültiges deutsches Kennzeichen']
  },
  
  fahrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mitarbeiter'
  },
  
  kilometerstand: {
    type: Number,
    min: [0, 'Ungültiger Kilometerstand']
  }
}, { _id: false });

// Employee assignment sub-schema
const mitarbeiterZuordnungSchema = new mongoose.Schema({
  mitarbeiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mitarbeiter',
    required: [true, 'Mitarbeiter ist erforderlich']
  },
  
  rolle: {
    type: String,
    enum: ['fahrer', 'helfer', 'projektleiter', 'praktikant'],
    default: 'helfer',
    required: true
  },
  
  stunden: {
    type: Number,
    min: [0, 'Stunden können nicht negativ sein'],
    max: [24, 'Mehr als 24 Stunden nicht möglich']
  },
  
  bemerkung: {
    type: String,
    maxlength: [500, 'Bemerkung zu lang']
  }
}, { _id: false });

// Main Umzug schema
const umzugSchema = new mongoose.Schema({
  // Basic information
  kundennummer: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^KD-\d{6}$/, 'Ungültiges Kundennummer-Format (KD-XXXXXX)']
  },
  
  auftraggeber: {
    type: kontaktSchema,
    required: [true, 'Auftraggeber ist erforderlich']
  },
  
  kontakte: {
    type: [kontaktSchema],
    validate: {
      validator: function(v) {
        return v.length <= 10;
      },
      message: 'Maximal 10 Kontakte erlaubt'
    }
  },
  
  // Addresses
  auszugsadresse: {
    type: adresseSchema,
    required: [true, 'Auszugsadresse ist erforderlich']
  },
  
  einzugsadresse: {
    type: adresseSchema,
    required: [true, 'Einzugsadresse ist erforderlich']
  },
  
  zwischenstopps: {
    type: [adresseSchema],
    validate: {
      validator: function(v) {
        return v.length <= 5;
      },
      message: 'Maximal 5 Zwischenstopps erlaubt'
    }
  },
  
  // Dates
  startDatum: {
    type: Date,
    required: [true, 'Startdatum ist erforderlich'],
    index: true,
    validate: {
      validator: validators.futureDate,
      message: 'Startdatum muss in der Zukunft liegen'
    }
  },
  
  endDatum: {
    type: Date,
    required: [true, 'Enddatum ist erforderlich'],
    validate: {
      validator: validators.dateRange,
      message: 'Enddatum muss nach dem Startdatum liegen'
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: {
      values: ['angefragt', 'angebot', 'geplant', 'in_durchfuehrung', 'abgeschlossen', 'storniert'],
      message: '{VALUE} ist kein gültiger Status'
    },
    default: 'angefragt',
    index: true
  },
  
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String
  }],
  
  // Pricing
  preis: {
    angebot: {
      netto: { type: Number, min: [0, 'Preis kann nicht negativ sein'] },
      brutto: { type: Number, min: [0, 'Preis kann nicht negativ sein'] },
      mwst: { type: Number, default: 19, min: [0, 'MwSt kann nicht negativ sein'], max: [100, 'MwSt zu hoch'] }
    },
    
    final: {
      netto: { type: Number, min: [0, 'Preis kann nicht negativ sein'] },
      brutto: { type: Number, min: [0, 'Preis kann nicht negativ sein'] },
      mwst: { type: Number, default: 19, min: [0, 'MwSt kann nicht negativ sein'], max: [100, 'MwSt zu hoch'] }
    },
    
    bezahlt: {
      type: Boolean,
      default: false
    },
    
    zahlungsart: {
      type: String,
      enum: {
        values: ['bar', 'ueberweisung', 'ec', 'kreditkarte', 'paypal', 'rechnung', 'lastschrift'],
        message: '{VALUE} ist keine gültige Zahlungsart'
      },
      default: 'rechnung'
    },
    
    zahlungsziel: {
      type: Number,
      default: 14,
      min: [0, 'Ungültiges Zahlungsziel'],
      max: [90, 'Zahlungsziel zu lang']
    },
    
    zahlungsdatum: Date,
    
    rabatt: {
      prozent: { type: Number, min: 0, max: 100 },
      betrag: { type: Number, min: 0 },
      grund: String
    }
  },
  
  // References
  aufnahmeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aufnahme'
  },
  
  angebotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Angebot'
  },
  
  rechnungId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rechnung'
  },
  
  // Resources
  fahrzeuge: {
    type: [fahrzeugSchema],
    validate: {
      validator: function(v) {
        return v.length <= 10;
      },
      message: 'Maximal 10 Fahrzeuge erlaubt'
    }
  },
  
  mitarbeiter: {
    type: [mitarbeiterZuordnungSchema],
    validate: {
      validator: function(v) {
        return v.length <= 20;
      },
      message: 'Maximal 20 Mitarbeiter erlaubt'
    }
  },
  
  // Documents and notes
  notizen: [{
    text: {
      type: String,
      required: true,
      maxlength: [1000, 'Notiz zu lang']
    },
    ersteller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    datum: {
      type: Date,
      default: Date.now
    },
    wichtig: {
      type: Boolean,
      default: false
    }
  }],
  
  dokumente: [{
    name: {
      type: String,
      required: true,
      maxlength: [255, 'Dokumentname zu lang']
    },
    pfad: {
      type: String,
      required: true
    },
    kategorie: {
      type: String,
      enum: ['angebot', 'rechnung', 'lieferschein', 'protokoll', 'sonstiges'],
      default: 'sonstiges'
    },
    datum: {
      type: Date,
      default: Date.now
    },
    size: {
      type: Number,
      min: 0
    },
    mimeType: String
  }],
  
  // Tasks
  tasks: [{
    beschreibung: {
      type: String,
      required: true,
      maxlength: [500, 'Taskbeschreibung zu lang']
    },
    erledigt: {
      type: Boolean,
      default: false
    },
    faelligkeit: Date,
    prioritaet: {
      type: String,
      enum: ['niedrig', 'mittel', 'hoch', 'kritisch'],
      default: 'mittel'
    },
    zugewiesen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    erledigtVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    erledigtAm: Date
  }],
  
  // Extra services
  extraLeistungen: [{
    beschreibung: {
      type: String,
      required: true,
      maxlength: [255, 'Beschreibung zu lang']
    },
    kategorie: {
      type: String,
      enum: ['verpackung', 'montage', 'entsorgung', 'lagerung', 'sonstiges'],
      default: 'sonstiges'
    },
    preis: {
      type: Number,
      required: true,
      min: [0, 'Preis kann nicht negativ sein']
    },
    menge: {
      type: Number,
      default: 1,
      min: [1, 'Menge muss mindestens 1 sein']
    },
    einheit: {
      type: String,
      enum: ['stueck', 'stunde', 'pauschal', 'qm', 'kg'],
      default: 'stueck'
    }
  }],
  
  // Quality and feedback
  kundenzufriedenheit: {
    bewertung: {
      type: Number,
      min: [1, 'Mindestbewertung ist 1'],
      max: [5, 'Maximalbewertung ist 5']
    },
    kommentar: {
      type: String,
      maxlength: [1000, 'Kommentar zu lang']
    },
    datum: Date
  },
  
  // Logistics details
  umzugsdetails: {
    volumen: {
      type: Number,
      min: [0, 'Volumen kann nicht negativ sein']
    },
    gewicht: {
      type: Number,
      min: [0, 'Gewicht kann nicht negativ sein']
    },
    anzahlKartons: {
      type: Number,
      min: [0, 'Anzahl kann nicht negativ sein']
    },
    versicherungswert: {
      type: Number,
      min: [0, 'Versicherungswert kann nicht negativ sein']
    },
    spezialtransporte: [String],
    verpackungsmaterial: {
      kartons: { type: Number, default: 0 },
      luftpolsterfolie: { type: Number, default: 0 },
      packpapier: { type: Number, default: 0 },
      stretchfolie: { type: Number, default: 0 }
    }
  },
  
  // Cancellation details
  stornierung: {
    datum: Date,
    grund: String,
    kosten: Number,
    bearbeitetVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
umzugSchema.index({ kundennummer: 1 });
umzugSchema.index({ status: 1, startDatum: -1 });
umzugSchema.index({ 'auftraggeber.name': 'text', 'auftraggeber.telefon': 'text' });
umzugSchema.index({ startDatum: 1, endDatum: 1 });
umzugSchema.index({ createdAt: -1 });
umzugSchema.index({ 'preis.bezahlt': 1 });

// Virtual properties
umzugSchema.virtual('dauer').get(function() {
  if (this.startDatum && this.endDatum) {
    const diffTime = Math.abs(this.endDatum - this.startDatum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

umzugSchema.virtual('gesamtpreis').get(function() {
  if (this.preis.final.brutto) {
    return this.preis.final.brutto;
  }
  if (this.preis.angebot.brutto) {
    return this.preis.angebot.brutto;
  }
  return 0;
});

umzugSchema.virtual('extraLeistungenGesamt').get(function() {
  return this.extraLeistungen.reduce((sum, extra) => {
    return sum + (extra.preis * extra.menge);
  }, 0);
});

// Pre-save hooks
umzugSchema.pre('save', async function(next) {
  try {
    // Generate customer number if not exists
    if (!this.kundennummer && this.isNew) {
      const count = await this.constructor.countDocuments();
      this.kundennummer = `KD-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate brutto from netto if needed
    if (this.preis.angebot.netto && !this.preis.angebot.brutto) {
      this.preis.angebot.brutto = this.preis.angebot.netto * (1 + this.preis.angebot.mwst / 100);
    }
    
    if (this.preis.final.netto && !this.preis.final.brutto) {
      this.preis.final.brutto = this.preis.final.netto * (1 + this.preis.final.mwst / 100);
    }
    
    // Update status history
    if (this.isModified('status') && this.status) {
      this.statusHistory.push({
        status: this.status,
        changedAt: Date.now(),
        changedBy: this.modifiedBy || this.createdBy
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
umzugSchema.methods = {
  // Calculate total price including extras
  calculateTotalPrice() {
    const basePrice = this.gesamtpreis;
    const extras = this.extraLeistungenGesamt;
    return basePrice + extras;
  },
  
  // Add status change
  async changeStatus(newStatus, userId, reason) {
    this.status = newStatus;
    this.statusHistory.push({
      status: newStatus,
      changedAt: Date.now(),
      changedBy: userId,
      reason
    });
    return await this.save();
  },
  
  // Mark as paid
  async markAsPaid(zahlungsart, datum) {
    this.preis.bezahlt = true;
    this.preis.zahlungsart = zahlungsart;
    this.preis.zahlungsdatum = datum || Date.now();
    return await this.save();
  },
  
  // Add task
  async addTask(taskData) {
    this.tasks.push(taskData);
    return await this.save();
  },
  
  // Complete task
  async completeTask(taskId, userId) {
    const task = this.tasks.id(taskId);
    if (task) {
      task.erledigt = true;
      task.erledigtVon = userId;
      task.erledigtAm = Date.now();
      return await this.save();
    }
    throw new Error('Task nicht gefunden');
  },
  
  // Add note
  async addNote(text, userId, wichtig = false) {
    this.notizen.push({
      text,
      ersteller: userId,
      wichtig,
      datum: Date.now()
    });
    return await this.save();
  },
  
  // Cancel move
  async cancel(grund, userId, kosten = 0) {
    this.status = 'storniert';
    this.stornierung = {
      datum: Date.now(),
      grund,
      kosten,
      bearbeitetVon: userId
    };
    this.statusHistory.push({
      status: 'storniert',
      changedAt: Date.now(),
      changedBy: userId,
      reason: grund
    });
    return await this.save();
  }
};

// Statics
umzugSchema.statics = {
  // Find moves by date range
  findByDateRange(startDate, endDate) {
    return this.find({
      startDatum: { $gte: startDate, $lte: endDate }
    }).sort({ startDatum: 1 });
  },
  
  // Find unpaid moves
  findUnpaid() {
    return this.find({ 'preis.bezahlt': false, status: 'abgeschlossen' });
  },
  
  // Find active moves
  findActive() {
    return this.find({
      status: { $in: ['geplant', 'in_durchfuehrung'] }
    }).sort({ startDatum: 1 });
  },
  
  // Get statistics
  async getStatistics(dateRange) {
    const query = {};
    if (dateRange) {
      query.startDatum = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }
    
    const stats = await this.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalMoves: { $sum: 1 },
          completedMoves: {
            $sum: { $cond: [{ $eq: ['$status', 'abgeschlossen'] }, 1, 0] }
          },
          cancelledMoves: {
            $sum: { $cond: [{ $eq: ['$status', 'storniert'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: '$preis.final.brutto'
          },
          paidRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$preis.bezahlt', true] },
                '$preis.final.brutto',
                0
              ]
            }
          },
          averagePrice: {
            $avg: '$preis.final.brutto'
          },
          statusDistribution: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalMoves: 1,
          completedMoves: 1,
          cancelledMoves: 1,
          totalRevenue: 1,
          paidRevenue: 1,
          unpaidRevenue: { $subtract: ['$totalRevenue', '$paidRevenue'] },
          averagePrice: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedMoves', '$totalMoves'] },
              100
            ]
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalMoves: 0,
      completedMoves: 0,
      cancelledMoves: 0,
      totalRevenue: 0,
      paidRevenue: 0,
      unpaidRevenue: 0,
      averagePrice: 0,
      completionRate: 0
    };
  },
  
  // Find moves for employee
  findByEmployee(employeeId) {
    return this.find({
      'mitarbeiter.mitarbeiterId': employeeId
    }).sort({ startDatum: -1 });
  }
};

const Umzug = mongoose.model('Umzug', umzugSchema);

module.exports = Umzug;