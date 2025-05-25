// controllers/umzug.controller.js - Updated with standardized error handling
const Umzug = require('../models/umzug.model');
const Aufnahme = require('../models/aufnahme.model');
const Benachrichtigung = require('../models/benachrichtigung.model');
const { validationResult } = require('express-validator');
const { 
  catchAsync, 
  createValidationError, 
  createNotFoundError,
  AppError 
} = require('../utils/error.utils');

// Transform legacy data format to new format
const transformLegacyUmzugData = (data) => {
  // Handle old format with 'kunde' instead of 'auftraggeber'
  if (data.kunde && !data.auftraggeber) {
    data.auftraggeber = data.kunde;
    delete data.kunde;
  }
  
  // Handle old format with 'datum' instead of 'startDatum/endDatum'
  if (data.datum && !data.startDatum) {
    data.startDatum = data.datum;
    data.endDatum = data.datum;
    delete data.datum;
  }
  
  // Ensure hausnummer is present in addresses
  if (data.auszugsadresse && !data.auszugsadresse.hausnummer) {
    // Extract hausnummer from strasse if combined
    const match = data.auszugsadresse.strasse?.match(/^(.+?)\s+(\d+\w*)$/);
    if (match) {
      data.auszugsadresse.strasse = match[1];
      data.auszugsadresse.hausnummer = match[2];
    } else {
      data.auszugsadresse.hausnummer = '1'; // Default
    }
  }
  
  if (data.einzugsadresse && !data.einzugsadresse.hausnummer) {
    const match = data.einzugsadresse.strasse?.match(/^(.+?)\s+(\d+\w*)$/);
    if (match) {
      data.einzugsadresse.strasse = match[1];
      data.einzugsadresse.hausnummer = match[2];
    } else {
      data.einzugsadresse.hausnummer = '1'; // Default
    }
  }
  
  return data;
};

// Import or create pagination utilities
const fs = require('fs');
const path = require('path');

let paginationModule;
const paginationFixedPath = path.join(__dirname, '../middleware/pagination.fixed.js');
const paginationPath = path.join(__dirname, '../middleware/pagination.js');

// Check if pagination.fixed.js exists and has the required functions
try {
  if (fs.existsSync(paginationFixedPath)) {
    paginationModule = require('../middleware/pagination.fixed');
  } else {
    paginationModule = require('../middleware/pagination');
  }
} catch (e) {
  paginationModule = require('../middleware/pagination');
}

const { 
  createOffsetPaginationResponse = paginationModule.createPaginatedResponse, 
  createCursorPaginationResponse = paginationModule.createCursorPaginatedResponse,
  createDateRangeFilter,
  createSearchFilter 
} = paginationModule;

// Alle Umzüge abrufen mit Pagination
exports.getAllUmzuege = catchAsync(async (req, res) => {
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
    const searchFilter = createSearchFilter(search, ['kundennummer', 'auftraggeber.name', 'auftraggeber.telefon']);
    Object.assign(filter, searchFilter);
  }
  
  // Build query
  const query = Umzug.find(filter)
    .populate('mitarbeiter.mitarbeiterId', 'vorname nachname')
    .populate('aufnahmeId')
    .sort(req.pagination?.sort || { startDatum: -1 });
  
  // Count query
  const countQuery = Umzug.countDocuments(filter);
  
  // Create paginated response
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  
  res.json(response);
});

// Umzüge mit Cursor-based Pagination (für Real-time Updates)
exports.getUmzuegeStream = catchAsync(async (req, res) => {
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
    success: true,
    data,
    pagination
  });
});

// Einen Umzug nach ID abrufen
exports.getUmzugById = catchAsync(async (req, res) => {
  const umzug = await Umzug.findById(req.params.id)
    .populate('mitarbeiter.mitarbeiterId', 'vorname nachname telefon')
    .populate('aufnahmeId');
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
  }
  
  res.json({
    success: true,
    data: umzug
  });
});

