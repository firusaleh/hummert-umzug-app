// controllers/upload.controller.js
const Upload = require('../models/upload.model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer-Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nicht unterstütztes Dateiformat'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB Limit
});

// Datei hochladen
exports.uploadDatei = (req, res) => {
  upload.single('datei')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Fehler beim Hochladen: ' + err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }
    
    try {
      const { kategorie, bezugId, bezugModell } = req.body;
      
      // Upload-Eintrag in der Datenbank erstellen
      const uploadEintrag = new Upload({
        originalname: req.file.originalname,
        filename: req.file.filename,
        pfad: `/uploads/${req.file.filename}`,
        mimetype: req.file.mimetype,
        groesse: req.file.size,
        kategorie: kategorie || 'dokument',
        bezugId: bezugId || null,
        bezugModell: bezugModell || 'Dokument',
        hochgeladenVon: req.user.id
      });
      
      await uploadEintrag.save();
      
      res.status(201).json({
        message: 'Datei erfolgreich hochgeladen',
        datei: uploadEintrag
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Uploads:', error);
      // Datei löschen, wenn DB-Eintrag fehlschlägt
      fs.unlinkSync(req.file.path);
      res.status(500).json({ message: 'Serverfehler beim Speichern des Uploads' });
    }
  });
};

// Alle Uploads abrufen
exports.getAllUploads = async (req, res) => {
  try {
    const { kategorie, bezugId, bezugModell } = req.query;
    
    // Filter erstellen
    const filter = {};
    
    if (kategorie) {
      filter.kategorie = kategorie;
    }
    
    if (bezugId) {
      filter.bezugId = bezugId;
    }
    
    if (bezugModell) {
      filter.bezugModell = bezugModell;
    }
    
    const uploads = await Upload.find(filter)
      .populate('hochgeladenVon', 'name')
      .sort({ createdAt: -1 });
    
    res.json(uploads);
  } catch (error) {
    console.error('Fehler beim Abrufen der Uploads:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Uploads' });
  }
};

// Upload nach ID abrufen
exports.getUploadById = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id)
      .populate('hochgeladenVon', 'name');
    
    if (!upload) {
      return res.status(404).json({ message: 'Upload nicht gefunden' });
    }
    
    res.json(upload);
  } catch (error) {
    console.error('Fehler beim Abrufen des Uploads:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Uploads' });
  }
};

// Upload löschen
exports.deleteUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    
    if (!upload) {
      return res.status(404).json({ message: 'Upload nicht gefunden' });
    }
    
    // Prüfen, ob der Benutzer die Berechtigung hat
    if (upload.hochgeladenVon.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unzureichende Berechtigungen' });
    }
    
    // Datei aus dem Dateisystem löschen
    const filePath = path.join(__dirname, '..', upload.pfad);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Aus der Datenbank löschen
    await upload.deleteOne();
    
    res.json({ message: 'Upload erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Uploads:', error);
    res.status(500).json({ message: 'Serverfehler beim Löschen des Uploads' });
  }
};