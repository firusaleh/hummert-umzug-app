// controllers/umzug.controller.js
const Umzug = require('../models/umzug.model');
const Aufnahme = require('../models/aufnahme.model');
const Benachrichtigung = require('../models/benachrichtigung.model');
const { validationResult } = require('express-validator');
const { 
  createOffsetPaginationResponse, 
  createCursorPaginationResponse,
  createDateRangeFilter,
  createSearchFilter 
} = require('../middleware/pagination');

// Alle Umzüge abrufen mit Pagination
exports.getAllUmzuege = async (req, res) => {
  try {
    const { status, startDatum, endDatum, search, ...filters } = req.query;
    
    // Filter erstellen
    const filter = { ...req.filters };
    
    if (status) {
      filter.status = status;
    }
    
    // Date range filter
    const dateFilter = createDateRangeFilter(startDatum, endDatum, 'startDatum');
    Object.assign(filter, dateFilter);
    
    // Search filter
    if (search) {
      const searchFilter = createSearchFilter(search, ['kundennummer', 'auftraggeber.name']);
      Object.assign(filter, searchFilter);
    }
    
    // Build query
    const query = Umzug.find(filter)
      .populate('mitarbeiter.mitarbeiterId', 'vorname nachname')
      .populate('aufnahmeId')
      .sort(req.sorting);
    
    // Count query
    const countQuery = Umzug.countDocuments(filter);
    
    // Create paginated response
    const response = await createOffsetPaginationResponse(query, countQuery, req);
    
    res.json(response);
  } catch (error) {
    console.error('Fehler beim Abrufen der Umzüge:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Umzüge' });
  }
};

// Umzüge mit Cursor-based Pagination (für Real-time Updates)
exports.getUmzuegeStream = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Filter erstellen
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    // Build query with sorting by creation date
    const query = Umzug.find(filter)
      .populate('mitarbeiter.mitarbeiterId', 'vorname nachname')
      .populate('aufnahmeId')
      .sort({ createdAt: -1 });
    
    // Create cursor-based response
    const { data, pagination } = await createCursorPaginationResponse(query, req, 'createdAt');
    
    res.json({
      data,
      pagination
    });
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

    // Daten bereinigen und korrigieren
    const umzugData = { ...req.body };
    
    // 1. aufnahmeId entfernen, wenn leer
    if (!umzugData.aufnahmeId || umzugData.aufnahmeId === '') {
      delete umzugData.aufnahmeId;
    }
    
    // 2. Fahrzeuge-Array bereinigen, um ObjectId-Probleme zu vermeiden
    if (Array.isArray(umzugData.fahrzeuge)) {
      umzugData.fahrzeuge = umzugData.fahrzeuge.map(fahrzeug => {
        // Nur die notwendigen Attribute behalten, _id entfernen
        const { _id, ...fahrzeugOhneId } = fahrzeug;
        return fahrzeugOhneId;
      });
    } else {
      umzugData.fahrzeuge = [];
    }
    
    // 3. Mitarbeiter-Array bereinigen
    if (Array.isArray(umzugData.mitarbeiter)) {
      // Mitarbeiter mit korrektem Format behalten
      umzugData.mitarbeiter = [];
    } else {
      umzugData.mitarbeiter = [];
    }

    console.log('Bereinigte Daten:', JSON.stringify(umzugData, null, 2));

    // Wenn aufnahmeId vorhanden, prüfen, ob die Aufnahme existiert
    if (umzugData.aufnahmeId) {
      try {
        const aufnahme = await Aufnahme.findById(umzugData.aufnahmeId);
        if (!aufnahme) {
          return res.status(400).json({ message: 'Aufnahme existiert nicht' });
        }
      } catch (err) {
        console.error('Fehler beim Überprüfen der Aufnahme:', err);
        delete umzugData.aufnahmeId; // Im Fehlerfall sicherheitshalber löschen
      }
    }

    // Datumsfelder sicherstellen
    if (umzugData.startDatum) {
      try {
        umzugData.startDatum = new Date(umzugData.startDatum);
      } catch (err) {
        console.error('Fehler beim Formatieren des Startdatums:', err);
        umzugData.startDatum = new Date();
      }
    }
    
    if (umzugData.endDatum) {
      try {
        umzugData.endDatum = new Date(umzugData.endDatum);
      } catch (err) {
        console.error('Fehler beim Formatieren des Enddatums:', err);
        // Fallback: Startdatum + 1 Tag
        const endDate = new Date(umzugData.startDatum || new Date());
        endDate.setDate(endDate.getDate() + 1);
        umzugData.endDatum = endDate;
      }
    }

    // Numerische Werte im Preis-Objekt sicherstellen
    if (umzugData.preis) {
      umzugData.preis = {
        netto: parseFloat(umzugData.preis.netto || 0),
        brutto: parseFloat(umzugData.preis.brutto || 0),
        mwst: parseFloat(umzugData.preis.mwst || 19),
        bezahlt: Boolean(umzugData.preis.bezahlt),
        zahlungsart: umzugData.preis.zahlungsart || 'rechnung'
      };
    }

    // Neuen Umzug erstellen mit bereinigten Daten
    const umzug = new Umzug(umzugData);

    await umzug.save();

    res.status(201).json({
      message: 'Umzug erfolgreich erstellt',
      umzug
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Umzugs:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Umzugs', error: error.message });
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

    // Daten bereinigen
    const updateData = { ...req.body };
    
    // aufnahmeId entfernen, wenn leer
    if (!updateData.aufnahmeId || updateData.aufnahmeId === '') {
      delete updateData.aufnahmeId;
    }
    
    // Fahrzeuge bereinigen
    if (Array.isArray(updateData.fahrzeuge)) {
      updateData.fahrzeuge = updateData.fahrzeuge.map(fahrzeug => {
        const { _id, ...fahrzeugOhneId } = fahrzeug;
        return fahrzeugOhneId;
      });
    }
    
    // Mitarbeiter bereinigen
    if (Array.isArray(updateData.mitarbeiter)) {
      updateData.mitarbeiter = [];
    }

    // Alle Felder aktualisieren, die im Request enthalten sind
    const updateFields = [
      'kundennummer', 'auftraggeber', 'kontakte', 'auszugsadresse',
      'einzugsadresse', 'zwischenstopps', 'startDatum', 'endDatum',
      'status', 'preis', 'fahrzeuge', 'mitarbeiter'
    ];

    updateFields.forEach(field => {
      if (updateData[field] !== undefined) {
        umzug[field] = updateData[field];
      }
    });
    
    // aufnahmeId separat behandeln
    if (updateData.aufnahmeId !== undefined) {
      umzug.aufnahmeId = updateData.aufnahmeId;
    }

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