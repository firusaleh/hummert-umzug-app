// models/mitarbeiter.fixed.js - Enhanced employee model with comprehensive validation
const mongoose = require('mongoose');
const validator = require('validator');

// Custom validators
const validators = {
  telefon: (value) => {
    if (!value) return true;
    const cleanPhone = value.replace(/[\s\-]/g, '');
    return /^(\+49|0)[1-9][0-9]{1,14}$/.test(cleanPhone);
  },
  
  plz: (value) => {
    if (!value) return true;
    return /^[0-9]{5}$/.test(value);
  },
  
  fuehrerschein: (value) => {
    const validClasses = ['AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'L', 'T'];
    return validClasses.includes(value);
  },
  
  arbeitszeit: (endzeit) => {
    return endzeit > this.startzeit;
  },
  
  pausezeit: function() {
    const pausenGesamt = this.pausen.reduce((total, pause) => {
      return total + (pause.ende - pause.start);
    }, 0);
    const arbeitszeit = this.endzeit - this.startzeit;
    return pausenGesamt < arbeitszeit;
  }
};

// Break/pause sub-schema
const pauseSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: [true, 'Pausenstart ist erforderlich']
  },
  
  ende: {
    type: Date,
    required: [true, 'Pausenende ist erforderlich'],
    validate: {
      validator: function(value) {
        return value > this.start;
      },
      message: 'Pausenende muss nach Pausenstart liegen'
    }
  },
  
  typ: {
    type: String,
    enum: ['mittagspause', 'kaffeepause', 'ruhepause', 'sonstige'],
    default: 'sonstige'
  }
}, { _id: false });

// Working hours sub-schema
const arbeitszeitSchema = new mongoose.Schema({
  datum: {
    type: Date,
    required: [true, 'Datum ist erforderlich'],
    index: true
  },
  
  startzeit: {
    type: Date,
    required: [true, 'Startzeit ist erforderlich']
  },
  
  endzeit: {
    type: Date,
    required: [true, 'Endzeit ist erforderlich'],
    validate: {
      validator: validators.arbeitszeit,
      message: 'Endzeit muss nach Startzeit liegen'
    }
  },
  
  pausen: {
    type: [pauseSchema],
    validate: {
      validator: function(v) {
        // Check that pauses don't overlap
        for (let i = 0; i < v.length - 1; i++) {
          for (let j = i + 1; j < v.length; j++) {
            if (v[i].start < v[j].ende && v[j].start < v[i].ende) {
              return false;
            }
          }
        }
        return true;
      },
      message: 'Pausen dürfen sich nicht überschneiden'
    }
  },
  
  // Calculated fields
  arbeitsstundenBrutto: {
    type: Number,
    default: 0
  },
  
  pausenzeit: {
    type: Number,
    default: 0
  },
  
  arbeitsstundenNetto: {
    type: Number,
    default: 0
  },
  
  ueberstunden: {
    type: Number,
    default: 0
  },
  
  // Additional information
  projekt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug'
  },
  
  taetigkeit: {
    type: String,
    maxlength: [500, 'Tätigkeitsbeschreibung zu lang']
  },
  
  notizen: {
    type: String,
    maxlength: [1000, 'Notizen zu lang']
  },
  
  genehmigt: {
    type: Boolean,
    default: false
  },
  
  genehmigtVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  genehmigtAm: Date
});

// Calculate working hours before saving
arbeitszeitSchema.pre('save', function(next) {
  // Calculate gross working hours
  this.arbeitsstundenBrutto = (this.endzeit - this.startzeit) / (1000 * 60 * 60);
  
  // Calculate pause time
  this.pausenzeit = this.pausen.reduce((total, pause) => {
    return total + (pause.ende - pause.start) / (1000 * 60 * 60);
  }, 0);
  
  // Calculate net working hours
  this.arbeitsstundenNetto = this.arbeitsstundenBrutto - this.pausenzeit;
  
  // Calculate overtime (assuming 8 hours is standard)
  this.ueberstunden = Math.max(0, this.arbeitsstundenNetto - 8);
  
  next();
});

