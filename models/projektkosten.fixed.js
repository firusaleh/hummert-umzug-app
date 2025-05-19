const mongoose = require('mongoose');

// Project Costs Model with comprehensive expense tracking and categorization
const projektkostenSchema = new mongoose.Schema({
  kostennummer: {
    type: String,
    unique: true,
    index: true,
    required: [true, 'Kostennummer ist erforderlich'],
    validate: {
      validator: function(v) {
        // Format: PK-YYYY-NNNNNN
        return /^PK-\d{4}-\d{6}$/.test(v);
      },
      message: 'Kostennummer muss dem Format PK-YYYY-NNNNNN entsprechen'
    }
  },
  
  bezeichnung: {
    type: String,
    required: [true, 'Bezeichnung ist erforderlich'],
    trim: true,
    maxlength: [200, 'Bezeichnung darf maximal 200 Zeichen lang sein']
  },
  
  umzug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug',
    index: true
  },
  
  projekt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  
  kategorie: {
    type: String,
    enum: ['Personal', 'Fahrzeuge', 'Material', 'Verpackung', 'Unterauftrag', 'Versicherung', 'Miete', 'Kraftstoff', 'Verpflegung', 'Sonstiges'],
    required: [true, 'Kategorie ist erforderlich'],
    index: true
  },
  
  unterkategorie: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Validate subcategory based on main category
        const validSubcategories = {
          'Personal': ['Löhne', 'Überstunden', 'Prämien', 'Sozialabgaben'],
          'Fahrzeuge': ['LKW', 'Transporter', 'PKW', 'Spezialfahrzeuge'],
          'Material': ['Werkzeuge', 'Hilfsmittel', 'Verbrauchsmaterial'],
          'Verpackung': ['Kartons', 'Folie', 'Decken', 'Polstermaterial'],
          'Unterauftrag': ['Transport', 'Montage', 'Lagerung'],
          'Versicherung': ['Transportversicherung', 'Haftpflicht', 'Unfallversicherung'],
          'Miete': ['Fahrzeugmiete', 'Lagermiete', 'Gerätemiete'],
          'Kraftstoff': ['Diesel', 'Benzin', 'AdBlue'],
          'Verpflegung': ['Mittagessen', 'Getränke', 'Übernachtung']
        };
        
        return !validSubcategories[this.kategorie] || validSubcategories[this.kategorie].includes(v);
      },
      message: 'Ungültige Unterkategorie für die gewählte Kategorie'
    }
  },
  
  kostenart: {
    type: String,
    enum: ['Fixkosten', 'Variable Kosten', 'Einmalkosten'],
    required: [true, 'Kostenart ist erforderlich']
  },
  
  betrag: {
    betragNetto: {
      type: Number,
      required: [true, 'Nettobetrag ist erforderlich'],
      min: [0, 'Betrag kann nicht negativ sein']
    },
    steuersatz: {
      type: Number,
      required: [true, 'Steuersatz ist erforderlich'],
      enum: [0, 7, 19],
      default: 19
    },
    steuerbetrag: {
      type: Number,
      required: true,
      min: [0, 'Steuerbetrag kann nicht negativ sein']
    },
    betragBrutto: {
      type: Number,
      required: true,
      min: [0, 'Bruttobetrag kann nicht negativ sein']
    }
  },
  
  datum: {
    type: Date,
    default: Date.now,
    required: [true, 'Datum ist erforderlich'],
    index: true
  },
  
  erfassungsdatum: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  beschreibung: {
    type: String,
    maxlength: [1000, 'Beschreibung darf maximal 1000 Zeichen lang sein']
  },
  
  lieferant: {
    name: {
      type: String,
      trim: true
    },
    lieferantennummer: String,
    rechnungsnummer: String,
    bestellnummer: String
  },
  
  mitarbeiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mitarbeiter'
  },
  
  fahrzeug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fahrzeug'
  },
  
  mengendaten: {
    menge: Number,
    einheit: {
      type: String,
      enum: ['Stunden', 'Tage', 'km', 'Liter', 'Stück', 'kg', 'm³', 'm²']
    },
    einzelpreis: Number
  },
  
  bezahlstatus: {
    type: String,
    enum: ['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt', 'Storniert'],
    default: 'Offen',
    index: true
  },
  
  bezahlung: {
    bezahltAm: Date,
    zahlungsmethode: {
      type: String,
      enum: ['Überweisung', 'Bar', 'Kreditkarte', 'PayPal', 'Firmenkarte', 'Lastschrift', 'Sonstige']
    },
    referenznummer: String,
    bankverbindung: {
      iban: String,
      bic: String,
      bankname: String
    }
  },
  
  genehmigung: {
    erforderlich: {
      type: Boolean,
      default: function() {
        return this.betrag.betragBrutto > 500;
      }
    },
    status: {
      type: String,
      enum: ['Ausstehend', 'Genehmigt', 'Abgelehnt'],
      default: 'Ausstehend'
    },
    genehmigtVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    genehmigtAm: Date,
    ablehnungsgrund: String,
    kommentar: String
  },
  
  belege: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ersteller ist erforderlich']
  },
  
  bearbeitetVon: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    datum: {
      type: Date,
      default: Date.now
    },
    aktion: {
      type: String,
      enum: ['Erstellt', 'Bearbeitet', 'Genehmigt', 'Abgelehnt', 'Bezahlt', 'Storniert']
    },
    kommentar: String
  }],
  
  kostenstelle: {
    nummer: String,
    bezeichnung: String
  },
  
  buchung: {
    gebucht: {
      type: Boolean,
      default: false
    },
    buchungsdatum: Date,
    buchungsnummer: String,
    sachkonto: String,
    gegenkonto: String
  },
  
  budget: {
    budgetiert: {
      type: Boolean,
      default: false
    },
    budgetposten: String,
    budgetbetrag: Number,
    budgetperiode: {
      von: Date,
      bis: Date
    }
  },
  
  wiederkehrend: {
    aktiv: {
      type: Boolean,
      default: false
    },
    intervall: {
      type: String,
      enum: ['Täglich', 'Wöchentlich', 'Monatlich', 'Quartalsweise', 'Jährlich']
    },
    naechsteFaelligkeit: Date,
    enddatum: Date
  },
  
  tags: [String],
  
  metadata: {
    kmStand: Number, // For vehicle costs
    stundenAnzahl: Number, // For personnel costs
    customFields: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projektkostenSchema.index({ umzug: 1, kategorie: 1 });
projektkostenSchema.index({ datum: -1, kategorie: 1 });
projektkostenSchema.index({ bezahlstatus: 1, 'genehmigung.status': 1 });

// Virtual for formatted cost number
projektkostenSchema.virtual('kostenNummerFormatiert').get(function() {
  if (!this.kostennummer) return '';
  return this.kostennummer.replace(/^PK-(\d{4})-(\d{6})$/, 'PK-$1/$2');
});

// Virtual for approval needed
projektkostenSchema.virtual('genehmigungAusstehend').get(function() {
  return this.genehmigung.erforderlich && this.genehmigung.status === 'Ausstehend';
});

// Virtual for days since creation
projektkostenSchema.virtual('tageAlt').get(function() {
  const heute = new Date();
  const erstellt = this.createdAt || this.datum;
  const diff = heute - erstellt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Calculate tax and gross amount before saving
projektkostenSchema.pre('save', async function(next) {
  try {
    // Calculate tax and gross amount
    if (this.betrag.betragNetto && this.betrag.steuersatz !== undefined) {
      this.betrag.steuerbetrag = this.betrag.betragNetto * (this.betrag.steuersatz / 100);
      this.betrag.betragBrutto = this.betrag.betragNetto + this.betrag.steuerbetrag;
    }
    
    // Calculate from quantity data if provided
    if (this.mengendaten.menge && this.mengendaten.einzelpreis) {
      this.betrag.betragNetto = this.mengendaten.menge * this.mengendaten.einzelpreis;
    }
    
    // Generate cost number if new
    if (!this.kostennummer && this.isNew) {
      const jahr = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        kostennummer: new RegExp(`^PK-${jahr}-`)
      });
      this.kostennummer = `PK-${jahr}-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Add creation entry to history
    if (this.isNew) {
      this.bearbeitetVon.push({
        user: this.erstelltVon,
        aktion: 'Erstellt'
      });
    }
    
    // Update payment status
    if (this.bezahlung.bezahltAm) {
      this.bezahlstatus = 'Bezahlt';
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get costs by category
projektkostenSchema.statics.nachKategorie = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$kategorie',
        anzahl: { $sum: 1 },
        summeNetto: { $sum: '$betrag.betragNetto' },
        summeBrutto: { $sum: '$betrag.betragBrutto' }
      }
    },
    { $sort: { summeBrutto: -1 } }
  ]);
};

// Static method to get costs by period
projektkostenSchema.statics.nachZeitraum = function(von, bis, gruppierung = 'monat') {
  const groupByDate = {
    tag: { $dateToString: { format: '%Y-%m-%d', date: '$datum' } },
    monat: { $dateToString: { format: '%Y-%m', date: '$datum' } },
    jahr: { $year: '$datum' }
  };
  
  return this.aggregate([
    {
      $match: {
        datum: { $gte: von, $lte: bis }
      }
    },
    {
      $group: {
        _id: groupByDate[gruppierung],
        anzahl: { $sum: 1 },
        summeNetto: { $sum: '$betrag.betragNetto' },
        summeBrutto: { $sum: '$betrag.betragBrutto' },
        kategorien: {
          $push: {
            kategorie: '$kategorie',
            betrag: '$betrag.betragBrutto'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get budget comparison
projektkostenSchema.statics.budgetVergleich = async function(zeitraum) {
  const budgetiert = await this.aggregate([
    {
      $match: {
        'budget.budgetiert': true,
        'budget.budgetperiode.von': { $lte: zeitraum.bis },
        'budget.budgetperiode.bis': { $gte: zeitraum.von }
      }
    },
    {
      $group: {
        _id: '$kategorie',
        budgetSumme: { $sum: '$budget.budgetbetrag' },
        istSumme: { $sum: '$betrag.betragBrutto' }
      }
    }
  ]);
  
  return budgetiert.map(item => ({
    kategorie: item._id,
    budget: item.budgetSumme,
    ist: item.istSumme,
    differenz: item.budgetSumme - item.istSumme,
    auslastung: (item.istSumme / item.budgetSumme * 100).toFixed(1)
  }));
};

// Instance method to approve cost
projektkostenSchema.methods.genehmigen = function(userId, kommentar) {
  if (!this.genehmigung.erforderlich) {
    throw new Error('Genehmigung nicht erforderlich');
  }
  
  if (this.genehmigung.status !== 'Ausstehend') {
    throw new Error('Kosten wurden bereits bearbeitet');
  }
  
  this.genehmigung.status = 'Genehmigt';
  this.genehmigung.genehmigtVon = userId;
  this.genehmigung.genehmigtAm = new Date();
  if (kommentar) {
    this.genehmigung.kommentar = kommentar;
  }
  
  this.bearbeitetVon.push({
    user: userId,
    aktion: 'Genehmigt',
    kommentar
  });
  
  return this.save();
};

// Instance method to reject cost
projektkostenSchema.methods.ablehnen = function(userId, grund) {
  if (!this.genehmigung.erforderlich) {
    throw new Error('Genehmigung nicht erforderlich');
  }
  
  if (this.genehmigung.status !== 'Ausstehend') {
    throw new Error('Kosten wurden bereits bearbeitet');
  }
  
  this.genehmigung.status = 'Abgelehnt';
  this.genehmigung.genehmigtVon = userId;
  this.genehmigung.genehmigtAm = new Date();
  this.genehmigung.ablehnungsgrund = grund;
  
  this.bearbeitetVon.push({
    user: userId,
    aktion: 'Abgelehnt',
    kommentar: grund
  });
  
  return this.save();
};

// Instance method to mark as paid
projektkostenSchema.methods.alsBezahltMarkieren = function(zahlungsdaten) {
  if (this.bezahlstatus === 'Bezahlt') {
    throw new Error('Kosten sind bereits bezahlt');
  }
  
  this.bezahlstatus = 'Bezahlt';
  this.bezahlung = {
    bezahltAm: zahlungsdaten.datum || new Date(),
    zahlungsmethode: zahlungsdaten.zahlungsmethode,
    referenznummer: zahlungsdaten.referenznummer,
    bankverbindung: zahlungsdaten.bankverbindung
  };
  
  this.bearbeitetVon.push({
    user: zahlungsdaten.userId,
    aktion: 'Bezahlt',
    kommentar: zahlungsdaten.kommentar
  });
  
  return this.save();
};

// Instance method to cancel cost
projektkostenSchema.methods.stornieren = function(userId, grund) {
  if (this.bezahlstatus === 'Storniert') {
    throw new Error('Kosten sind bereits storniert');
  }
  
  this.bezahlstatus = 'Storniert';
  this.bearbeitetVon.push({
    user: userId,
    aktion: 'Storniert',
    kommentar: grund
  });
  
  return this.save();
};

// Instance method to duplicate for recurring costs
projektkostenSchema.methods.fuerWiederkehrendDuplizieren = function() {
  if (!this.wiederkehrend.aktiv) {
    throw new Error('Kosten sind nicht als wiederkehrend markiert');
  }
  
  const duplikat = this.toObject();
  delete duplikat._id;
  delete duplikat.kostennummer;
  delete duplikat.createdAt;
  delete duplikat.updatedAt;
  delete duplikat.bezahlstatus;
  delete duplikat.bezahlung;
  delete duplikat.genehmigung;
  delete duplikat.bearbeitetVon;
  
  duplikat.datum = this.wiederkehrend.naechsteFaelligkeit || new Date();
  
  return new this.constructor(duplikat);
};

const Projektkosten = mongoose.model('Projektkosten', projektkostenSchema);

module.exports = Projektkosten;