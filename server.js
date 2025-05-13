// server.js
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
  origin: config.corsOrigin,
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

// Statische Dateien für Uploads bereitstellen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API-Routen
app.use('/api', routes);

// Frontend-Build-Dateien bereitstellen
// Basierend auf dem Render.com-Screenshot ist das Build-Verzeichnis einfach 'build'
const buildPath = path.join(__dirname, 'build');

// Debugging-Info in die Logs schreiben
console.log('Server-Verzeichnis (__dirname):', __dirname);
console.log('Build-Pfad:', buildPath);
console.log('Build-Verzeichnis existiert:', fs.existsSync(buildPath));
if (fs.existsSync(buildPath)) {
  try {
    console.log('Build-Verzeichnisinhalt:', fs.readdirSync(buildPath));
    console.log('index.html existiert:', fs.existsSync(path.join(buildPath, 'index.html')));
  } catch (err) {
    console.error('Fehler beim Lesen des Build-Verzeichnisses:', err);
  }
}

// Statische Dateien bereitstellen
app.use(express.static(buildPath));

// Alle anderen GET-Anfragen an die React-App weiterleiten
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Globaler Fehlerhandler
app.use(errorHandler);

// MongoDB-Verbindung herstellen
mongoose
  .connect(process.env.MONGODB_URI || config.mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
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