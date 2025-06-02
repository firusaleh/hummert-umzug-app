const mongoose = require('mongoose');

const umzugSchema = new mongoose.Schema({
  kundenname: {
    type: String,
    required: true
  },
  datum: {
    type: Date,
    required: true
  },
  vonAdresse: {
    strasse: { type: String, required: true },
    plz: { type: String, required: true },
    ort: { type: String, required: true }
  },
  nachAdresse: {
    strasse: { type: String, required: true },
    plz: { type: String, required: true },
    ort: { type: String, required: true }
  },
  telefon: {
    type: String,
    required: true
  },
  email: String,
  status: {
    type: String,
    enum: ['geplant', 'bestaetigt', 'in_durchfuehrung', 'abgeschlossen', 'storniert'],
    default: 'geplant'
  },
  mitarbeiter: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mitarbeiter'
  }],
  notizen: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Umzug', umzugSchema);