// Certificate/qualification sub-schema
const zertifikatSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: [true, 'Bezeichnung ist erforderlich'],
    maxlength: [100, 'Bezeichnung zu lang']
  },
  
  ausstellungsdatum: {
    type: Date,
    required: true
  },
  
  ablaufdatum: Date,
  
  aussteller: {
    type: String,
    maxlength: [100, 'Aussteller zu lang']
  },
  
  dokumentPfad: String
});

// Main employee schema
const mitarbeiterSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Benutzer-ID ist erforderlich'],
    unique: true
  },
  
  // Personal information
  vorname: {
    type: String,
    required: [true, 'Vorname ist erforderlich'],
    trim: true,
    maxlength: [50, 'Vorname zu lang']
  },
  
  nachname: {
    type: String,
    required: [true, 'Nachname ist erforderlich'],
    trim: true,
    maxlength: [50, 'Nachname zu lang']
  },
  
  geburtsdatum: {
    type: Date,
    validate: {
      validator: function(value) {
        const age = Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24 * 365));
        return age >= 16 && age <= 70;
      },
      message: 'Mitarbeiter muss zwischen 16 und 70 Jahre alt sein'
    }
  },
  
  geschlecht: {
    type: String,
    enum: ['maennlich', 'weiblich', 'divers'],
    required: false
  },
  
  telefon: {
    type: String,
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
  
  notfallkontakt: {
    name: {
      type: String,
      maxlength: [100, 'Name zu lang']
    },
    beziehung: {
      type: String,
      maxlength: [50, 'Beziehung zu lang']
    },
    telefon: {
      type: String,
      validate: {
        validator: validators.telefon,
        message: 'Ungültige Notfalltelefonnummer'
      }
    }
  },
  
  // Address
  adresse: {
    strasse: {
      type: String,
      maxlength: [100, 'Straße zu lang']
    },
    hausnummer: {
      type: String,
      maxlength: [10, 'Hausnummer zu lang']
    },
    plz: {
      type: String,
      validate: {
        validator: validators.plz,
        message: 'Ungültige Postleitzahl'
      }
    },
    ort: {
      type: String,
      maxlength: [100, 'Ort zu lang']
    },
    land: {
      type: String,
      default: 'Deutschland',
      maxlength: [50, 'Land zu lang']
    }
  },
  
  // Employment information
  position: {
    type: String,
    enum: ['fahrer', 'beifahrer', 'packer', 'vorarbeiter', 'disponent', 'verwaltung', 'geschaeftsfuehrung'],
    required: [true, 'Position ist erforderlich']
  },
  
  abteilung: {
    type: String,
    enum: ['umzug', 'lager', 'verwaltung', 'fuhrpark', 'vertrieb'],
    default: 'umzug'
  },
  
  einstellungsdatum: {
    type: Date,
    required: [true, 'Einstellungsdatum ist erforderlich'],
    validate: {
      validator: function(value) {
        return value <= Date.now();
      },
      message: 'Einstellungsdatum kann nicht in der Zukunft liegen'
    }
  },
  
  austritt: {
    datum: Date,
    grund: {
      type: String,
      enum: ['kuendigung_mitarbeiter', 'kuendigung_arbeitgeber', 'rente', 'befristet', 'sonstiges']
    },
    bemerkung: String
  },
  
  // Contract details
  vertragsart: {
    type: String,
    enum: ['unbefristet', 'befristet', 'minijob', 'werkstudent', 'praktikum', 'azubi'],
    default: 'unbefristet'
  },
  
  arbeitszeit: {
    wochenstunden: {
      type: Number,
      min: [0, 'Ungültige Wochenstunden'],
      max: [60, 'Zu viele Wochenstunden']
    },
    
    urlaubstage: {
      type: Number,
      min: [0, 'Ungültige Urlaubstage'],
      max: [40, 'Zu viele Urlaubstage'],
      default: 28
    },
    
    ueberstundenKonto: {
      type: Number,
      default: 0
    }
  },
  
  // Salary information
  gehalt: {
    stundenlohn: {
      type: Number,
      min: [0, 'Ungültiger Stundenlohn']
    },
    
    monatsgehalt: {
      type: Number,
      min: [0, 'Ungültiges Monatsgehalt']
    },
    
    steuerklasse: {
      type: String,
      enum: ['1', '2', '3', '4', '5', '6']
    },
    
    sozialversicherungsnummer: {
      type: String,
      match: [/^[0-9]{2}[0-9]{6}[A-Z][0-9]{3}$/, 'Ungültige Sozialversicherungsnummer']
    }
  },
  
  // Working hours tracking
  arbeitszeiten: [arbeitszeitSchema],
  
  // Skills and qualifications
  faehigkeiten: {
    type: [String],
    enum: ['packen', 'tragen', 'fahren', 'montieren', 'elektrik', 'sanitaer', 'schreiner', 'organisation', 'kundenkontakt'],
    default: []
  },
  
  fuehrerscheinklassen: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.every(klasse => validators.fuehrerschein(klasse));
      },
      message: 'Ungültige Führerscheinklasse'
    },
    default: []
  },
  
  zertifikate: [zertifikatSchema],
  
  sprachen: [{
    sprache: {
      type: String,
      required: true
    },
    niveau: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'muttersprachlich'],
      required: true
    }
  }],
  
  // Documents
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
      enum: ['arbeitsvertrag', 'zeugnis', 'fuehrerschein', 'zertifikat', 'sonstiges'],
      default: 'sonstiges'
    },
    datum: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  verfuegbarkeit: {
    status: {
      type: String,
      enum: ['verfuegbar', 'im_einsatz', 'krank', 'urlaub', 'pause'],
      default: 'verfuegbar'
    },
    
    bisWann: Date,
    
    bemerkung: String
  },
  
  // Notes and history
  notizen: {
    type: String,
    maxlength: [2000, 'Notizen zu lang']
  },
  
  bewertung: {
    punktzahl: {
      type: Number,
      min: [1, 'Mindestbewertung ist 1'],
      max: [5, 'Maximalbewertung ist 5']
    },
    
    kommentar: String,
    
    bewertungen: [{
      datum: Date,
      bewerter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      punktzahl: {
        type: Number,
        min: 1,
        max: 5
      },
      kommentar: String
    }]
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // Don't expose sensitive information
      delete ret.gehalt.sozialversicherungsnummer;
      return ret;
    }
  }
});

