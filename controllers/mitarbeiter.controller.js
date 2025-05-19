// controllers/mitarbeiter.controller.js
const Mitarbeiter = require('../models/mitarbeiter.model');
const User = require('../models/user');
const { validationResult } = require('express-validator');
const { 
  createOffsetPaginationResponse, 
  createSearchFilter 
} = require('../middleware/pagination');

// Alle Mitarbeiter abrufen mit Pagination
exports.getAllMitarbeiter = async (req, res) => {
  try {
    const { search, position, isActive, ...filters } = req.query;
    
    // Filter erstellen
    const filter = { ...req.filters };
    
    if (position) {
      filter.position = position;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Search filter
    if (search) {
      const searchFilter = createSearchFilter(search, ['vorname', 'nachname', 'telefon']);
      Object.assign(filter, searchFilter);
    }
    
    // Build query
    const query = Mitarbeiter.find(filter)
      .populate('userId', 'name email role')
      .sort(req.sorting);
    
    // Count query
    const countQuery = Mitarbeiter.countDocuments(filter);
    
    // Create paginated response
    const response = await createOffsetPaginationResponse(query, countQuery, req);
    
    res.json(response);
  } catch (error) {
    console.error('Fehler beim Abrufen der Mitarbeiter:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Mitarbeiter' });
  }
};

// Einen Mitarbeiter nach ID abrufen
exports.getMitarbeiterById = async (req, res) => {
  try {
    const mitarbeiter = await Mitarbeiter.findById(req.params.id)
      .populate('userId', 'name email role');
    
    if (!mitarbeiter) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }
    
    res.json(mitarbeiter);
  } catch (error) {
    console.error('Fehler beim Abrufen des Mitarbeiters:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Mitarbeiters' });
  }
};

// Neuen Mitarbeiter erstellen - AKTUALISIERTE VERSION
exports.createMitarbeiter = async (req, res) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // In der Anfrage oder vom authentifizierten Benutzer die Benutzer-ID holen
    const userId = req.body.userId || req.user.id;
    
    if (!userId) {
      return res.status(400).json({ 
        errors: [{ 
          type: 'field', 
          msg: 'Benutzer-ID ist erforderlich', 
          path: 'userId', 
          location: 'body' 
        }] 
      });
    }
    
    // Mitarbeiterdaten zusammenstellen
    const mitarbeiterData = {
      ...req.body,
      userId, // Stelle sicher, dass die Benutzer-ID gesetzt ist
      createdBy: req.user.id // Wer hat diesen Mitarbeiter erstellt
    };
    
    // Mitarbeiter in der Datenbank erstellen
    const mitarbeiter = await Mitarbeiter.create(mitarbeiterData);
    
    res.status(201).json({
      success: true,
      message: 'Mitarbeiter erfolgreich erstellt',
      mitarbeiter
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Mitarbeiters:', error);
    
    if (error.name === 'ValidationError') {
      // Mongoose-Validierungsfehler
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Erstellen des Mitarbeiters',
      error: error.message
    });
  }
};

// Mitarbeiter aktualisieren
exports.updateMitarbeiter = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      vorname, nachname, telefon, adresse, 
      position, einstellungsdatum, faehigkeiten, 
      fuehrerscheinklassen, notizen, isActive 
    } = req.body;

    // Mitarbeiter finden und aktualisieren
    const mitarbeiter = await Mitarbeiter.findById(req.params.id);
    
    if (!mitarbeiter) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }

    // Felder aktualisieren
    if (vorname) mitarbeiter.vorname = vorname;
    if (nachname) mitarbeiter.nachname = nachname;
    if (telefon) mitarbeiter.telefon = telefon;
    if (adresse) mitarbeiter.adresse = adresse;
    if (position) mitarbeiter.position = position;
    if (einstellungsdatum) mitarbeiter.einstellungsdatum = einstellungsdatum;
    if (faehigkeiten) mitarbeiter.faehigkeiten = faehigkeiten;
    if (fuehrerscheinklassen) mitarbeiter.fuehrerscheinklassen = fuehrerscheinklassen;
    if (notizen) mitarbeiter.notizen = notizen;
    if (isActive !== undefined) mitarbeiter.isActive = isActive;

    await mitarbeiter.save();

    res.json({
      message: 'Mitarbeiter erfolgreich aktualisiert',
      mitarbeiter
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Mitarbeiters' });
  }
};

// Arbeitszeit hinzufügen
exports.addArbeitszeit = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { datum, startzeit, endzeit, pausen, notizen } = req.body;

    // Mitarbeiter finden
    const mitarbeiter = await Mitarbeiter.findById(req.params.id);
    
    if (!mitarbeiter) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
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
      message: 'Arbeitszeit erfolgreich hinzugefügt',
      arbeitszeit: mitarbeiter.arbeitszeiten[mitarbeiter.arbeitszeiten.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Arbeitszeit:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen der Arbeitszeit' });
  }
};

// Dokument hinzufügen
exports.addDokument = async (req, res) => {
  try {
    const { name, pfad } = req.body;

    // Mitarbeiter finden
    const mitarbeiter = await Mitarbeiter.findById(req.params.id);
    
    if (!mitarbeiter) {
      return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
    }

    // Neues Dokument hinzufügen
    mitarbeiter.dokumente.push({
      name,
      pfad,
      datum: new Date()
    });

    await mitarbeiter.save();

    res.status(201).json({
      message: 'Dokument erfolgreich hinzugefügt',
      dokument: mitarbeiter.dokumente[mitarbeiter.dokumente.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Dokuments:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Dokuments' });
  }
};