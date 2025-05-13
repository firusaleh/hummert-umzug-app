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

// Frontend routing nur anwenden, wenn keine API-Route getroffen wurde
app.use('/api', (req, res) => {
  res.status(404).json({ message: "API-Endpunkt nicht gefunden" });
});

// Nur für Render.com-spezifische Pfade überprüfen
const possibleBuildPaths = [
  path.join(__dirname, 'build'),
  path.join(__dirname, 'frontend/build'),
  path.join(__dirname, '../build'),
  path.join(__dirname, '../frontend/build'),
  path.join(process.cwd(), 'build'),
  path.join(process.cwd(), 'frontend/build'),
  '/opt/render/project/src/build',
  '/opt/render/project/src/frontend/build'
];

// Speichern der gefundenen Build-Pfade
const validBuildPaths = [];

// Überprüfen aller möglichen Pfade
possibleBuildPaths.forEach(buildPath => {
  console.log(`Überprüfe Build-Pfad: ${buildPath}`);
  if (fs.existsSync(buildPath)) {
    console.log(`Build-Verzeichnis gefunden: ${buildPath}`);
    if (fs.existsSync(path.join(buildPath, 'index.html'))) {
      console.log(`index.html gefunden in: ${buildPath}`);
      validBuildPaths.push(buildPath);
    } else {
      console.log(`index.html NICHT gefunden in: ${buildPath}`);
      try {
        console.log(`Inhalt von ${buildPath}:`, fs.readdirSync(buildPath));
      } catch (err) {
        console.log(`Fehler beim Lesen von ${buildPath}:`, err.message);
      }
    }
  }
});

// Routing für Frontend
if (validBuildPaths.length > 0) {
  // Verwende den ersten gefundenen Pfad
  const buildPath = validBuildPaths[0];
  console.log(`Verwende Build-Pfad: ${buildPath}`);
  
  // Statische Dateien bereitstellen
  app.use(express.static(buildPath));
  
  // Alle anderen GET-Anfragen an die React-App weiterleiten
  app.get('*', (req, res) => {
    console.log(`Weiterleitung zu index.html für Pfad: ${req.path}`);
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('ACHTUNG: Kein gültiges Build-Verzeichnis gefunden!');
  
  // Alle nicht-API-Anfragen mit einer Fehlermeldung beantworten
  app.get('*', (req, res) => {
    res.status(404).send(`
      <html>
        <head>
          <title>Frontend nicht gefunden</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            h1 { color: #e74c3c; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Frontend-Build nicht gefunden</h1>
          <p>Das Frontend-Build-Verzeichnis konnte nicht gefunden werden.</p>
          <p>Bitte stellen Sie sicher, dass der Build-Prozess korrekt ausgeführt wurde und die Dateien am richtigen Ort sind.</p>
          <h2>Debugging-Informationen:</h2>
          <pre>
Server-Verzeichnis: ${__dirname}
Arbeittsverzeichnis: ${process.cwd()}
Überprüfte Pfade: ${possibleBuildPaths.join('\n')}
          </pre>
        </body>
      </html>
    `);
  });
}

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