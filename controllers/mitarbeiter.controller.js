// controllers/mitarbeiter.controller.js
const Mitarbeiter = require('../models/mitarbeiter.model');
const User = require('../models/user');
const { validationResult } = require('express-validator');

// Alle Mitarbeiter abrufen
exports.getAllMitarbeiter = async (req, res) => {
  try {
    const mitarbeiter = await Mitarbeiter.find()
      .populate('userId', 'name email role')
      .sort({ nachname: 1 });
    
    res.json(mitarbeiter);
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

// Neuen Mitarbeiter erstellen
exports.createMitarbeiter = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      userId, vorname, nachname, telefon, adresse, 
      position, einstellungsdatum, faehigkeiten, 
      fuehrerscheinklassen, notizen 
    } = req.body;

    // Prüfen, ob der Benutzer existiert
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(400).json({ message: 'Benutzer existiert nicht' });
    }

    // Prüfen, ob bereits ein Mitarbeiter mit dieser userId existiert
    const existingMitarbeiter = await Mitarbeiter.findOne({ userId });
    if (existingMitarbeiter) {
      return res.status(400).json({ 
        message: 'Mitarbeiter mit dieser Benutzer-ID existiert bereits' 
      });
    }

    // Neuen Mitarbeiter erstellen
    const mitarbeiter = new Mitarbeiter({
      userId,
      vorname,
      nachname,
      telefon,
      adresse,
      position,
      einstellungsdatum,
      faehigkeiten,
      fuehrerscheinklassen,
      notizen
    });

    await mitarbeiter.save();

    res.status(201).json({
      message: 'Mitarbeiter erfolgreich erstellt',
      mitarbeiter
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Mitarbeiters:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Mitarbeiters' });
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