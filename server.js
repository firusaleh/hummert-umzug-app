// Aktualisierte server.js mit korrekter CORS-Konfiguration für lagerlogix.de

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error.middleware');

// Umgebungsvariablen laden
dotenv.config();

// Config für CORS-Optionen laden
const config = require('./config/config');
const corsOptions = {
  // Erlaubt Anfragen von der benutzerdefinierten Domain und Entwicklungsumgebung
  origin: ['https://www.lagerlogix.de', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 Stunden
};

// Express App erstellen
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // CSP deaktivieren
})); 
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging im Entwicklungsmodus
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Debugging-Info zum Server-Umfeld
console.log('Server-Verzeichnis (__dirname):', __dirname);
console.log('Prozess-Arbeitsverzeichnis:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

// Verzeichnisstruktur anzeigen für Debugging
function listDirectory(dir) {
  try {
    console.log(`Inhalt von ${dir}:`, fs.readdirSync(dir));
    return true;
  } catch (err) {
    console.log(`Konnte Verzeichnis ${dir} nicht lesen:`, err.message);
    return false;
  }
}

// Verzeichnisstruktur ausgeben
listDirectory(__dirname);
listDirectory(process.cwd());
listDirectory('/opt/render/project');
listDirectory('/opt/render/project/src');

// Statische Dateien für Uploads bereitstellen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API-Routen
app.use('/api', routes);

// API-404-Handler 
app.use('/api', (req, res) => {
  res.status(404).json({ message: "API-Endpunkt nicht gefunden" });
});

// Bei separatem Frontend-Deployment: Wir servieren das Frontend nicht mehr vom Backend
// Stattdessen leiten wir alle anderen Anfragen mit einem API-Hinweis weiter
app.use('*', (req, res) => {
  res.status(404).json({
    message: "Dies ist der Backend-Server. Das Frontend ist unter https://www.lagerlogix.de verfügbar.", 
    api_info: "API-Endpunkte sind unter /api verfügbar."
  });
});

// Globaler Fehlerhandler
app.use(errorHandler);

// MongoDB-Verbindung herstellen
mongoose
  .connect(process.env.MONGODB_URI || config.mongoUri)
  .then(() => {
    console.log('MongoDB-Verbindung erfolgreich hergestellt');
    
    // Server starten
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server läuft im ${process.env.NODE_ENV}-Modus auf Port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB-Verbindungsfehler:', err.message);
    process.exit(1);
  });