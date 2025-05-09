// models/benachrichtigung.model.js
const mongoose = require('mongoose');

const benachrichtigungSchema = new mongoose.Schema({
  empfaenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titel: {
    type: String,
    required: true,
    trim: true
  },
  inhalt: {
    type: String,
    required: true
  },
  typ: {
    type: String,
    enum: ['info', 'warnung', 'erinnerung', 'erfolg'],
    default: 'info'
  },
  gelesen: {
    type: Boolean,
    default: false
  },
  linkUrl: String,
  bezug: {
    typ: {
      type: String,
      enum: ['umzug', 'aufnahme', 'mitarbeiter', 'task', 'system'],
      default: 'system'
    },
    id: mongoose.Schema.Types.ObjectId
  },
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const Benachrichtigung = mongoose.model('Benachrichtigung', benachrichtigungSchema);

module.exports = Benachrichtigung;