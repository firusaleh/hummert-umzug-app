// models/rechnung.model.js
const mongoose = require('mongoose');

const rechnungSchema = new mongoose.Schema({
  rechnungNummer: {
    type: String,
    required: true,
    unique: true
  },
  kunde: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  umzug: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Umzug'
  },
  angebot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Angebot'
  },
  ausstellungsdatum: {
    type: Date,
    default: Date.now,
    required: true
  },
  faelligkeitsdatum: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Entwurf', 'Gesendet', 'Überfällig', 'Teilbezahlt', 'Bezahlt', 'Storniert'],
    default: 'Entwurf'
  },
  bezahltAm: {
    type: Date
  },
  zahlungsmethode: {
    type: String,
    enum: ['Überweisung', 'Bar', 'PayPal', 'Kreditkarte', 'Lastschrift', 'Sonstige'],
    default: 'Überweisung'
  },
  gesamtbetrag: {
    type: Number,
    required: true
  },
  mehrwertsteuer: {
    type: Number,
    required: true,
    default: 19
  },
  positionsliste: [{
    bezeichnung: {
      type: String,
      required: true
    },
    menge: {
      type: Number,
      required: true,
      default: 1
    },
    einheit: {
      type: String,
      default: 'Stück'
    },
    einzelpreis: {
      type: Number,
      required: true
    },
    gesamtpreis: {
      type: Number,
      required: true
    }
  }],
  notizen: {
    type: String
  },
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateien: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  zahlungserinnerungen: [{
    datum: {
      type: Date,
      default: Date.now
    },
    notiz: String
  }]
}, { timestamps: true });

// Vorausfüllen des Gesamtpreises bei Positionen
rechnungSchema.pre('save', function(next) {
  this.positionsliste.forEach(position => {
    position.gesamtpreis = position.einzelpreis * position.menge;
  });

  // Berechnung des Gesamtbetrags basierend auf den Positionen
  const nettobetrag = this.positionsliste.reduce((sum, pos) => sum + pos.gesamtpreis, 0);
  const mwst = nettobetrag * (this.mehrwertsteuer / 100);
  this.gesamtbetrag = nettobetrag + mwst;

  next();
});

const Rechnung = mongoose.model('Rechnung', rechnungSchema);

module.exports = Rechnung;
