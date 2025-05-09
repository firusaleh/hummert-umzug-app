// controllers/umzug.controller.js
const Umzug = require('../models/umzug.model');
const Aufnahme = require('../models/aufnahme.model');
const Benachrichtigung = require('../models/benachrichtigung.model');
const { validationResult } = require('express-validator');

// Alle Umzüge abrufen
exports.getAllUmzuege = async (req, res) => {
  try {
    const { status, startDatum, endDatum } = req.query;
    
    // Filter erstellen
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (startDatum || endDatum) {
      filter.startDatum = {};
      if (startDatum) {
        filter.startDatum.$gte = new Date(startDatum);
      }
      if (endDatum) {
        filter.endDatum = filter.endDatum || {};
        filter.endDatum.$lte = new Date(endDatum);
      }
    }
    
    const umzuege = await Umzug.find(filter)
      .populate('mitarbeiter.mitarbeiterId', 'vorname nachname')
      .populate('aufnahmeId')
      .sort({ startDatum: 1 });
    
    res.json(umzuege);
  } catch (error) {
    console.error('Fehler beim Abrufen der Umzüge:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Umzüge' });
  }
};

// Einen Umzug nach ID abrufen
exports.getUmzugById = async (req, res) => {
  try {
    const umzug = await Umzug.findById(req.params.id)
      .populate('mitarbeiter.mitarbeiterId', 'vorname nachname telefon')
      .populate('aufnahmeId');
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }
    
    res.json(umzug);
  } catch (error) {
    console.error('Fehler beim Abrufen des Umzugs:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Umzugs' });
  }
};

// Neuen Umzug erstellen
exports.createUmzug = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      kundennummer, auftraggeber, kontakte, auszugsadresse, 
      einzugsadresse, zwischenstopps, startDatum, endDatum, 
      status, preis, aufnahmeId, fahrzeuge, mitarbeiter
    } = req.body;

    // Wenn aufnahmeId vorhanden, prüfen, ob die Aufnahme existiert
    if (aufnahmeId) {
      const aufnahme = await Aufnahme.findById(aufnahmeId);
      if (!aufnahme) {
        return res.status(400).json({ message: 'Aufnahme existiert nicht' });
      }
    }

    // Neuen Umzug erstellen
    const umzug = new Umzug({
      kundennummer,
      auftraggeber,
      kontakte,
      auszugsadresse,
      einzugsadresse,
      zwischenstopps: zwischenstopps || [],
      startDatum,
      endDatum,
      status: status || 'angefragt',
      preis,
      aufnahmeId,
      fahrzeuge: fahrzeuge || [],
      mitarbeiter: mitarbeiter || []
    });

    await umzug.save();

    res.status(201).json({
      message: 'Umzug erfolgreich erstellt',
      umzug
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Umzugs:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Umzugs' });
  }
};

// Umzug aktualisieren
exports.updateUmzug = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Umzug finden
    const umzug = await Umzug.findById(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }

    // Alle Felder aktualisieren, die im Request enthalten sind
    const updateFields = [
      'kundennummer', 'auftraggeber', 'kontakte', 'auszugsadresse',
      'einzugsadresse', 'zwischenstopps', 'startDatum', 'endDatum',
      'status', 'preis', 'aufnahmeId', 'fahrzeuge', 'mitarbeiter'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        umzug[field] = req.body[field];
      }
    });

    await umzug.save();

    res.json({
      message: 'Umzug erfolgreich aktualisiert',
      umzug
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Umzugs:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Umzugs' });
  }
};

// Task hinzufügen
exports.addTask = async (req, res) => {
  try {
    const { beschreibung, faelligkeit, prioritaet, zugewiesen } = req.body;

    // Umzug finden
    const umzug = await Umzug.findById(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }

    // Neuen Task hinzufügen
    const newTask = {
      beschreibung,
      erledigt: false,
      faelligkeit: faelligkeit ? new Date(faelligkeit) : undefined,
      prioritaet: prioritaet || 'mittel',
      zugewiesen
    };

    umzug.tasks.push(newTask);
    await umzug.save();

    // Benachrichtigung erstellen, wenn zugewiesen
    if (zugewiesen) {
      await Benachrichtigung.create({
        empfaenger: zugewiesen,
        titel: 'Neue Aufgabe',
        inhalt: `Eine neue Aufgabe wurde Ihnen zugewiesen: ${beschreibung}`,
        typ: 'info',
        bezug: {
          typ: 'umzug',
          id: umzug._id
        },
        erstelltVon: req.user.id
      });
    }

    res.status(201).json({
      message: 'Task erfolgreich hinzugefügt',
      task: umzug.tasks[umzug.tasks.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Tasks:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Tasks' });
  }
};

// Task aktualisieren
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { beschreibung, erledigt, faelligkeit, prioritaet, zugewiesen } = req.body;

    // Umzug finden
    const umzug = await Umzug.findById(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }

    // Task finden
    const task = umzug.tasks.id(taskId);
    
    if (!task) {
      return res.status(404).json({ message: 'Task nicht gefunden' });
    }

    // Task aktualisieren
    if (beschreibung !== undefined) task.beschreibung = beschreibung;
    if (erledigt !== undefined) task.erledigt = erledigt;
    if (faelligkeit !== undefined) task.faelligkeit = new Date(faelligkeit);
    if (prioritaet !== undefined) task.prioritaet = prioritaet;
    if (zugewiesen !== undefined) task.zugewiesen = zugewiesen;

    await umzug.save();

    res.json({
      message: 'Task erfolgreich aktualisiert',
      task
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Tasks:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Tasks' });
  }
};

// Dokument hinzufügen
exports.addDokument = async (req, res) => {
  try {
    const { name, pfad, kategorie } = req.body;

    // Umzug finden
    const umzug = await Umzug.findById(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }

    // Neues Dokument hinzufügen
    umzug.dokumente.push({
      name,
      pfad,
      kategorie: kategorie || 'sonstiges',
      datum: new Date()
    });

    await umzug.save();

    res.status(201).json({
      message: 'Dokument erfolgreich hinzugefügt',
      dokument: umzug.dokumente[umzug.dokumente.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Dokuments:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Dokuments' });
  }
};

// Notiz hinzufügen
exports.addNotiz = async (req, res) => {
  try {
    const { text } = req.body;

    // Umzug finden
    const umzug = await Umzug.findById(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({ message: 'Umzug nicht gefunden' });
    }

    // Neue Notiz hinzufügen
    umzug.notizen.push({
      text,
      ersteller: req.user.name,
      datum: new Date()
    });

    await umzug.save();

    res.status(201).json({
      message: 'Notiz erfolgreich hinzugefügt',
      notiz: umzug.notizen[umzug.notizen.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Notiz:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen der Notiz' });
  }
};