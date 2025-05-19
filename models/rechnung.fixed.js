const mongoose = require('mongoose');

// Invoice/Bill Model with comprehensive payment tracking and accounting features
const rechnungSchema = new mongoose.Schema({
  rechnungNummer: {
    type: String,
    required: [true, 'Rechnungsnummer ist erforderlich'],
    unique: true,
    index: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Format: RG-YYYY-NNNNNN
        return /^RG-\d{4}-\d{6}$/.test(v);
      },
      message: 'Rechnungsnummer muss dem Format RG-YYYY-NNNNNN entsprechen'
    }
  },
  
  kunde: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Kunde ist erforderlich'],
    index: true
  },
  
  ansprechpartner: {
    name: String,
    email: {
      type: String,
      lowercase: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
      }
    },
    telefon: String
  },
  
  umzug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug',
    index: true
  },
  
  angebot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Angebot',
    index: true
  },
  
  rechnungsart: {
    type: String,
    enum: ['Rechnung', 'Gutschrift', 'Stornierung', 'Proforma'],
    default: 'Rechnung',
    required: true
  },
  
  leistungszeitraum: {
    von: {
      type: Date,
      required: [true, 'Leistungszeitraum von ist erforderlich']
    },
    bis: {
      type: Date,
      required: [true, 'Leistungszeitraum bis ist erforderlich'],
      validate: {
        validator: function(v) {
          return !this.leistungszeitraum.von || v >= this.leistungszeitraum.von;
        },
        message: 'Enddatum muss nach dem Startdatum liegen'
      }
    }
  },
  
  ausstellungsdatum: {
    type: Date,
    default: Date.now,
    required: [true, 'Ausstellungsdatum ist erforderlich'],
    index: true
  },
  
  faelligkeitsdatum: {
    type: Date,
    required: [true, 'Fälligkeitsdatum ist erforderlich'],
    index: true,
    validate: {
      validator: function(v) {
        return v >= this.ausstellungsdatum;
      },
      message: 'Fälligkeitsdatum muss nach dem Ausstellungsdatum liegen'
    }
  },
  
  zahlungsziel: {
    type: Number,
    default: 14,
    min: [0, 'Zahlungsziel kann nicht negativ sein'],
    max: [365, 'Zahlungsziel darf maximal 365 Tage betragen']
  },
  
  status: {
    type: String,
    enum: ['Entwurf', 'Gesendet', 'Teilweise bezahlt', 'Bezahlt', 'Überfällig', 'Storniert', 'Gemahnt'],
    default: 'Entwurf',
    index: true
  },
  
  zahlungen: [{
    betrag: {
      type: Number,
      required: true,
      min: [0.01, 'Zahlungsbetrag muss mindestens 0,01 € betragen']
    },
    datum: {
      type: Date,
      default: Date.now,
      required: true
    },
    zahlungsmethode: {
      type: String,
      enum: ['Überweisung', 'Bar', 'Kreditkarte', 'PayPal', 'SEPA-Lastschrift', 'Scheck', 'Sonstige'],
      required: true
    },
    referenz: String,
    notiz: String,
    verbuchtVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  positionsliste: [{
    position: {
      type: Number,
      required: true
    },
    bezeichnung: {
      type: String,
      required: [true, 'Bezeichnung ist erforderlich'],
      trim: true
    },
    beschreibung: {
      type: String,
      trim: true
    },
    menge: {
      type: Number,
      required: [true, 'Menge ist erforderlich'],
      min: [0.01, 'Menge muss mindestens 0,01 betragen']
    },
    einheit: {
      type: String,
      required: [true, 'Einheit ist erforderlich'],
      default: 'Stück',
      enum: ['Stück', 'Stunden', 'Tage', 'km', 'm³', 'm²', 'kg', 'Pauschal']
    },
    einzelpreis: {
      type: Number,
      required: [true, 'Einzelpreis ist erforderlich'],
      min: [0, 'Einzelpreis kann nicht negativ sein']
    },
    rabatt: {
      prozent: {
        type: Number,
        default: 0,
        min: [0, 'Rabatt kann nicht negativ sein'],
        max: [100, 'Rabatt kann nicht über 100% liegen']
      },
      betrag: {
        type: Number,
        default: 0,
        min: [0, 'Rabattbetrag kann nicht negativ sein']
      }
    },
    steuersatz: {
      type: Number,
      required: [true, 'Steuersatz ist erforderlich'],
      enum: [0, 7, 19],
      default: 19
    },
    gesamtpreisNetto: {
      type: Number,
      required: true
    },
    gesamtpreisBrutto: {
      type: Number,
      required: true
    }
  }],
  
  steuersaetze: [{
    satz: {
      type: Number,
      required: true,
      enum: [0, 7, 19]
    },
    nettobetrag: {
      type: Number,
      required: true
    },
    steuerbetrag: {
      type: Number,
      required: true
    }
  }],
  
  preisgestaltung: {
    nettosumme: {
      type: Number,
      required: true,
      default: 0
    },
    rabatt: {
      prozent: {
        type: Number,
        default: 0,
        min: [0, 'Rabatt kann nicht negativ sein'],
        max: [100, 'Rabatt kann nicht über 100% liegen']
      },
      betrag: {
        type: Number,
        default: 0
      }
    },
    zwischensumme: {
      type: Number,
      required: true,
      default: 0
    },
    steuerbetrag: {
      type: Number,
      required: true,
      default: 0
    },
    gesamtbetrag: {
      type: Number,
      required: true,
      default: 0
    }
  },
  
  bezahlterBetrag: {
    type: Number,
    default: 0,
    min: [0, 'Bezahlter Betrag kann nicht negativ sein']
  },
  
  offenerBetrag: {
    type: Number,
    default: 0
  },
  
  zahlungserinnerungen: [{
    mahnstufe: {
      type: Number,
      required: true,
      min: [1, 'Mahnstufe muss mindestens 1 sein'],
      max: [3, 'Mahnstufe darf maximal 3 sein']
    },
    datum: {
      type: Date,
      default: Date.now,
      required: true
    },
    faelligkeitsdatum: {
      type: Date,
      required: true
    },
    mahngebuehr: {
      type: Number,
      default: 0,
      min: [0, 'Mahngebühr kann nicht negativ sein']
    },
    notiz: String,
    erstelltVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gesendetAm: Date,
    empfangsbestaetigung: {
      datum: Date,
      art: {
        type: String,
        enum: ['E-Mail', 'Post', 'Fax']
      }
    }
  }],
  
  notizen: {
    type: String,
    maxlength: [1000, 'Notizen dürfen maximal 1000 Zeichen lang sein']
  },
  
  zahlungsbedingungen: {
    type: String,
    maxlength: [500, 'Zahlungsbedingungen dürfen maximal 500 Zeichen lang sein']
  },
  
  bankverbindung: {
    kontoinhaber: String,
    iban: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          // Basic IBAN validation for German IBANs
          return /^DE\d{2}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{4}[ ]?\d{2}$/.test(v.replace(/\s/g, ''));
        },
        message: 'Bitte geben Sie eine gültige deutsche IBAN ein'
      }
    },
    bic: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
        },
        message: 'Bitte geben Sie einen gültigen BIC ein'
      }
    },
    bankname: String
  },
  
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ersteller ist erforderlich']
  },
  
  genehmigung: {
    erforderlich: {
      type: Boolean,
      default: false
    },
    genehmigtVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    genehmigtAm: Date,
    kommentar: String
  },
  
  dateien: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  
  versanddetails: {
    art: {
      type: String,
      enum: ['E-Mail', 'Post', 'Fax', 'Portal'],
      default: 'E-Mail'
    },
    empfaenger: {
      email: String,
      adresse: {
        strasse: String,
        plz: String,
        ort: String
      }
    },
    gesendetAm: Date,
    empfangsbestaetigung: {
      datum: Date,
      art: String
    }
  },
  
  buchung: {
    gebucht: {
      type: Boolean,
      default: false
    },
    buchungsdatum: Date,
    buchungsnummer: String,
    kostenstelle: String,
    sachkonto: String
  },
  
  metadata: {
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
rechnungSchema.index({ kunde: 1, ausstellungsdatum: -1 });
rechnungSchema.index({ status: 1, faelligkeitsdatum: 1 });
rechnungSchema.index({ 'versanddetails.art': 1, 'versanddetails.gesendetAm': 1 });

// Virtual for days until due
rechnungSchema.virtual('tageUeberfaellig').get(function() {
  if (this.status === 'Bezahlt' || this.status === 'Storniert') return 0;
  if (!this.faelligkeitsdatum) return 0;
  
  const heute = new Date();
  const diffTime = heute - this.faelligkeitsdatum;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Virtual for payment status description
rechnungSchema.virtual('zahlungsstatusText').get(function() {
  const offen = this.offenerBetrag;
  const gesamt = this.preisgestaltung.gesamtbetrag;
  
  if (offen === 0) return 'Vollständig bezahlt';
  if (offen === gesamt) return 'Unbezahlt';
  if (offen < gesamt) return `Teilweise bezahlt (${((gesamt - offen) / gesamt * 100).toFixed(1)}%)`;
  return 'Überzahlt';
});

// Calculate totals before saving
rechnungSchema.pre('save', async function(next) {
  try {
    // Calculate position totals
    this.positionsliste.forEach((position, index) => {
      position.position = index + 1;
      
      // Calculate net price with discount
      let netto = position.einzelpreis * position.menge;
      if (position.rabatt.prozent > 0) {
        position.rabatt.betrag = netto * (position.rabatt.prozent / 100);
        netto -= position.rabatt.betrag;
      }
      
      position.gesamtpreisNetto = netto;
      position.gesamtpreisBrutto = netto * (1 + position.steuersatz / 100);
    });
    
    // Group by tax rate
    const steuersaetze = new Map();
    this.positionsliste.forEach(pos => {
      const satz = pos.steuersatz;
      if (!steuersaetze.has(satz)) {
        steuersaetze.set(satz, { netto: 0, steuer: 0 });
      }
      const gruppe = steuersaetze.get(satz);
      gruppe.netto += pos.gesamtpreisNetto;
      gruppe.steuer += pos.gesamtpreisNetto * (satz / 100);
    });
    
    // Update tax groups
    this.steuersaetze = Array.from(steuersaetze.entries()).map(([satz, werte]) => ({
      satz,
      nettobetrag: werte.netto,
      steuerbetrag: werte.steuer
    }));
    
    // Calculate totals
    this.preisgestaltung.nettosumme = this.positionsliste.reduce((sum, pos) => sum + pos.gesamtpreisNetto, 0);
    
    // Apply overall discount
    this.preisgestaltung.zwischensumme = this.preisgestaltung.nettosumme;
    if (this.preisgestaltung.rabatt.prozent > 0) {
      this.preisgestaltung.rabatt.betrag = this.preisgestaltung.nettosumme * (this.preisgestaltung.rabatt.prozent / 100);
      this.preisgestaltung.zwischensumme -= this.preisgestaltung.rabatt.betrag;
    }
    
    // Calculate tax and total
    this.preisgestaltung.steuerbetrag = this.steuersaetze.reduce((sum, gruppe) => sum + gruppe.steuerbetrag, 0);
    this.preisgestaltung.gesamtbetrag = this.preisgestaltung.zwischensumme + this.preisgestaltung.steuerbetrag;
    
    // Calculate payment status
    this.bezahlterBetrag = this.zahlungen.reduce((sum, zahlung) => sum + zahlung.betrag, 0);
    this.offenerBetrag = this.preisgestaltung.gesamtbetrag - this.bezahlterBetrag;
    
    // Update status based on payments and due date
    if (this.status !== 'Storniert') {
      if (this.offenerBetrag <= 0) {
        this.status = 'Bezahlt';
      } else if (this.offenerBetrag < this.preisgestaltung.gesamtbetrag) {
        this.status = 'Teilweise bezahlt';
      } else if (this.tageUeberfaellig > 0) {
        this.status = 'Überfällig';
      }
    }
    
    // Generate invoice number if new
    if (!this.rechnungNummer && this.isNew) {
      const jahr = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        rechnungNummer: new RegExp(`^RG-${jahr}-`)
      });
      this.rechnungNummer = `RG-${jahr}-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Set due date if not set
    if (!this.faelligkeitsdatum) {
      const due = new Date(this.ausstellungsdatum);
      due.setDate(due.getDate() + this.zahlungsziel);
      this.faelligkeitsdatum = due;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find overdue invoices
rechnungSchema.statics.findUeberfaellig = function(tage = 0) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - tage);
  
  return this.find({
    status: { $nin: ['Bezahlt', 'Storniert'] },
    faelligkeitsdatum: { $lt: cutoffDate }
  }).populate('kunde');
};

// Static method to calculate revenue for period
rechnungSchema.statics.berechneUmsatz = async function(von, bis) {
  const result = await this.aggregate([
    {
      $match: {
        status: { $ne: 'Storniert' },
        ausstellungsdatum: { $gte: von, $lte: bis }
      }
    },
    {
      $group: {
        _id: null,
        gesamtNetto: { $sum: '$preisgestaltung.nettosumme' },
        gesamtBrutto: { $sum: '$preisgestaltung.gesamtbetrag' },
        gezahlt: { $sum: '$bezahlterBetrag' },
        offen: { $sum: '$offenerBetrag' },
        anzahl: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || {
    gesamtNetto: 0,
    gesamtBrutto: 0,
    gezahlt: 0,
    offen: 0,
    anzahl: 0
  };
};

// Instance method to add payment
rechnungSchema.methods.zahlungHinzufuegen = function(zahlungsdaten) {
  this.zahlungen.push(zahlungsdaten);
  return this.save();
};

// Instance method to create reminder
rechnungSchema.methods.mahnungErstellen = function(mahngebuehr = 5) {
  const mahnstufe = this.zahlungserinnerungen.length + 1;
  if (mahnstufe > 3) {
    throw new Error('Maximale Mahnstufe erreicht');
  }
  
  const neueFaelligkeit = new Date();
  neueFaelligkeit.setDate(neueFaelligkeit.getDate() + 7);
  
  this.zahlungserinnerungen.push({
    mahnstufe,
    mahngebuehr,
    faelligkeitsdatum: neueFaelligkeit
  });
  
  this.status = 'Gemahnt';
  return this.save();
};

// Instance method to duplicate invoice
rechnungSchema.methods.duplizieren = function() {
  const duplikat = this.toObject();
  delete duplikat._id;
  delete duplikat.rechnungNummer;
  delete duplikat.zahlungen;
  delete duplikat.zahlungserinnerungen;
  delete duplikat.versanddetails;
  delete duplikat.buchung;
  delete duplikat.createdAt;
  delete duplikat.updatedAt;
  
  duplikat.status = 'Entwurf';
  duplikat.ausstellungsdatum = new Date();
  
  return new this.constructor(duplikat);
};

// Instance method to cancel invoice
rechnungSchema.methods.stornieren = function(grund) {
  if (this.status === 'Storniert') {
    throw new Error('Rechnung ist bereits storniert');
  }
  
  this.status = 'Storniert';
  if (grund) {
    this.notizen = (this.notizen || '') + `\n\nStorniert: ${grund}`;
  }
  
  return this.save();
};

// Instance method to generate PDF (placeholder)
rechnungSchema.methods.pdfGenerieren = async function() {
  // This would integrate with a PDF generation service
  return {
    filename: `${this.rechnungNummer}.pdf`,
    buffer: Buffer.from('PDF content would be here'),
    mimeType: 'application/pdf'
  };
};

// Instance method to send invoice
rechnungSchema.methods.versenden = async function(empfaenger, art = 'E-Mail') {
  this.versanddetails = {
    art,
    empfaenger,
    gesendetAm: new Date()
  };
  
  if (this.status === 'Entwurf') {
    this.status = 'Gesendet';
  }
  
  return this.save();
};

const Rechnung = mongoose.model('Rechnung', rechnungSchema);

module.exports = Rechnung;