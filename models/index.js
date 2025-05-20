// models/index.js
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

// Importiere das User-Modell direkt
const User = require('./user');

const db = {};

db.mongoose = mongoose;

// Benutzer und Authentifizierung
db.user = User;
// Exportiere User auch direkt, um destrukturierte Imports zu ermöglichen
db.User = User; 

// Kunden- und Projektmanagement
db.client = require('./client');
db.project = require('./project');
db.task = require('./task');

// Dateiverwaltung
db.file = require('./file');
db.upload = require('./upload.model');

// Umzugsverwaltung
db.umzug = require('./umzug.model');
db.aufnahme = require('./aufnahme.model');
db.fahrzeug = require('./fahrzeug.model');

// Mitarbeiterverwaltung
db.mitarbeiter = require('./mitarbeiter.model');
db.zeiterfassung = require('./zeiterfassung.model');

// Benachrichtigungen
db.benachrichtigung = require('./benachrichtigung.model');

// Finanzverwaltung
db.angebot = require('./angebot.model');
db.rechnung = require('./rechnung.model');
db.projektkosten = require('./projektkosten.model');
db.finanzuebersicht = require('./finanzuebersicht.model');

module.exports = db;