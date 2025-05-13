// controllers/aufnahme.controller.js
const Aufnahme = require('../models/aufnahme.model');
const Umzug = require('../models/umzug.model');
const { validationResult } = require('express-validator');

// Alle Aufnahmen abrufen
exports.getAllAufnahmen = async (req, res) => {
  try {
    const { status, aufnehmer, startDatum, endDatum } = req.query;
    
    // Filter erstellen
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (aufnehmer) {
      filter.aufnehmer = aufnehmer;
    }
    
    if (startDatum || endDatum) {
      filter.datum = {};
      if (startDatum) {
        filter.datum.$gte = new Date(startDatum);
      }
      if (endDatum) {
        filter.datum.$lte = new Date(endDatum);
      }
    }
    
    const aufnahmen = await Aufnahme.find(filter)
      .populate('aufnehmer', 'name')
      .sort({ datum: -1 });
    
    res.json(aufnahmen);
  } catch (error) {
    console.error('Fehler beim Abrufen der Aufnahmen:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Aufnahmen' });
  }
};

// Eine Aufnahme nach ID abrufen
exports.getAufnahmeById = async (req, res) => {
  try {
    const aufnahme = await Aufnahme.findById(req.params.id)
      .populate('aufnehmer', 'name');
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }
    
    res.json(aufnahme);
  } catch (error) {
    console.error('Fehler beim Abrufen der Aufnahme:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Aufnahme' });
  }
};

// Neue Aufnahme erstellen
exports.createAufnahme = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Daten bereinigen
    const aufnahmeData = { ...req.body };
    
    // Datumsfelder korrekt formatieren
    if (aufnahmeData.datum) {
      try {
        aufnahmeData.datum = new Date(aufnahmeData.datum);
      } catch (err) {
        console.error('Fehler beim Formatieren des Datums:', err);
        aufnahmeData.datum = new Date();
      }
    } else {
      aufnahmeData.datum = new Date();
    }
    
    // Wenn aufnehmer nicht angegeben, aber User vorhanden, dann User als Aufnehmer setzen
    if (!aufnahmeData.aufnehmer && req.user) {
      aufnahmeData.aufnehmer = req.user.id;
    }
    
    // Stelle sicher, dass auszugsadresse und einzugsadresse als eingebettete Dokumente gespeichert werden
    if (aufnahmeData.auszugsadresse && typeof aufnahmeData.auszugsadresse === 'object') {
      // Die Adresse direkt verwenden, ohne ObjectId-Referenz
      // Wir müssen nichts tun, da wir die Daten so verwenden, wie sie sind
    } else if (aufnahmeData.auszugsadresse) {
      delete aufnahmeData.auszugsadresse; // Wenn es keine gültige Objektform ist, entfernen
    }
    
    if (aufnahmeData.einzugsadresse && typeof aufnahmeData.einzugsadresse === 'object') {
      // Die Adresse direkt verwenden
      // Wir müssen nichts tun, da wir die Daten so verwenden, wie sie sind
    } else if (aufnahmeData.einzugsadresse) {
      delete aufnahmeData.einzugsadresse; // Wenn es keine gültige Objektform ist, entfernen
    }

    // Neue Aufnahme erstellen
    const aufnahme = new Aufnahme(aufnahmeData);

    await aufnahme.save();

    res.status(201).json({
      message: 'Aufnahme erfolgreich erstellt',
      aufnahme
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Aufnahme:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen der Aufnahme', error: error.message });
  }
};