// Indexes
mitarbeiterSchema.index({ userId: 1 });
mitarbeiterSchema.index({ nachname: 1, vorname: 1 });
mitarbeiterSchema.index({ position: 1, isActive: 1 });
mitarbeiterSchema.index({ 'verfuegbarkeit.status': 1 });
mitarbeiterSchema.index({ einstellungsdatum: 1 });

// Virtual properties
mitarbeiterSchema.virtual('vollname').get(function() {
  return `${this.vorname} ${this.nachname}`;
});

mitarbeiterSchema.virtual('alter').get(function() {
  if (!this.geburtsdatum) return null;
  const ageDifMs = Date.now() - this.geburtsdatum.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

mitarbeiterSchema.virtual('dienstjahre').get(function() {
  if (!this.einstellungsdatum) return 0;
  const yearsDifMs = Date.now() - this.einstellungsdatum.getTime();
  const yearsDate = new Date(yearsDifMs);
  return Math.abs(yearsDate.getUTCFullYear() - 1970);
});

mitarbeiterSchema.virtual('anwesend').get(function() {
  return this.verfuegbarkeit.status === 'verfuegbar' || this.verfuegbarkeit.status === 'im_einsatz';
});

// Methods
mitarbeiterSchema.methods = {
  // Calculate total working hours for a period
  getArbeitszeitForPeriod(startDate, endDate) {
    const relevantZeiten = this.arbeitszeiten.filter(az => {
      return az.datum >= startDate && az.datum <= endDate;
    });
    
    return relevantZeiten.reduce((total, az) => {
      return total + az.arbeitsstundenNetto;
    }, 0);
  },
  
  // Add working hours
  async addArbeitszeit(arbeitszeitData) {
    this.arbeitszeiten.push(arbeitszeitData);
    return await this.save();
  },
  
  // Update availability
  async updateVerfuegbarkeit(status, bisWann, bemerkung) {
    this.verfuegbarkeit = {
      status,
      bisWann,
      bemerkung
    };
    return await this.save();
  },
  
  // Add evaluation
  async addBewertung(bewerterId, punktzahl, kommentar) {
    this.bewertung.bewertungen.push({
      datum: Date.now(),
      bewerter: bewerterId,
      punktzahl,
      kommentar
    });
    
    // Calculate average
    const total = this.bewertung.bewertungen.reduce((sum, b) => sum + b.punktzahl, 0);
    this.bewertung.punktzahl = total / this.bewertung.bewertungen.length;
    
    return await this.save();
  },
  
  // Calculate vacation days left
  getUrlaubsrestForYear(year) {
    const jahresUrlaub = this.arbeitszeit.urlaubstage;
    const genommeneTage = this.arbeitszeiten.filter(az => {
      const azYear = az.datum.getFullYear();
      return azYear === year && az.taetigkeit === 'Urlaub';
    }).length;
    
    return jahresUrlaub - genommeneTage;
  },
  
  // Deactivate employee
  async deactivate(austrittsdatum, grund, bemerkung) {
    this.isActive = false;
    this.austritt = {
      datum: austrittsdatum || Date.now(),
      grund,
      bemerkung
    };
    return await this.save();
  },
  
  // Reactivate employee
  async reactivate() {
    this.isActive = true;
    this.austritt = null;
    return await this.save();
  }
};

// Statics
mitarbeiterSchema.statics = {
  // Find active employees
  findActive() {
    return this.find({ isActive: true });
  },
  
  // Find available employees
  findAvailable() {
    return this.find({
      isActive: true,
      'verfuegbarkeit.status': 'verfuegbar'
    });
  },
  
  // Find employees by position
  findByPosition(position) {
    return this.find({
      position,
      isActive: true
    });
  },
  
  // Find employees with specific skill
  findBySkill(skill) {
    return this.find({
      faehigkeiten: skill,
      isActive: true
    });
  },
  
  // Find employees with specific license
  findByFuehrerschein(klasse) {
    return this.find({
      fuehrerscheinklassen: klasse,
      isActive: true
    });
  },
  
  // Get employee statistics
  async getStatistics() {
    const stats = await this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          byPosition: {
            $push: '$position'
          },
          byDepartment: {
            $push: '$abteilung'
          },
          averageAge: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$geburtsdatum'] },
                365 * 24 * 60 * 60 * 1000
              ]
            }
          },
          averageServiceYears: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$einstellungsdatum'] },
                365 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalEmployees: 0,
        positionDistribution: {},
        departmentDistribution: {},
        averageAge: 0,
        averageServiceYears: 0
      };
    }
    
    // Calculate distributions
    const positionDist = stats[0].byPosition.reduce((acc, pos) => {
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {});
    
    const deptDist = stats[0].byDepartment.reduce((acc, dept) => {
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalEmployees: stats[0].totalEmployees,
      positionDistribution: positionDist,
      departmentDistribution: deptDist,
      averageAge: Math.round(stats[0].averageAge),
      averageServiceYears: Math.round(stats[0].averageServiceYears)
    };
  }
};

const Mitarbeiter = mongoose.model('Mitarbeiter', mitarbeiterSchema);

module.exports = Mitarbeiter;