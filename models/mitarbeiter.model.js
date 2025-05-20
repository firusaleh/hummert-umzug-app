// models/mitarbeiter.model.js
const mongoose = require('mongoose');

const arbeitszeitSchema = new mongoose.Schema({
  datum: {
    type: Date,
    required: true
  },
  startzeit: {
    type: String,  // Changed to String to handle time format "HH:mm"
    required: true
  },
  endzeit: {
    type: String,  // Changed to String to handle time format "HH:mm"
    required: true
  },
  pausen: [{
    start: String,
    ende: String
  }],
  notizen: String,
  berechneteStunden: {
    type: Number,
    default: 0
  }
});

const mitarbeiterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vorname: {
    type: String,
    required: true,
    trim: true
  },
  nachname: {
    type: String,
    required: true,
    trim: true
  },
  telefon: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  adresse: {
    strasse: String,
    hausnummer: String,
    plz: String,
    ort: String
  },
  position: {
    type: String,
    trim: true,
    enum: ['Geschäftsführer', 'Teamleiter', 'Träger', 'Fahrer', 'Praktikant', 'Verkäufer', 'Verwaltung']
  },
  abteilung: {
    type: String,
    trim: true,
    enum: ['Umzüge', 'Verwaltung', 'Verkauf', 'Lager', 'Fuhrpark']
  },
  einstellungsdatum: {
    type: Date
  },
  gehalt: {
    brutto: Number,
    netto: Number,
    stundensatz: Number
  },
  arbeitszeiten: [arbeitszeitSchema],
  faehigkeiten: [String],
  fuehrerscheinklassen: [String],
  notizen: String,
  notfallkontakt: {
    name: String,
    telefon: String,
    beziehung: String
  },
  bankverbindung: {
    kontoinhaber: String,
    iban: String,
    bic: String,
    bank: String
  },
  dokumente: [{
    name: String,
    pfad: String,
    datum: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Pre-save middleware to calculate hours for arbeitszeiten
mitarbeiterSchema.pre('save', function(next) {
  if (this.isModified('arbeitszeiten')) {
    this.arbeitszeiten.forEach(arbeitszeit => {
      if (arbeitszeit.startzeit && arbeitszeit.endzeit) {
        // Parse time strings (HH:mm format)
        const [startHour, startMinute] = arbeitszeit.startzeit.split(':').map(Number);
        const [endHour, endMinute] = arbeitszeit.endzeit.split(':').map(Number);
        
        // Calculate total minutes
        let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        
        // Subtract pause minutes
        if (arbeitszeit.pausen && arbeitszeit.pausen.length > 0) {
          arbeitszeit.pausen.forEach(pause => {
            if (pause.start && pause.ende) {
              const [pauseStartHour, pauseStartMinute] = pause.start.split(':').map(Number);
              const [pauseEndHour, pauseEndMinute] = pause.ende.split(':').map(Number);
              totalMinutes -= ((pauseEndHour * 60 + pauseEndMinute) - (pauseStartHour * 60 + pauseStartMinute));
            }
          });
        }
        
        // Convert to hours
        arbeitszeit.berechneteStunden = totalMinutes / 60;
      }
    });
  }
  next();
});

const Mitarbeiter = mongoose.model('Mitarbeiter', mitarbeiterSchema);

module.exports = Mitarbeiter;