// controllers/zeiterfassung.controller.js
const Mitarbeiter = require('../models/mitarbeiter.model');
const Umzug = require('../models/umzug.model');
const Zeiterfassung = require('../models/zeiterfassung.model');

// Mitarbeiter für Zeiterfassung abrufen
exports.getMitarbeiterForZeiterfassung = async (req, res) => {
  try {
    // Je nach Ihrer Datenstruktur können Sie hier auch Rollen oder andere Filter anwenden
    const mitarbeiter = await Mitarbeiter.find({ aktiv: true }).select('_id vorname nachname rolle');
    res.status(200).json(mitarbeiter);
  } catch (error) {
    res.status(500).json({ 
      message: "Fehler beim Laden der Mitarbeiter für Zeiterfassung", 
      error: error.message 
    });
  }
};

// Umzugsprojekte für Zeiterfassung abrufen
exports.getUmzugsprojekte = async (req, res) => {
  try {
    // Umzugsprojekte laden, die aktiv oder in Bearbeitung sind
    const projekte = await Umzug.find({
      status: { $in: ['angefragt', 'geplant', 'in_bearbeitung'] }
    }).select('_id auftraggeber startDatum status');
    
    res.status(200).json(projekte);
  } catch (error) {
    res.status(500).json({ 
      message: "Fehler beim Laden der Umzugsprojekte", 
      error: error.message 
    });
  }
};

// Zeiterfassungen für ein Projekt abrufen
exports.getZeiterfassungenByProjekt = async (req, res) => {
  try {
    const { projektId } = req.params;
    
    const zeiterfassungen = await Zeiterfassung.find({ projektId })
      .populate('mitarbeiterId', 'vorname nachname')
      .sort({ datum: -1, startzeit: -1 });
    
    res.status(200).json(zeiterfassungen);
  } catch (error) {
    res.status(500).json({ 
      message: "Fehler beim Laden der Zeiterfassungen", 
      error: error.message 
    });
  }
};

// Neue Zeiterfassung erstellen
exports.createZeiterfassung = async (req, res) => {
  try {
    const zeiterfassungData = req.body;
    
    // Neue Zeiterfassung erstellen
    const neueZeiterfassung = new Zeiterfassung(zeiterfassungData);
    
    // Speichern
    await neueZeiterfassung.save();
    
    // Für die Rückgabe die Mitarbeiterdaten laden
    const mitPopulate = await Zeiterfassung.findById(neueZeiterfassung._id)
      .populate('mitarbeiterId', 'vorname nachname');
    
    res.status(201).json(mitPopulate);
  } catch (error) {
    res.status(400).json({ 
      message: "Fehler beim Erstellen der Zeiterfassung", 
      error: error.message 
    });
  }
};

// Zeiterfassung aktualisieren
exports.updateZeiterfassung = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const zeiterfassung = await Zeiterfassung.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    ).populate('mitarbeiterId', 'vorname nachname');
    
    if (!zeiterfassung) {
      return res.status(404).json({ message: "Zeiterfassung nicht gefunden" });
    }
    
    res.status(200).json(zeiterfassung);
  } catch (error) {
    res.status(400).json({ 
      message: "Fehler beim Aktualisieren der Zeiterfassung", 
      error: error.message 
    });
  }
};

// Zeiterfassung löschen
exports.deleteZeiterfassung = async (req, res) => {
  try {
    const { id } = req.params;
    
    const zeiterfassung = await Zeiterfassung.findByIdAndDelete(id);
    
    if (!zeiterfassung) {
      return res.status(404).json({ message: "Zeiterfassung nicht gefunden" });
    }
    
    res.status(200).json({ message: "Zeiterfassung erfolgreich gelöscht" });
  } catch (error) {
    res.status(500).json({ 
      message: "Fehler beim Löschen der Zeiterfassung", 
      error: error.message 
    });
  }
};

// Neuen Mitarbeiter hinzufügen
exports.addMitarbeiter = async (req, res) => {
  try {
    const mitarbeiterData = req.body;
    
    // Prüfen, ob bereits ein Mitarbeiter mit dieser E-Mail existiert
    const existingMitarbeiter = await Mitarbeiter.findOne({ email: mitarbeiterData.email });
    if (existingMitarbeiter) {
      return res.status(400).json({ message: "Ein Mitarbeiter mit dieser E-Mail existiert bereits" });
    }
    
    // Neuen Mitarbeiter erstellen
    const neuerMitarbeiter = new Mitarbeiter({
      ...mitarbeiterData,
      aktiv: true
    });
    
    // Speichern
    await neuerMitarbeiter.save();
    
    res.status(201).json(neuerMitarbeiter);
  } catch (error) {
    res.status(400).json({ 
      message: "Fehler beim Hinzufügen des Mitarbeiters", 
      error: error.message 
    });
  }
};

// Mitarbeiter löschen
exports.deleteMitarbeiter = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen, ob der Mitarbeiter existiert
    const mitarbeiter = await Mitarbeiter.findById(id);
    if (!mitarbeiter) {
      return res.status(404).json({ message: "Mitarbeiter nicht gefunden" });
    }
    
    // Prüfen, ob der Mitarbeiter noch Zeiterfassungen hat
    const zeiterfassungen = await Zeiterfassung.find({ mitarbeiterId: id });
    if (zeiterfassungen.length > 0) {
      return res.status(400).json({ 
        message: "Der Mitarbeiter hat noch Zeiterfassungen und kann nicht gelöscht werden" 
      });
    }
    
    // Mitarbeiter löschen
    await Mitarbeiter.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Mitarbeiter erfolgreich gelöscht" });
  } catch (error) {
    res.status(500).json({ 
      message: "Fehler beim Löschen des Mitarbeiters", 
      error: error.message 
    });
  }
};