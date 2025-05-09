// models/upload.model.js
const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  originalname: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  pfad: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  groesse: {
    type: Number,
    required: true
  },
  kategorie: {
    type: String,
    enum: ['umzug', 'aufnahme', 'mitarbeiter', 'kunde', 'dokument', 'bild'],
    default: 'dokument'
  },
  bezugId: {
    type: mongoose.Schema.Types.ObjectId
  },
  bezugModell: {
    type: String,
    enum: ['Umzug', 'Aufnahme', 'Mitarbeiter', 'User'],
    required: true
  },
  hochgeladenVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const Upload = mongoose.model('Upload', uploadSchema);

module.exports = Upload;