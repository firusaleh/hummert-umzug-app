// models/angebot.fixed.js - Enhanced quote/offer model with comprehensive validation
const mongoose = require('mongoose');
const validator = require('validator');

// Position/line item sub-schema
const positionSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: true,
    min: 1
  },
  
  bezeichnung: {
    type: String,
    required: [true, 'Bezeichnung ist erforderlich'],
    trim: true,
    maxlength: [200, 'Bezeichnung zu lang']
  },
  
  beschreibung: {
    type: String,
    maxlength: [500, 'Beschreibung zu lang']
  },
  
  kategorie: {
    type: String,
    enum: ['transport', 'personal', 'material', 'zusatzleistung', 'sonstiges'],
    default: 'sonstiges'
  },
  
  menge: {
    type: Number,
    required: [true, 'Menge ist erforderlich'],
    min: [0.01, 'Menge muss größer als 0 sein'],
    default: 1
  },
  
  einheit: {
    type: String,
    required: [true, 'Einheit ist erforderlich'],
    enum: ['Stück', 'Stunde', 'km', 'qm', 'cbm', 'kg', 'Pauschal'],
    default: 'Stück'
  },
  
  einzelpreis: {
    type: Number,
    required: [true, 'Einzelpreis ist erforderlich'],
    min: [0, 'Einzelpreis kann nicht negativ sein']
  },
  
  rabatt: {
    prozent: {
      type: Number,
      min: [0, 'Rabatt kann nicht negativ sein'],
      max: [100, 'Rabatt kann nicht über 100% sein'],
      default: 0
    },
    betrag: {
      type: Number,
      min: [0, 'Rabattbetrag kann nicht negativ sein'],
      default: 0
    }
  },
  
  zwischensumme: {
    type: Number,
    min: [0, 'Zwischensumme kann nicht negativ sein']
  },
  
  gesamtpreis: {
    type: Number,
    required: true,
    min: [0, 'Gesamtpreis kann nicht negativ sein']
  },
  
  optional: {
    type: Boolean,
    default: false
  },
  
  notizen: {
    type: String,
    maxlength: [500, 'Notizen zu lang']
  }
}, { _id: false });

