// models/aufnahme.fixed.js - Enhanced survey/assessment model with comprehensive validation
const mongoose = require('mongoose');
const validator = require('validator');

// Custom validators
const validators = {
  plz: (value) => {
    return /^[0-9]{5}$/.test(value);
  },
  
  telefon: (value) => {
    if (!value) return true;
    const cleanPhone = value.replace(/[\s\-]/g, '');
    return /^(\+49|0)[1-9][0-9]{1,14}$/.test(cleanPhone);
  },
  
  email: (value) => {
    return !value || validator.isEmail(value);
  },
  
  time: (value) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  },
  
  positiveNumber: (value) => {
    return value >= 0;
  }
};

// Address sub-schema with validation
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
  
  parkplatz: {
    vorhanden: { type: Boolean, default: true },
    typ: {
      type: String,
      enum: ['strassenrand', 'privatparkplatz', 'tiefgarage', 'hof', 'keine'],
      default: 'strassenrand'
    },
    breite: Number,
    hoehe: Number,
    bemerkung: String
  },
  
  zugang: {
    bemerkungen: String,
    hindernisse: [String],
    schluesseluebergabe: String
  }
}, { _id: false });

// Furniture/item sub-schema
const moebelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bezeichnung ist erforderlich'],
    trim: true,
    maxlength: [100, 'Bezeichnung zu lang']
  },
  
  anzahl: {
    type: Number,
    required: [true, 'Anzahl ist erforderlich'],
    min: [1, 'Mindestanzahl ist 1'],
    max: [999, 'Maximalanzahl ist 999'],
    default: 1
  },
  
  kategorie: {
    type: String,
    enum: {
      values: ['schrank', 'tisch', 'stuhl', 'sofa', 'bett', 'karton', 'klavier', 'geraet', 'pflanze', 'sonstiges'],
      message: '{VALUE} ist keine gültige Kategorie'
    },
    default: 'sonstiges'
  },
  
  unterkategorie: {
    type: String,
    maxlength: [50, 'Unterkategorie zu lang']
  },
  
  groesse: {
    laenge: {
      type: Number,
      min: [0, 'Länge kann nicht negativ sein'],
      max: [1000, 'Länge zu groß']
    },
    breite: {
      type: Number,
      min: [0, 'Breite kann nicht negativ sein'],
      max: [1000, 'Breite zu groß']
    },
    hoehe: {
      type: Number,
      min: [0, 'Höhe kann nicht negativ sein'],
      max: [1000, 'Höhe zu groß']
    },
    volumen: {
      type: Number,
      min: [0, 'Volumen kann nicht negativ sein']
    }
  },
  
  gewicht: {
    type: Number,
    min: [0, 'Gewicht kann nicht negativ sein'],
    max: [10000, 'Gewicht zu groß']
  },
  
  eigenschaften: {
    zerbrechlich: {
      type: Boolean,
      default: false
    },
    wertvoll: {
      type: Boolean,
      default: false
    },
    schwer: {
      type: Boolean,
      default: false
    },
    unhandlich: {
      type: Boolean,
      default: false
    }
  },
  
  service: {
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
    transport2mann: {
      type: Boolean,
      default: false
    }
  },
  
  zustand: {
    type: String,
    enum: ['neuwertig', 'gut', 'mittel', 'schlecht'],
    default: 'gut'
  },
  
  besonderheiten: {
    type: String,
    maxlength: [500, 'Besonderheiten zu lang']
  },
  
  bilder: [{
    pfad: String,
    beschreibung: String,
    datum: { type: Date, default: Date.now }
  }],
  
  markierung: {
    nummer: String,
    farbe: String,
    position: String
  }
});

