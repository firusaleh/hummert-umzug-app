// models/finanzuebersicht.model.js
const mongoose = require('mongoose');

const finanzuebersichtSchema = new mongoose.Schema({
  jahr: {
    type: Number,
    required: true
  },
  monat: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  einnahmen: {
    type: Number,
    default: 0
  },
  ausgaben: {
    type: Number,
    default: 0
  },
  gewinn: {
    type: Number,
    default: 0
  },
  offeneRechnungen: {
    type: Number,
    default: 0
  },
  bezahlteRechnungen: {
    type: Number,
    default: 0
  },
  angeboteGesendet: {
    type: Number,
    default: 0
  },
  angeboteAkzeptiert: {
    type: Number,
    default: 0
  },
  umsatzProKategorie: {
    personal: { type: Number, default: 0 },
    fahrzeuge: { type: Number, default: 0 },
    material: { type: Number, default: 0 },
    unterauftraege: { type: Number, default: 0 },
    sonstiges: { type: Number, default: 0 }
  },
  zuletzt_aktualisiert: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Zusammengesetzer Index für Jahr und Monat, um Duplikate zu vermeiden
finanzuebersichtSchema.index({ jahr: 1, monat: 1 }, { unique: true });

const Finanzuebersicht = mongoose.model('Finanzuebersicht', finanzuebersichtSchema);

module.exports = Finanzuebersicht;