// models/angebot.model.js
const mongoose = require('mongoose');

const angebotSchema = new mongoose.Schema({
  angebotNummer: {
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
  erstelltAm: {
    type: Date,
    default: Date.now
  },
  gueltigBis: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Entwurf', 'Gesendet', 'Akzeptiert', 'Abgelehnt'],
    default: 'Entwurf'
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
  }]
}, { timestamps: true });

// Vorausfüllen des Gesamtpreises bei Positionen
angebotSchema.pre('save', function(next) {
  this.positionsliste.forEach(position => {
    position.gesamtpreis = position.einzelpreis * position.menge;
  });

  // Berechnung des Gesamtbetrags basierend auf den Positionen
  const nettobetrag = this.positionsliste.reduce((sum, pos) => sum + pos.gesamtpreis, 0);
  const mwst = nettobetrag * (this.mehrwertsteuer / 100);
  this.gesamtbetrag = nettobetrag + mwst;

  next();
});

const Angebot = mongoose.model('Angebot', angebotSchema);

module.exports = Angebot;