// Room sub-schema
const raumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Raumname ist erforderlich'],
    trim: true,
    maxlength: [50, 'Raumname zu lang']
  },
  
  typ: {
    type: String,
    enum: [
      'wohnzimmer', 'schlafzimmer', 'kinderzimmer', 'kueche', 'bad', 
      'flur', 'keller', 'dachboden', 'garage', 'buero', 'lager', 'sonstiges'
    ],
    default: 'sonstiges'
  },
  
  flaeche: {
    type: Number,
    min: [0, 'Fläche kann nicht negativ sein'],
    max: [1000, 'Fläche zu groß']
  },
  
  hoehe: {
    type: Number,
    min: [1.5, 'Raumhöhe zu niedrig'],
    max: [10, 'Raumhöhe zu hoch'],
    default: 2.5
  },
  
  etage: {
    type: Number,
    min: [-2, 'Ungültige Etage'],
    max: [30, 'Ungültige Etage']
  },
  
  zugang: {
    tuerbreite: Number,
    tuerhoehe: Number,
    engstellen: [String],
    bemerkungen: String
  },
  
  besonderheiten: {
    type: String,
    maxlength: [500, 'Besonderheiten zu lang']
  },
  
  moebel: [moebelSchema],
  
  bilder: [{
    pfad: String,
    beschreibung: String,
    datum: { type: Date, default: Date.now }
  }]
});

