// controllers/mitarbeiter.controller.js - Updated with standardized error handling
const Mitarbeiter = require('../models/mitarbeiter.model');
const User = require('../models/user');
const { validationResult } = require('express-validator');
const { 
  catchAsync, 
  createValidationError, 
  createNotFoundError,
  AppError
} = require('../utils/error.utils');

const { 
  createOffsetPaginationResponse, 
  createSearchFilter 
} = require('../middleware/pagination.fixed');

// Alle Mitarbeiter abrufen mit Pagination
exports.getAllMitarbeiter = catchAsync(async (req, res) => {
  const { search, position, abteilung, isActive, fuehrerscheinklasse } = req.query;
  
  // Filter erstellen
  const filter = { ...req.filters };
  
  if (position) {
    filter.position = position;
  }
  
  if (abteilung) {
    filter.abteilung = abteilung;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (fuehrerscheinklasse) {
    filter.fuehrerscheinklassen = fuehrerscheinklasse;
  }
  
  // Search filter
  if (search) {
    const searchFilter = createSearchFilter(search, ['vorname', 'nachname', 'telefon', 'email']);
    Object.assign(filter, searchFilter);
  }
  
  // Build query
  const query = Mitarbeiter.find(filter)
    .populate('userId', 'name email role')
    .sort(req.pagination?.sort || { createdAt: -1 });
  
  // Count query
  const countQuery = Mitarbeiter.countDocuments(filter);
  
  // Create paginated response
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  
  res.json(response);
});

// Einen Mitarbeiter nach ID abrufen
exports.getMitarbeiterById = catchAsync(async (req, res) => {
  const mitarbeiter = await Mitarbeiter.findById(req.params.id)
    .populate('userId', 'name email role');
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }
  
  res.json({
    success: true,
    data: mitarbeiter
  });
});

// Neuen Mitarbeiter erstellen
exports.createMitarbeiter = catchAsync(async (req, res) => {
  // Validierungsfehler prüfen
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }
  
  // In der Anfrage oder vom authentifizierten Benutzer die Benutzer-ID holen
  const userId = req.body.userId || req.user?.id;
  
  if (!userId) {
    throw new AppError('Benutzer-ID ist erforderlich', 400, [{ 
      field: 'userId', 
      message: 'Benutzer-ID ist erforderlich'
    }]);
  }
  
  // Mitarbeiterdaten zusammenstellen
  const mitarbeiterData = {
    ...req.body,
    userId, // Stelle sicher, dass die Benutzer-ID gesetzt ist
    createdBy: req.user?.id // Wer hat diesen Mitarbeiter erstellt
  };
  
  // Mitarbeiter in der Datenbank erstellen
  const mitarbeiter = await Mitarbeiter.create(mitarbeiterData);
  
  res.status(201).json({
    success: true,
    message: 'Mitarbeiter erfolgreich erstellt',
    data: mitarbeiter
  });
});

// Mitarbeiter aktualisieren
exports.updateMitarbeiter = catchAsync(async (req, res) => {
  // Validierungsfehler prüfen
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { 
    vorname, nachname, telefon, email, adresse, 
    position, abteilung, einstellungsdatum, gehalt,
    faehigkeiten, fuehrerscheinklassen, notizen, 
    notfallkontakt, bankverbindung, isActive 
  } = req.body;

  // Mitarbeiter finden
  const mitarbeiter = await Mitarbeiter.findById(req.params.id);
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }

  // Felder aktualisieren
  if (vorname) mitarbeiter.vorname = vorname;
  if (nachname) mitarbeiter.nachname = nachname;
  if (telefon) mitarbeiter.telefon = telefon;
  if (email) mitarbeiter.email = email;
  if (adresse) mitarbeiter.adresse = adresse;
  if (position) mitarbeiter.position = position;
  if (abteilung) mitarbeiter.abteilung = abteilung;
  if (einstellungsdatum) mitarbeiter.einstellungsdatum = einstellungsdatum;
  if (gehalt) mitarbeiter.gehalt = gehalt;
  if (faehigkeiten) mitarbeiter.faehigkeiten = faehigkeiten;
  if (fuehrerscheinklassen) mitarbeiter.fuehrerscheinklassen = fuehrerscheinklassen;
  if (notizen) mitarbeiter.notizen = notizen;
  if (notfallkontakt) mitarbeiter.notfallkontakt = notfallkontakt;
  if (bankverbindung) mitarbeiter.bankverbindung = bankverbindung;
  if (isActive !== undefined) mitarbeiter.isActive = isActive;

  await mitarbeiter.save();

  res.json({
    success: true,
    message: 'Mitarbeiter erfolgreich aktualisiert',
    data: mitarbeiter
  });
});

// Arbeitszeit hinzufügen
exports.addArbeitszeit = catchAsync(async (req, res) => {
  // Validierungsfehler prüfen
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }

  const { datum, startzeit, endzeit, pausen, notizen } = req.body;

  // Mitarbeiter finden
  const mitarbeiter = await Mitarbeiter.findById(req.params.id);
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }

  // Neue Arbeitszeit hinzufügen
  mitarbeiter.arbeitszeiten.push({
    datum,
    startzeit,
    endzeit,
    pausen: pausen || [],
    notizen
  });

  await mitarbeiter.save();

  res.status(201).json({
    success: true,
    message: 'Arbeitszeit erfolgreich hinzugefügt',
    data: mitarbeiter.arbeitszeiten[mitarbeiter.arbeitszeiten.length - 1]
  });
});

// Arbeitszeiten für einen Zeitraum abrufen
exports.getArbeitszeiten = catchAsync(async (req, res) => {
  const { von, bis } = req.query;
  const mitarbeiterId = req.params.id;
  
  const mitarbeiter = await Mitarbeiter.findById(mitarbeiterId);
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }
  
  let arbeitszeiten = mitarbeiter.arbeitszeiten;
  
  // Filtern nach Zeitraum, wenn angegeben
  if (von || bis) {
    arbeitszeiten = arbeitszeiten.filter(az => {
      const datum = new Date(az.datum);
      const vonDatum = von ? new Date(von) : null;
      const bisDatum = bis ? new Date(bis) : null;
      
      if (vonDatum && datum < vonDatum) return false;
      if (bisDatum && datum > bisDatum) return false;
      return true;
    });
  }
  
  res.json({
    success: true,
    data: {
      mitarbeiter: {
        id: mitarbeiter._id,
        name: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`
      },
      arbeitszeiten: arbeitszeiten.sort((a, b) => new Date(b.datum) - new Date(a.datum))
    }
  });
});

// Dokument hinzufügen
exports.addDokument = catchAsync(async (req, res) => {
  const { name, pfad } = req.body;

  // Mitarbeiter finden
  const mitarbeiter = await Mitarbeiter.findById(req.params.id);
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }

  // Neues Dokument hinzufügen
  mitarbeiter.dokumente.push({
    name,
    pfad,
    datum: new Date()
  });

  await mitarbeiter.save();

  res.status(201).json({
    success: true,
    message: 'Dokument erfolgreich hinzugefügt',
    data: mitarbeiter.dokumente[mitarbeiter.dokumente.length - 1]
  });
});

// Mitarbeiter löschen
exports.deleteMitarbeiter = catchAsync(async (req, res) => {
  const mitarbeiter = await Mitarbeiter.findById(req.params.id);
  
  if (!mitarbeiter) {
    throw createNotFoundError('Mitarbeiter');
  }
  
  // Hard delete
  await Mitarbeiter.findByIdAndDelete(req.params.id);
  
  res.json({
    success: true,
    message: 'Mitarbeiter erfolgreich gelöscht'
  });
});