// Aufnahme aktualisieren
exports.updateAufnahme = async (req, res) => {
  try {
    // Validierungsfehler prüfen
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Aufnahme finden
    const aufnahme = await Aufnahme.findById(req.params.id);
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }

    // Daten bereinigen
    const updateData = { ...req.body };
    
    // Datumsfelder korrekt formatieren
    if (updateData.datum) {
      try {
        updateData.datum = new Date(updateData.datum);
      } catch (err) {
        console.error('Fehler beim Formatieren des Datums:', err);
        delete updateData.datum; // Im Fehlerfall nicht aktualisieren
      }
    }
    
    // Adressen als eingebettete Dokumente behandeln
    if (updateData.auszugsadresse && typeof updateData.auszugsadresse !== 'object') {
      delete updateData.auszugsadresse;
    }
    
    if (updateData.einzugsadresse && typeof updateData.einzugsadresse !== 'object') {
      delete updateData.einzugsadresse;
    }

    // Alle Felder aktualisieren, die im Request enthalten sind
    const updateFields = [
      'datum', 'kundenName', 'auszugsadresse', 'einzugsadresse',
      'raeume', 'gesamtvolumen', 'notizen', 'angebotspreis', 'status',
      'kontaktperson', 'telefon', 'email', 'umzugstyp', 'umzugsvolumen',
      'uhrzeit', 'besonderheiten', 'bewertung', 'mitarbeiterId'
    ];

    updateFields.forEach(field => {
      if (updateData[field] !== undefined) {
        aufnahme[field] = updateData[field];
      }
    });

    await aufnahme.save();

    res.json({
      message: 'Aufnahme erfolgreich aktualisiert',
      aufnahme
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Aufnahme:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren der Aufnahme', error: error.message });
  }
};

// Raum hinzufügen
exports.addRaum = async (req, res) => {
  try {
    const { name, flaeche, etage, besonderheiten } = req.body;

    // Aufnahme finden
    const aufnahme = await Aufnahme.findById(req.params.id);
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }

    // Neuen Raum hinzufügen
    aufnahme.raeume.push({
      name,
      flaeche,
      etage,
      besonderheiten,
      moebel: []
    });

    await aufnahme.save();

    res.status(201).json({
      message: 'Raum erfolgreich hinzugefügt',
      raum: aufnahme.raeume[aufnahme.raeume.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Raums:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Raums' });
  }
};

// Möbel hinzufügen
exports.addMoebel = async (req, res) => {
  try {
    const { raumId } = req.params;
    const { 
      name, anzahl, kategorie, groesse, 
      gewicht, zerbrechlich, besonderheiten, 
      demontage, montage, verpackung 
    } = req.body;

    // Aufnahme finden
    const aufnahme = await Aufnahme.findById(req.params.id);
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }

    // Raum finden
    const raum = aufnahme.raeume.id(raumId);
    
    if (!raum) {
      return res.status(404).json({ message: 'Raum nicht gefunden' });
    }

    // Neues Möbel hinzufügen
    raum.moebel.push({
      name,
      anzahl: anzahl || 1,
      kategorie: kategorie || 'sonstiges',
      groesse,
      gewicht,
      zerbrechlich: zerbrechlich || false,
      besonderheiten,
      demontage: demontage || false,
      montage: montage || false,
      verpackung: verpackung || false
    });

    // Gesamtvolumen neu berechnen (wenn Größenangaben vorhanden)
    if (groesse && groesse.laenge && groesse.breite && groesse.hoehe) {
      const volumen = (groesse.laenge * groesse.breite * groesse.hoehe) / 1000000; // cm³ zu m³
      raum.moebel[raum.moebel.length - 1].groesse.volumen = volumen;
      
      // Gesamtvolumen der Aufnahme aktualisieren
      let gesamtvolumen = 0;
      aufnahme.raeume.forEach(r => {
        r.moebel.forEach(m => {
          if (m.groesse && m.groesse.volumen) {
            gesamtvolumen += m.groesse.volumen * m.anzahl;
          }
        });
      });
      aufnahme.gesamtvolumen = gesamtvolumen;
    }

    await aufnahme.save();

    res.status(201).json({
      message: 'Möbel erfolgreich hinzugefügt',
      moebel: raum.moebel[raum.moebel.length - 1]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Möbels:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Möbels' });
  }
};

// Bild hinzufügen
exports.addBild = async (req, res) => {
  try {
    const { pfad } = req.body;

    // Aufnahme finden
    const aufnahme = await Aufnahme.findById(req.params.id);
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }

    // Neues Bild hinzufügen
    aufnahme.bilder.push(pfad);

    await aufnahme.save();

    res.status(201).json({
      message: 'Bild erfolgreich hinzugefügt',
      pfad
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Bildes:', error);
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen des Bildes' });
  }
};

// Angebot erstellen
exports.erstelleAngebot = async (req, res) => {
  try {
    const { netto, brutto } = req.body;

    // Aufnahme finden
    const aufnahme = await Aufnahme.findById(req.params.id);
    
    if (!aufnahme) {
      return res.status(404).json({ message: 'Aufnahme nicht gefunden' });
    }

    // Angebotspreis setzen
    aufnahme.angebotspreis = {
      netto,
      brutto
    };
    
    // Status aktualisieren
    aufnahme.status = 'angebot_erstellt';

    await aufnahme.save();

    res.json({
      message: 'Angebot erfolgreich erstellt',
      angebotspreis: aufnahme.angebotspreis
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Angebots:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Angebots' });
  }
};