// Main Angebot schema
const angebotSchema = new mongoose.Schema({
  // Document number
  angebotNummer: {
    type: String,
    required: [true, 'Angebotsnummer ist erforderlich'],
    unique: true,
    match: [/^ANG-\d{4}-\d{6}$/, 'Ungültiges Angebotsnummer-Format (ANG-YYYY-NNNNNN)']
  },
  
  // References
  kunde: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Kunde ist erforderlich']
  },
  
  umzug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug'
  },
  
  aufnahme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Aufnahme'
  },
  
  // Dates
  erstelltAm: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  gueltigBis: {
    type: Date,
    required: [true, 'Gültigkeitsdatum ist erforderlich'],
    validate: {
      validator: function(value) {
        return value > this.erstelltAm;
      },
      message: 'Gültigkeitsdatum muss nach Erstellungsdatum liegen'
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: {
      values: ['Entwurf', 'Prüfung', 'Gesendet', 'Nachfass', 'Verhandlung', 'Akzeptiert', 'Abgelehnt', 'Abgelaufen'],
      message: '{VALUE} ist kein gültiger Status'
    },
    default: 'Entwurf',
    index: true
  },
  
  statusHistory: [{
    status: String,
    datum: { type: Date, default: Date.now },
    benutzer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bemerkung: String
  }],
  
  // Version control
  version: {
    nummer: {
      type: Number,
      default: 1,
      min: 1
    },
    vorherige: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Angebot'
    }
  },
  
  // Pricing
  preisgestaltung: {
    nettosumme: {
      type: Number,
      required: true,
      min: [0, 'Nettosumme kann nicht negativ sein']
    },
    
    rabatt: {
      prozent: {
        type: Number,
        min: [0, 'Rabatt kann nicht negativ sein'],
        max: [100, 'Rabatt kann nicht über 100% sein'],
        default: 0
      },
      betrag: {
        type: Number,
        min: [0, 'Rabattbetrag kann nicht negativ sein'],
        default: 0
      },
      grund: String
    },
    
    zwischensumme: {
      type: Number,
      required: true,
      min: [0, 'Zwischensumme kann nicht negativ sein']
    },
    
    mehrwertsteuer: {
      satz: {
        type: Number,
        required: true,
        min: [0, 'MwSt-Satz kann nicht negativ sein'],
        max: [100, 'MwSt-Satz zu hoch'],
        default: 19
      },
      betrag: {
        type: Number,
        required: true,
        min: [0, 'MwSt-Betrag kann nicht negativ sein']
      }
    },
    
    gesamtbetrag: {
      type: Number,
      required: true,
      min: [0, 'Gesamtbetrag kann nicht negativ sein']
    }
  },
  
  // Line items
  positionsliste: {
    type: [positionSchema],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Mindestens eine Position ist erforderlich'
    }
  },
  
  // Optional positions
  optionalePositionen: [positionSchema],
  
  // Terms and conditions
  konditionen: {
    zahlungsziel: {
      type: Number,
      default: 14,
      min: [0, 'Zahlungsziel kann nicht negativ sein'],
      max: [90, 'Zahlungsziel zu lang']
    },
    
    zahlungsart: {
      type: String,
      enum: ['Überweisung', 'Bar', 'EC-Karte', 'Kreditkarte', 'PayPal', 'Rechnung'],
      default: 'Überweisung'
    },
    
    skonto: {
      prozent: Number,
      tage: Number,
      betrag: Number
    },
    
    anzahlung: {
      prozent: Number,
      betrag: Number,
      faelligBei: String
    },
    
    teilzahlungen: [{
      betrag: Number,
      faelligAm: Date,
      beschreibung: String
    }]
  },
  
  // Service details
  leistungsdetails: {
    ausfuehrungszeitraum: {
      von: Date,
      bis: Date
    },
    
    arbeitszeiten: {
      beginn: String,
      ende: String,
      bemerkung: String
    },
    
    personal: {
      anzahl: Number,
      qualifikation: String
    },
    
    fahrzeuge: [{
      typ: String,
      groesse: String,
      anzahl: Number
    }],
    
    eingeschlosseneLeistungen: [String],
    
    ausgeschlosseneLeistungen: [String],
    
    besonderheiten: String
  },
  
  // Documents and notes
  notizen: {
    oeffentlich: {
      type: String,
      maxlength: [2000, 'Öffentliche Notizen zu lang']
    },
    
    intern: {
      type: String,
      maxlength: [2000, 'Interne Notizen zu lang']
    },
    
    kundenwuensche: {
      type: String,
      maxlength: [1000, 'Kundenwünsche zu lang']
    }
  },
  
  dateien: [{
    name: {
      type: String,
      required: true,
      maxlength: [255, 'Dateiname zu lang']
    },
    pfad: {
      type: String,
      required: true
    },
    typ: {
      type: String,
      enum: ['angebot', 'kalkulation', 'plan', 'agb', 'sonstiges'],
      default: 'sonstiges'
    },
    groesse: Number,
    datum: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ersteller ist erforderlich']
  },
  
  bearbeitetVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  genehmigtVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  genehmigungsdatum: Date,
  
  // Communication tracking
  kommunikation: {
    versendetAm: Date,
    versendetPer: {
      type: String,
      enum: ['email', 'post', 'fax', 'persoenlich']
    },
    empfaenger: String,
    
    nachfassTermine: [{
      datum: Date,
      art: String,
      erledigt: Boolean,
      ergebnis: String,
      naechsterSchritt: String
    }],
    
    antwortErhalten: {
      datum: Date,
      inhalt: String,
      kontaktperson: String
    }
  },
  
  // Conversion tracking
  konversion: {
    zuAuftrag: {
      type: Boolean,
      default: false
    },
    auftragsnummer: String,
    konversionsdatum: Date,
    konversionsgrund: String,
    ablehnungsgrund: String
  },
  
  // Templates and references
  vorlage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AngebotVorlage'
  },
  
  referenzAngebote: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Angebot'
  }]
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

// Indexes
angebotSchema.index({ angebotNummer: 1 });
angebotSchema.index({ kunde: 1 });
angebotSchema.index({ status: 1 });
angebotSchema.index({ erstelltAm: -1 });
angebotSchema.index({ gueltigBis: 1 });

