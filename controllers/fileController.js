// controllers/fileController.js
const File = require('../models/file');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
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

// File-Filter für erlaubte Dateitypen
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Ungültiger Dateityp. Nur Bilder, PDFs, DOC, DOCX, XLS, XLSX, TXT und CSV Dateien sind erlaubt.'), false);
  }
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    const { project, task } = req.body;

    const file = new File({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      project,
      task,
      uploadedBy: req.user.id
    });

    await file.save();

    // Wenn es eine Task-bezogene Datei ist, zum Task hinzufügen
    if (task) {
      const Task = require('../models/task');
      await Task.findByIdAndUpdate(
        task,
        { 
          $push: { 
            attachments: {
              fileName: file.fileName,
              filePath: file.filePath,
              fileType: file.fileType
            } 
          } 
        }
      );
    }

    res.status(201).json({
      message: 'Datei erfolgreich hochgeladen',
      file
    });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Hochladen', error: error.message });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { project, task } = req.query;
    
    const filter = {};
    if (project) filter.project = project;
    if (task) filter.task = task;
    
    const files = await File.find(filter)
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'Datei nicht gefunden' });
    }

    // Datei aus dem Dateisystem löschen
    fs.unlink(file.filePath, async (err) => {
      if (err) {
        return res.status(500).json({ message: 'Fehler beim Löschen der Datei', error: err.message });
      }

      // Wenn es eine Task-bezogene Datei ist, aus Task entfernen
      if (file.task) {
        const Task = require('../models/task');
        await Task.findByIdAndUpdate(
          file.task,
          { $pull: { attachments: { fileName: file.fileName } } }
        );
      }

      // Aus der Datenbank löschen
      await File.findByIdAndDelete(req.params.id);

      res.json({ message: 'Datei erfolgreich gelöscht' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  }
};

// Funktion zum Löschen der Beispieldaten
exports.deleteAllExampleData = async (req, res) => {
  try {
    // Prüfen, ob der Benutzer Admin-Rechte hat
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
    }

    // Alle Beispieldaten in den verschiedenen Sammlungen löschen
    await Promise.all([
      Project.deleteMany({ /* Filter für Beispieldaten */ }),
      Client.deleteMany({ /* Filter für Beispieldaten */ }),
      Task.deleteMany({ /* Filter für Beispieldaten */ }),
      File.deleteMany({ /* Filter für Beispieldaten */ })
    ]);

    res.json({ message: 'Alle Beispieldaten wurden erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Löschen der Beispieldaten', error: error.message });
  }
};