// Neuen Umzug erstellen
exports.createUmzug = catchAsync(async (req, res) => {
  // Transform legacy data format
  req.body = transformLegacyUmzugData(req.body);
  // Validierungsfehler prüfen
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
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
    // Nur Mitarbeiter mit gültiger mitarbeiterId behalten
    umzugData.mitarbeiter = umzugData.mitarbeiter.filter(ma => ma.mitarbeiterId);
  } else {
    umzugData.mitarbeiter = [];
  }

  // Wenn aufnahmeId vorhanden, prüfen, ob die Aufnahme existiert
  if (umzugData.aufnahmeId) {
    const aufnahme = await Aufnahme.findById(umzugData.aufnahmeId);
    if (!aufnahme) {
      throw new AppError('Aufnahme existiert nicht', 400);
    }
  }

  // Datumsfelder sicherstellen
  if (umzugData.startDatum) {
    try {
      umzugData.startDatum = new Date(umzugData.startDatum);
    } catch (err) {
      throw new AppError('Ungültiges Startdatum', 400);
    }
  }
  
  if (umzugData.endDatum) {
    try {
      umzugData.endDatum = new Date(umzugData.endDatum);
    } catch (err) {
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
    success: true,
    message: 'Umzug erfolgreich erstellt',
    data: umzug
  });
});

// Umzug aktualisieren
exports.updateUmzug = catchAsync(async (req, res) => {
  // Validierungsfehler prüfen
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  // Umzug finden
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
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
    updateData.mitarbeiter = updateData.mitarbeiter.filter(ma => ma.mitarbeiterId);
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
    success: true,
    message: 'Umzug erfolgreich aktualisiert',
    data: umzug
  });
});

// Task hinzufügen
exports.addTask = catchAsync(async (req, res) => {
  const { beschreibung, faelligkeit, prioritaet, zugewiesen } = req.body;

  // Umzug finden
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
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
      erstelltVon: req.user?.id
    });
  }

  res.status(201).json({
    success: true,
    message: 'Task erfolgreich hinzugefügt',
    data: umzug.tasks[umzug.tasks.length - 1]
  });
});

// Task aktualisieren
exports.updateTask = catchAsync(async (req, res) => {
  const { taskId } = req.params;
  const { beschreibung, erledigt, faelligkeit, prioritaet, zugewiesen } = req.body;

  // Umzug finden
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
  }

  // Task finden
  const task = umzug.tasks.id(taskId);
  
  if (!task) {
    throw createNotFoundError('Task');
  }

  // Task aktualisieren
  if (beschreibung !== undefined) task.beschreibung = beschreibung;
  if (erledigt !== undefined) task.erledigt = erledigt;
  if (faelligkeit !== undefined) task.faelligkeit = new Date(faelligkeit);
  if (prioritaet !== undefined) task.prioritaet = prioritaet;
  if (zugewiesen !== undefined) task.zugewiesen = zugewiesen;

  await umzug.save();

  res.json({
    success: true,
    message: 'Task erfolgreich aktualisiert',
    data: task
  });
});

// Dokument hinzufügen
exports.addDokument = catchAsync(async (req, res) => {
  const { name, pfad, kategorie } = req.body;

  // Umzug finden
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
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
    success: true,
    message: 'Dokument erfolgreich hinzugefügt',
    data: umzug.dokumente[umzug.dokumente.length - 1]
  });
});

// Notiz hinzufügen
exports.addNotiz = catchAsync(async (req, res) => {
  const { text } = req.body;

  // Umzug finden
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
  }

  // Neue Notiz hinzufügen
  umzug.notizen.push({
    text,
    ersteller: req.user?.name || 'System',
    datum: new Date()
  });

  await umzug.save();

  res.status(201).json({
    success: true,
    message: 'Notiz erfolgreich hinzugefügt',
    data: umzug.notizen[umzug.notizen.length - 1]
  });
});

// Umzug löschen
exports.deleteUmzug = catchAsync(async (req, res) => {
  const umzug = await Umzug.findById(req.params.id);
  
  if (!umzug) {
    throw createNotFoundError('Umzug');
  }

  await umzug.deleteOne();

  res.json({
    success: true,
    message: 'Umzug erfolgreich gelöscht',
    data: { deletedId: req.params.id }
  });
});