// Main Aufnahme schema
const aufnahmeSchema = new mongoose.Schema({
  // Basic information
  referenznummer: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^AUF-\d{6}$/, 'Ungültiges Referenznummer-Format']
  },
  
  datum: {
    type: Date,
    required: [true, 'Datum ist erforderlich'],
    default: Date.now,
    index: true
  },
  
  uhrzeit: {
    type: String,
    required: [true, 'Uhrzeit ist erforderlich'],
    validate: {
      validator: validators.time,
      message: 'Ungültiges Zeitformat (HH:MM)'
    },
    default: '09:00'
  },
  
  // Customer information
  kunde: {
    name: {
      type: String,
      required: [true, 'Kundenname ist erforderlich'],
      trim: true,
      maxlength: [100, 'Kundenname zu lang']
    },
    
    firma: {
      type: String,
      trim: true,
      maxlength: [100, 'Firmenname zu lang']
    },
    
    kontaktperson: {
      type: String,
      trim: true,
      maxlength: [100, 'Kontaktperson zu lang']
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
    
    mobiltelefon: {
      type: String,
      trim: true,
      validate: {
        validator: validators.telefon,
        message: 'Ungültige Mobiltelefonnummer'
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
    
    kundennummer: {
      type: String,
      match: [/^KD-\d{6}$/, 'Ungültiges Kundennummer-Format']
    }
  },
  
  // Move details
  umzugsdetails: {
    typ: {
      type: String,
      enum: {
        values: ['privat', 'gewerbe', 'senioren', 'fernumzug', 'buero', 'international'],
        message: '{VALUE} ist kein gültiger Umzugstyp'
      },
      default: 'privat',
      required: true
    },
    
    geplanteDatum: Date,
    
    flexibilitaet: {
      type: String,
      enum: ['fix', 'flexibel_tage', 'flexibel_wochen'],
      default: 'fix'
    },
    
    prioritaet: {
      type: String,
      enum: ['normal', 'eilig', 'sehr_eilig'],
      default: 'normal'
    },
    
    besonderheiten: {
      type: String,
      maxlength: [1000, 'Besonderheiten zu lang']
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
  
  zwischenlager: {
    benoetigt: { type: Boolean, default: false },
    dauer: Number, // in Tagen
    adresse: adresseSchema
  },
  
  // Rooms and inventory
  raeume: {
    type: [raumSchema],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Mindestens ein Raum muss erfasst werden'
    }
  },
  
  // Calculated values
  zusammenfassung: {
    anzahlRaeume: {
      type: Number,
      min: 0
    },
    anzahlMoebel: {
      type: Number,
      min: 0
    },
    gesamtvolumen: {
      type: Number,
      min: [0, 'Volumen kann nicht negativ sein']
    },
    gesamtgewicht: {
      type: Number,
      min: [0, 'Gewicht kann nicht negativ sein']
    },
    anzahlKartons: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // Personnel
  aufnehmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Aufnehmer ist erforderlich']
  },
  
  mitarbeiter: [{
    mitarbeiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mitarbeiter'
    },
    rolle: {
      type: String,
      enum: ['hauptaufnehmer', 'assistent', 'praktikant'],
      default: 'assistent'
    }
  }],
  
  // Additional services
  zusatzleistungen: {
    packservice: {
      type: Boolean,
      default: false
    },
    montageservice: {
      type: Boolean,
      default: false
    },
    entsorgung: {
      type: Boolean,
      default: false
    },
    reinigung: {
      type: Boolean,
      default: false
    },
    lagerung: {
      type: Boolean,
      default: false
    },
    klaviertransport: {
      type: Boolean,
      default: false
    },
    kueche: {
      abbau: { type: Boolean, default: false },
      aufbau: { type: Boolean, default: false },
      anschluss: { type: Boolean, default: false }
    },
    custom: [{
      beschreibung: String,
      preis: Number
    }]
  },
  
  // Notes and documentation
  notizen: {
    allgemein: {
      type: String,
      maxlength: [2000, 'Notizen zu lang']
    },
    
    intern: {
      type: String,
      maxlength: [2000, 'Interne Notizen zu lang']
    },
    
    warnung: {
      type: String,
      maxlength: [500, 'Warnung zu lang']
    }
  },
  
  bilder: [{
    pfad: {
      type: String,
      required: true
    },
    beschreibung: String,
    kategorie: {
      type: String,
      enum: ['uebersicht', 'detail', 'schaden', 'zugang', 'sonstiges'],
      default: 'sonstiges'
    },
    datum: {
      type: Date,
      default: Date.now
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
    typ: {
      type: String,
      enum: ['liste', 'skizze', 'vereinbarung', 'sonstiges'],
      default: 'sonstiges'
    },
    datum: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Pricing
  kostenschaetzung: {
    arbeitszeit: {
      stunden: Number,
      stundensatz: Number,
      gesamt: Number
    },
    
    fahrzeuge: [{
      typ: String,
      anzahl: Number,
      preis: Number
    }],
    
    material: {
      kartons: { anzahl: Number, preis: Number },
      verpackung: { menge: Number, preis: Number },
      sonstiges: { beschreibung: String, preis: Number }
    },
    
    zusatzleistungen: Number,
    
    netto: Number,
    mwst: { type: Number, default: 19 },
    brutto: Number,
    
    rabatt: {
      prozent: Number,
      betrag: Number,
      grund: String
    }
  },
  
  // Status and workflow
  status: {
    type: String,
    enum: {
      values: ['entwurf', 'aktiv', 'angebot_erstellt', 'angebot_angenommen', 'abgeschlossen', 'abgebrochen'],
      message: '{VALUE} ist kein gültiger Status'
    },
    default: 'entwurf',
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
  
  // Quality and feedback
  qualitaet: {
    vollstaendigkeit: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    genauigkeit: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    
    kundenzufriedenheit: {
      type: Number,
      min: 1,
      max: 5
    },
    
    nachbearbeitung: {
      benoetigt: { type: Boolean, default: false },
      grund: String,
      erledigt: { type: Boolean, default: false }
    }
  },
  
  // Approval workflow
  genehmigung: {
    status: {
      type: String,
      enum: ['ausstehend', 'genehmigt', 'abgelehnt'],
      default: 'ausstehend'
    },
    
    genehmigtVon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    datum: Date,
    
    kommentar: String
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

// Indexes
aufnahmeSchema.index({ referenznummer: 1 });
aufnahmeSchema.index({ datum: -1 });
aufnahmeSchema.index({ status: 1 });
aufnahmeSchema.index({ 'kunde.name': 'text', 'kunde.telefon': 'text' });
aufnahmeSchema.index({ aufnehmer: 1 });

// Virtual properties
aufnahmeSchema.virtual('istVollstaendig').get(function() {
  return this.qualitaet.vollstaendigkeit === 100;
});

aufnahmeSchema.virtual('gesamtvolumen').get(function() {
  return this.zusammenfassung.gesamtvolumen;
});

aufnahmeSchema.virtual('anzahlBilder').get(function() {
  let total = this.bilder.length;
  this.raeume.forEach(raum => {
    total += raum.bilder.length;
    raum.moebel.forEach(moebel => {
      total += moebel.bilder.length;
    });
  });
  return total;
});

// Pre-save hooks
aufnahmeSchema.pre('save', async function(next) {
  try {
    // Generate reference number if not exists
    if (!this.referenznummer && this.isNew) {
      const count = await this.constructor.countDocuments();
      this.referenznummer = `AUF-${String(count + 1).padStart(6, '0')}`;
    }
    
    // Calculate summary values
    let anzahlRaeume = this.raeume.length;
    let anzahlMoebel = 0;
    let gesamtvolumen = 0;
    let gesamtgewicht = 0;
    let anzahlKartons = 0;
    
    this.raeume.forEach(raum => {
      raum.moebel.forEach(moebel => {
        anzahlMoebel += moebel.anzahl;
        
        if (moebel.groesse && moebel.groesse.volumen) {
          gesamtvolumen += moebel.groesse.volumen * moebel.anzahl;
        } else if (moebel.groesse && moebel.groesse.laenge && moebel.groesse.breite && moebel.groesse.hoehe) {
          const volumen = (moebel.groesse.laenge * moebel.groesse.breite * moebel.groesse.hoehe) / 1000000;
          gesamtvolumen += volumen * moebel.anzahl;
        }
        
        if (moebel.gewicht) {
          gesamtgewicht += moebel.gewicht * moebel.anzahl;
        }
        
        if (moebel.kategorie === 'karton') {
          anzahlKartons += moebel.anzahl;
        }
      });
    });
    
    this.zusammenfassung = {
      anzahlRaeume,
      anzahlMoebel,
      gesamtvolumen: Math.round(gesamtvolumen * 100) / 100,
      gesamtgewicht: Math.round(gesamtgewicht * 100) / 100,
      anzahlKartons
    };
    
    // Calculate completeness
    let vollstaendigkeit = 0;
    if (this.kunde.name) vollstaendigkeit += 10;
    if (this.kunde.telefon) vollstaendigkeit += 10;
    if (this.auszugsadresse) vollstaendigkeit += 15;
    if (this.einzugsadresse) vollstaendigkeit += 15;
    if (this.raeume.length > 0) vollstaendigkeit += 20;
    if (anzahlMoebel > 0) vollstaendigkeit += 20;
    if (this.bilder.length > 0) vollstaendigkeit += 5;
    if (this.kostenschaetzung.brutto > 0) vollstaendigkeit += 5;
    
    this.qualitaet.vollstaendigkeit = vollstaendigkeit;
    
    // Calculate pricing if needed
    if (this.kostenschaetzung.netto && !this.kostenschaetzung.brutto) {
      this.kostenschaetzung.brutto = this.kostenschaetzung.netto * (1 + this.kostenschaetzung.mwst / 100);
    }
    
    // Update status history
    if (this.isModified('status')) {
      this.statusHistory.push({
        status: this.status,
        datum: Date.now(),
        benutzer: this.modifiedBy || this.aufnehmer
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
aufnahmeSchema.methods = {
  // Add room
  async addRaum(raumData) {
    this.raeume.push(raumData);
    return await this.save();
  },
  
  // Add furniture to room
  async addMoebelToRaum(raumId, moebelData) {
    const raum = this.raeume.id(raumId);
    if (!raum) {
      throw new Error('Raum nicht gefunden');
    }
    raum.moebel.push(moebelData);
    return await this.save();
  },
  
  // Update status
  async updateStatus(newStatus, userId, bemerkung) {
    this.status = newStatus;
    this.statusHistory.push({
      status: newStatus,
      datum: Date.now(),
      benutzer: userId,
      bemerkung
    });
    return await this.save();
  },
  
  // Generate offer
  async generiereAngebot() {
    if (this.qualitaet.vollstaendigkeit < 80) {
      throw new Error('Aufnahme ist nicht vollständig genug für ein Angebot');
    }
    
    this.status = 'angebot_erstellt';
    this.statusHistory.push({
      status: 'angebot_erstellt',
      datum: Date.now()
    });
    
    return await this.save();
  },
  
  // Approve assessment
  async genehmigen(userId, kommentar) {
    this.genehmigung = {
      status: 'genehmigt',
      genehmigtVon: userId,
      datum: Date.now(),
      kommentar
    };
    return await this.save();
  },
  
  // Calculate price estimation
  calculatePriceEstimation() {
    let arbeitszeit = Math.ceil(this.zusammenfassung.gesamtvolumen / 10) * 2; // 2h pro 10m³
    let arbeitspreis = arbeitszeit * 45; // 45€/h
    
    let fahrzeugpreis = 0;
    if (this.zusammenfassung.gesamtvolumen <= 20) {
      fahrzeugpreis = 150; // 3.5t LKW
    } else if (this.zusammenfassung.gesamtvolumen <= 40) {
      fahrzeugpreis = 250; // 7.5t LKW
    } else {
      fahrzeugpreis = 350; // 12t LKW
    }
    
    let materialpreis = this.zusammenfassung.anzahlKartons * 3; // 3€ pro Karton
    
    let zusatzleistungen = 0;
    if (this.zusatzleistungen.packservice) zusatzleistungen += 200;
    if (this.zusatzleistungen.montageservice) zusatzleistungen += 150;
    if (this.zusatzleistungen.klaviertransport) zusatzleistungen += 300;
    
    const netto = arbeitspreis + fahrzeugpreis + materialpreis + zusatzleistungen;
    const mwst = netto * 0.19;
    const brutto = netto + mwst;
    
    this.kostenschaetzung = {
      arbeitszeit: { stunden: arbeitszeit, stundensatz: 45, gesamt: arbeitspreis },
      fahrzeuge: [{ typ: 'LKW', anzahl: 1, preis: fahrzeugpreis }],
      material: { kartons: { anzahl: this.zusammenfassung.anzahlKartons, preis: materialpreis } },
      zusatzleistungen,
      netto,
      mwst: 19,
      brutto
    };
    
    return this.kostenschaetzung;
  }
};

// Statics
aufnahmeSchema.statics = {
  // Find active assessments
  findActive() {
    return this.find({ status: 'aktiv' }).sort({ datum: -1 });
  },
  
  // Find by customer
  findByKunde(kundenname) {
    return this.find({ 'kunde.name': new RegExp(kundenname, 'i') });
  },
  
  // Find by date range
  findByDateRange(startDate, endDate) {
    return this.find({
      datum: { $gte: startDate, $lte: endDate }
    }).sort({ datum: -1 });
  },
  
  // Find incomplete assessments
  findIncomplete() {
    return this.find({ 'qualitaet.vollstaendigkeit': { $lt: 100 } });
  },
  
  // Get statistics
  async getStatistics(dateRange) {
    const query = {};
    if (dateRange) {
      query.datum = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }
    
    const stats = await this.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAufnahmen: { $sum: 1 },
          durchschnittVolumen: { $avg: '$zusammenfassung.gesamtvolumen' },
          durchschnittPreis: { $avg: '$kostenschaetzung.brutto' },
          statusVerteilung: {
            $push: '$status'
          },
          typVerteilung: {
            $push: '$umzugsdetails.typ'
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalAufnahmen: 0,
        durchschnittVolumen: 0,
        durchschnittPreis: 0,
        statusVerteilung: {},
        typVerteilung: {}
      };
    }
    
    // Calculate distributions
    const statusDist = stats[0].statusVerteilung.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const typDist = stats[0].typVerteilung.reduce((acc, typ) => {
      acc[typ] = (acc[typ] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalAufnahmen: stats[0].totalAufnahmen,
      durchschnittVolumen: Math.round(stats[0].durchschnittVolumen * 100) / 100,
      durchschnittPreis: Math.round(stats[0].durchschnittPreis * 100) / 100,
      statusVerteilung: statusDist,
      typVerteilung: typDist
    };
  }
};

const Aufnahme = mongoose.model('Aufnahme', aufnahmeSchema);

module.exports = Aufnahme;