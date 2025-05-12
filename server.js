// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
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
app.use(helmet()); // Sicherheits-Header
app.use(cors(corsOptions)); // CORS mit Optionen aktivieren
app.use(express.json()); // JSON-Anfragen parsen
app.use(express.urlencoded({ extended: true })); // URL-kodierte Anfragen parsen

// Logging im Entwicklungsmodus
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Statische Dateien bereitstellen
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API-Routen
app.use('/api', routes);


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