// Virtual properties
angebotSchema.virtual('istGueltig').get(function() {
  return new Date() <= this.gueltigBis && this.status !== 'Abgelaufen';
});

angebotSchema.virtual('tageGueltig').get(function() {
  const diff = this.gueltigBis - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

angebotSchema.virtual('nettoGesamtOptional').get(function() {
  return this.optionalePositionen.reduce((sum, pos) => sum + pos.gesamtpreis, 0);
});

// Pre-save hooks
angebotSchema.pre('save', async function(next) {
  try {
    // Generate offer number if not exists
    if (!this.angebotNummer && this.isNew) {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        angebotNummer: new RegExp(`^ANG-${year}-`)
      });
      this.angebotNummer = `ANG-${year}-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate position prices
    let positionNumber = 1;
    this.positionsliste.forEach(position => {
      position.position = positionNumber++;
      position.zwischensumme = position.einzelpreis * position.menge;
      
      if (position.rabatt.prozent > 0) {
        position.rabatt.betrag = position.zwischensumme * (position.rabatt.prozent / 100);
      }
      
      position.gesamtpreis = position.zwischensumme - position.rabatt.betrag;
    });
    
    // Calculate optional positions
    this.optionalePositionen.forEach(position => {
      position.position = positionNumber++;
      position.zwischensumme = position.einzelpreis * position.menge;
      
      if (position.rabatt.prozent > 0) {
        position.rabatt.betrag = position.zwischensumme * (position.rabatt.prozent / 100);
      }
      
      position.gesamtpreis = position.zwischensumme - position.rabatt.betrag;
    });
    
    // Calculate totals
    const nettosumme = this.positionsliste.reduce((sum, pos) => sum + pos.gesamtpreis, 0);
    
    // Apply global discount
    let zwischensumme = nettosumme;
    if (this.preisgestaltung.rabatt.prozent > 0) {
      this.preisgestaltung.rabatt.betrag = nettosumme * (this.preisgestaltung.rabatt.prozent / 100);
      zwischensumme = nettosumme - this.preisgestaltung.rabatt.betrag;
    }
    
    // Calculate tax
    const mwstBetrag = zwischensumme * (this.preisgestaltung.mehrwertsteuer.satz / 100);
    const gesamtbetrag = zwischensumme + mwstBetrag;
    
    // Update pricing
    this.preisgestaltung.nettosumme = nettosumme;
    this.preisgestaltung.zwischensumme = zwischensumme;
    this.preisgestaltung.mehrwertsteuer.betrag = mwstBetrag;
    this.preisgestaltung.gesamtbetrag = gesamtbetrag;
    
    // Update status history
    if (this.isModified('status')) {
      this.statusHistory.push({
        status: this.status,
        datum: Date.now(),
        benutzer: this.bearbeitetVon || this.erstelltVon
      });
      
      // Check if expired
      if (this.gueltigBis < new Date() && this.status === 'Gesendet') {
        this.status = 'Abgelaufen';
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
angebotSchema.methods = {
  // Send offer
  async versenden(methode, empfaenger, userId) {
    this.status = 'Gesendet';
    this.kommunikation.versendetAm = Date.now();
    this.kommunikation.versendetPer = methode;
    this.kommunikation.empfaenger = empfaenger;
    this.statusHistory.push({
      status: 'Gesendet',
      datum: Date.now(),
      benutzer: userId,
      bemerkung: `Versendet per ${methode} an ${empfaenger}`
    });
    
    return await this.save();
  },
  
  // Follow up
  async nachfassen(art, ergebnis, naechsterSchritt, userId) {
    this.kommunikation.nachfassTermine.push({
      datum: Date.now(),
      art,
      erledigt: true,
      ergebnis,
      naechsterSchritt
    });
    
    if (this.status === 'Gesendet') {
      this.status = 'Nachfass';
    }
    
    return await this.save();
  },
  
  // Accept offer
  async akzeptieren(auftragsnummer, userId) {
    this.status = 'Akzeptiert';
    this.konversion.zuAuftrag = true;
    this.konversion.auftragsnummer = auftragsnummer;
    this.konversion.konversionsdatum = Date.now();
    this.statusHistory.push({
      status: 'Akzeptiert',
      datum: Date.now(),
      benutzer: userId
    });
    
    return await this.save();
  },
  
  // Reject offer
  async ablehnen(grund, userId) {
    this.status = 'Abgelehnt';
    this.konversion.ablehnungsgrund = grund;
    this.statusHistory.push({
      status: 'Abgelehnt',
      datum: Date.now(),
      benutzer: userId,
      bemerkung: grund
    });
    
    return await this.save();
  },
  
  // Create new version
  async neueVersion(userId) {
    const neuesAngebot = new this.constructor(this.toObject());
    neuesAngebot._id = mongoose.Types.ObjectId();
    neuesAngebot.version.nummer = this.version.nummer + 1;
    neuesAngebot.version.vorherige = this._id;
    neuesAngebot.status = 'Entwurf';
    neuesAngebot.statusHistory = [{
      status: 'Entwurf',
      datum: Date.now(),
      benutzer: userId,
      bemerkung: `Version ${neuesAngebot.version.nummer} erstellt`
    }];
    
    // Generate new offer number
    delete neuesAngebot.angebotNummer;
    neuesAngebot.isNew = true;
    
    return await neuesAngebot.save();
  },
  
  // Calculate discount
  berechneRabatt(prozent) {
    this.preisgestaltung.rabatt.prozent = prozent;
    return this.save();
  },
  
  // Add position
  async positionHinzufuegen(positionData) {
    this.positionsliste.push(positionData);
    return await this.save();
  },
  
  // Remove position
  async positionEntfernen(positionId) {
    this.positionsliste.pull(positionId);
    return await this.save();
  }
};

// Statics
angebotSchema.statics = {
  // Find active offers
  findActive() {
    return this.find({
      status: { $in: ['Entwurf', 'Prüfung', 'Gesendet', 'Nachfass', 'Verhandlung'] },
      gueltigBis: { $gte: new Date() }
    }).sort({ erstelltAm: -1 });
  },
  
  // Find expired offers
  findExpired() {
    return this.find({
      status: 'Gesendet',
      gueltigBis: { $lt: new Date() }
    });
  },
  
  // Find by customer
  findByKunde(kundeId) {
    return this.find({ kunde: kundeId }).sort({ erstelltAm: -1 });
  },
  
  // Get conversion statistics
  async getConversionStats(dateRange) {
    const query = {};
    if (dateRange) {
      query.erstelltAm = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }
    
    const stats = await this.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAngebote: { $sum: 1 },
          akzeptiert: {
            $sum: { $cond: [{ $eq: ['$status', 'Akzeptiert'] }, 1, 0] }
          },
          abgelehnt: {
            $sum: { $cond: [{ $eq: ['$status', 'Abgelehnt'] }, 1, 0] }
          },
          gesamtwert: { $sum: '$preisgestaltung.gesamtbetrag' },
          konvertierterWert: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Akzeptiert'] },
                '$preisgestaltung.gesamtbetrag',
                0
              ]
            }
          },
          durchschnittswert: { $avg: '$preisgestaltung.gesamtbetrag' }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalAngebote: 0,
        konversionsrate: 0,
        ablehnungsrate: 0,
        gesamtwert: 0,
        konvertierterWert: 0,
        durchschnittswert: 0
      };
    }
    
    const result = stats[0];
    return {
      totalAngebote: result.totalAngebote,
      konversionsrate: (result.akzeptiert / result.totalAngebote * 100).toFixed(2),
      ablehnungsrate: (result.abgelehnt / result.totalAngebote * 100).toFixed(2),
      gesamtwert: result.gesamtwert,
      konvertierterWert: result.konvertierterWert,
      durchschnittswert: result.durchschnittswert
    };
  },
  
  // Clean up expired offers
  async cleanupExpired() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await this.updateMany(
      {
        status: 'Gesendet',
        gueltigBis: { $lt: thirtyDaysAgo }
      },
      {
        $set: { status: 'Abgelaufen' }
      }
    );
    
    return result.modifiedCount;
  }
};

const Angebot = mongoose.model('Angebot', angebotSchema);

module.exports = Angebot;