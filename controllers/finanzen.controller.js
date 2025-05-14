// controllers/finanzen.controller.js
const Angebot = require('../models/angebot.model');
const Rechnung = require('../models/rechnung.model');
const Projektkosten = require('../models/projektkosten.model');
const Finanzuebersicht = require('../models/finanzuebersicht.model');
const Umzug = require('../models/umzug.model');
const mongoose = require('mongoose');

// Hilfsfunktion zum Generieren einzigartiger Nummern
const generateUniqueNumber = async (model, fieldName, prefix) => {
  const date = new Date();
  const year = date.getFullYear().toString().substr(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Zähle vorhandene Dokumente dieses Monats
  const countQuery = {};
  const regexPattern = `^${prefix}${year}${month}`;
  countQuery[fieldName] = { $regex: regexPattern };
  
  const count = await model.countDocuments(countQuery);
  const number = (count + 1).toString().padStart(3, '0');
  
  return `${prefix}${year}${month}-${number}`;
};

// ÜBERSICHT CONTROLLER FUNKTIONEN
exports.getFinanzuebersicht = async (req, res) => {
  try {
    // Aktuelle Statistiken für das Dashboard
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Letzten 12 Monate Finanzdaten für Diagramme
    const last12Months = [];
    let tempDate = new Date();
    tempDate.setMonth(tempDate.getMonth() - 11);
    
    for (let i = 0; i < 12; i++) {
      const tempYear = tempDate.getFullYear();
      const tempMonth = tempDate.getMonth() + 1;
      
      const monthData = await Finanzuebersicht.findOne({
        jahr: tempYear,
        monat: tempMonth
      }).lean();
      
      // Wenn keine Daten für diesen Monat, leere Daten einfügen
      const monthName = new Date(tempYear, tempMonth - 1, 1).toLocaleString('de-DE', { month: 'short' });
      last12Months.push({
        name: `${monthName} ${tempYear}`,
        einnahmen: monthData?.einnahmen || 0,
        ausgaben: monthData?.ausgaben || 0,
        gewinn: monthData?.gewinn || 0
      });
      
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // Sammle aktuelle Daten aus allen Finanzmodellen
    const [
      offeneAngebote,
      akzeptierteAngebote,
      offeneRechnungen,
      bezahlteRechnungen,
      gesamtEinnahmen,
      gesamtAusgaben
    ] = await Promise.all([
      Angebot.countDocuments({ status: 'Gesendet' }),
      Angebot.countDocuments({ status: 'Akzeptiert' }),
      Rechnung.countDocuments({ status: { $in: ['Gesendet', 'Überfällig'] } }),
      Rechnung.countDocuments({ status: 'Bezahlt' }),
      Rechnung.aggregate([
        { $match: { status: 'Bezahlt' } },
        { $group: { _id: null, total: { $sum: '$gesamtbetrag' } } }
      ]),
      Projektkosten.aggregate([
        { $match: { bezahlstatus: 'Bezahlt' } },
        { $group: { _id: null, total: { $sum: '$betrag' } } }
      ])
    ]);

    // Aktuelle Übersicht
    const aktuelleUebersicht = {
      offeneAngebote,
      akzeptierteAngebote,
      offeneRechnungen,
      bezahlteRechnungen,
      gesamtEinnahmen: gesamtEinnahmen.length > 0 ? gesamtEinnahmen[0].total : 0,
      gesamtAusgaben: gesamtAusgaben.length > 0 ? gesamtAusgaben[0].total : 0,
      aktuellerGewinn: (gesamtEinnahmen.length > 0 ? gesamtEinnahmen[0].total : 0) - 
                      (gesamtAusgaben.length > 0 ? gesamtAusgaben[0].total : 0)
    };

    // Letzte 5 Rechnungen
    const letzteRechnungen = await Rechnung.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('kunde', 'name')
      .populate('umzug', 'bezeichnung')
      .lean();
      
    // Letzte 5 Ausgaben
    const letzteAusgaben = await Projektkosten.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('umzug', 'bezeichnung')
      .lean();

    res.status(200).json({
      success: true,
      aktuelleUebersicht,
      last12Months,
      letzteRechnungen,
      letzteAusgaben
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Finanzübersicht:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Finanzübersicht',
      error: error.message
    });
  }
};

exports.getMonatsuebersicht = async (req, res) => {
  try {
    const { jahr } = req.params;
    const numericJahr = parseInt(jahr);
    
    if (isNaN(numericJahr)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Jahr-Format'
      });
    }
    
    // Hole alle Monatsübersichten für das angegebene Jahr
    const monatsUebersichten = await Finanzuebersicht.find({
      jahr: numericJahr
    }).sort({ monat: 1 }).lean();
    
    // Wenn keine Daten vorhanden, erzeuge leere Daten für jedes Monat
    const result = [];
    for (let i = 1; i <= 12; i++) {
      const monatsdaten = monatsUebersichten.find(m => m.monat === i) || {
        monat: i,
        einnahmen: 0,
        ausgaben: 0,
        gewinn: 0,
        offeneRechnungen: 0,
        bezahlteRechnungen: 0
      };
      
      const monthName = new Date(numericJahr, i - 1, 1).toLocaleString('de-DE', { month: 'long' });
      result.push({
        monat: i,
        monatName: monthName,
        einnahmen: monatsdaten.einnahmen,
        ausgaben: monatsdaten.ausgaben,
        gewinn: monatsdaten.gewinn,
        offeneRechnungen: monatsdaten.offeneRechnungen,
        bezahlteRechnungen: monatsdaten.bezahlteRechnungen
      });
    }
    
    // Jahresgesamtwerte berechnen
    const jahresgesamtwerte = {
      gesamtEinnahmen: result.reduce((sum, monat) => sum + monat.einnahmen, 0),
      gesamtAusgaben: result.reduce((sum, monat) => sum + monat.ausgaben, 0),
      gesamtGewinn: result.reduce((sum, monat) => sum + monat.gewinn, 0)
    };
    
    res.status(200).json({
      success: true,
      monatsUebersichten: result,
      jahresgesamtwerte
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Monatsübersicht:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Monatsübersicht',
      error: error.message
    });
  }
};

exports.getMonatsdetails = async (req, res) => {
  try {
    const { monat, jahr } = req.params;
    const numericMonat = parseInt(monat);
    const numericJahr = parseInt(jahr);
    
    if (isNaN(numericMonat) || isNaN(numericJahr)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiges Monats- oder Jahr-Format'
      });
    }
    
    // Zeitraum für den Monat bestimmen
    const startDate = new Date(numericJahr, numericMonat - 1, 1);
    const endDate = new Date(numericJahr, numericMonat, 0, 23, 59, 59);
    
    // Hole alle Finanzaktivitäten für den Monat
    const [angebote, rechnungen, ausgaben] = await Promise.all([
      Angebot.find({
        erstelltAm: { $gte: startDate, $lte: endDate }
      }).populate('kunde', 'name').populate('umzug', 'bezeichnung').sort({ erstelltAm: -1 }).lean(),
      
      Rechnung.find({
        ausstellungsdatum: { $gte: startDate, $lte: endDate }
      }).populate('kunde', 'name').populate('umzug', 'bezeichnung').sort({ ausstellungsdatum: -1 }).lean(),
      
      Projektkosten.find({
        datum: { $gte: startDate, $lte: endDate }
      }).populate('umzug', 'bezeichnung').sort({ datum: -1 }).lean()
    ]);
    
    // Lade oder erstelle die Monatsübersicht
    let finanzuebersicht = await Finanzuebersicht.findOne({ 
      jahr: numericJahr, 
      monat: numericMonat 
    }).lean();
    
    if (!finanzuebersicht) {
      // Berechne die Werte, wenn keine Übersicht vorhanden ist
      const bezahlteRechnungen = rechnungen.filter(r => r.status === 'Bezahlt');
      const offeneRechnungen = rechnungen.filter(r => r.status !== 'Bezahlt');
      
      const einnahmen = bezahlteRechnungen.reduce((sum, rechnung) => sum + rechnung.gesamtbetrag, 0);
      const ausgabenGesamt = ausgaben.reduce((sum, kosten) => sum + kosten.betrag, 0);
      
      finanzuebersicht = {
        einnahmen,
        ausgaben: ausgabenGesamt,
        gewinn: einnahmen - ausgabenGesamt,
        offeneRechnungen: offeneRechnungen.length,
        bezahlteRechnungen: bezahlteRechnungen.length,
        angeboteGesendet: angebote.filter(a => a.status === 'Gesendet').length,
        angeboteAkzeptiert: angebote.filter(a => a.status === 'Akzeptiert').length
      };
    }
    
    // Statistiken für Kategorienausgaben
    const ausgabenNachKategorie = {};
    ausgaben.forEach(ausgabe => {
      if (!ausgabenNachKategorie[ausgabe.kategorie]) {
        ausgabenNachKategorie[ausgabe.kategorie] = 0;
      }
      ausgabenNachKategorie[ausgabe.kategorie] += ausgabe.betrag;
    });
    
    const monthName = startDate.toLocaleString('de-DE', { month: 'long' });
    
    res.status(200).json({
      success: true,
      monatName: monthName,
      jahr: numericJahr,
      finanzuebersicht,
      angebote,
      rechnungen,
      ausgaben,
      ausgabenNachKategorie
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Monatsdetails:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Monatsdetails',
      error: error.message
    });
  }
};

// ANGEBOTE CONTROLLER FUNKTIONEN
exports.getAngebote = async (req, res) => {
  try {
    const filter = {};
    
    // Optionale Filter
    if (req.query.status) filter.status = req.query.status;
    if (req.query.kundeId) filter.kunde = req.query.kundeId;
    if (req.query.umzugId) filter.umzug = req.query.umzugId;
    
    // Zeitfilter
    if (req.query.von && req.query.bis) {
      filter.erstelltAm = {
        $gte: new Date(req.query.von),
        $lte: new Date(req.query.bis)
      };
    }
    
    const angebote = await Angebot.find(filter)
      .populate('kunde', 'name')
      .populate('umzug', 'bezeichnung')
      .populate('erstelltVon', 'name')
      .sort({ erstelltAm: -1 });
      
    res.status(200).json({
      success: true,
      anzahl: angebote.length,
      angebote
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebote:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Angebote',
      error: error.message
    });
  }
};

exports.getAngebotById = async (req, res) => {
  try {
    const angebot = await Angebot.findById(req.params.id)
      .populate('kunde', 'name adresse telefon email')
      .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
      .populate('erstelltVon', 'name')
      .populate('dateien');
      
    if (!angebot) {
      return res.status(404).json({
        success: false,
        message: 'Angebot nicht gefunden'
      });
    }
    
    res.status(200).json({
      success: true,
      angebot
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Angebots:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Angebots',
      error: error.message
    });
  }
};

exports.createAngebot = async (req, res) => {
  try {
    // Extrahiere die Angebotsdaten
    const {
      kunde,
      umzug,
      gueltigBis,
      status,
      mehrwertsteuer,
      positionsliste,
      notizen
    } = req.body;
    
    // Generiere eine eindeutige Angebotsnummer
    const angebotNummer = await generateUniqueNumber(Angebot, 'angebotNummer', 'ANG');
    
    // Erstelle das neue Angebot
    const angebot = await Angebot.create({
      angebotNummer,
      kunde,
      umzug,
      gueltigBis,
      status: status || 'Entwurf',
      mehrwertsteuer: mehrwertsteuer || 19,
      positionsliste,
      notizen,
      erstelltVon: req.user.id,
      gesamtbetrag: 0 // Wird durch pre-save-Hook aktualisiert
    });
    
    res.status(201).json({
      success: true,
      message: 'Angebot erfolgreich erstellt',
      angebot
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Angebots:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Angebots',
      error: error.message
    });
  }
};

exports.updateAngebot = async (req, res) => {
  try {
    const angebotId = req.params.id;
    
    // Extrahiere die Angebotsdaten
    const {
      kunde,
      umzug,
      gueltigBis,
      status,
      mehrwertsteuer,
      positionsliste,
      notizen
    } = req.body;
    
    // Prüfe, ob das Angebot existiert
    const angebot = await Angebot.findById(angebotId);
    
    if (!angebot) {
      return res.status(404).json({
        success: false,
        message: 'Angebot nicht gefunden'
      });
    }
    
    // Aktualisiere das Angebot
    angebot.kunde = kunde || angebot.kunde;
    angebot.umzug = umzug || angebot.umzug;
    angebot.gueltigBis = gueltigBis || angebot.gueltigBis;
    angebot.status = status || angebot.status;
    angebot.mehrwertsteuer = mehrwertsteuer || angebot.mehrwertsteuer;
    angebot.positionsliste = positionsliste || angebot.positionsliste;
    angebot.notizen = notizen !== undefined ? notizen : angebot.notizen;
    
    // Speichere die Änderungen
    await angebot.save();
    
    res.status(200).json({
      success: true,
      message: 'Angebot erfolgreich aktualisiert',
      angebot
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Angebots:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Angebots',
      error: error.message
    });
  }
};

exports.deleteAngebot = async (req, res) => {
  try {
    const angebotId = req.params.id;
    
    // Prüfe, ob das Angebot existiert
    const angebot = await Angebot.findById(angebotId);
    
    if (!angebot) {
      return res.status(404).json({
        success: false,
        message: 'Angebot nicht gefunden'
      });
    }
    
    // Prüfe, ob das Angebot bereits akzeptiert wurde oder mit Rechnungen verknüpft ist
    const verknuepfteRechnungen = await Rechnung.countDocuments({ angebot: angebotId });
    
    if (angebot.status === 'Akzeptiert' || verknuepfteRechnungen > 0) {
      return res.status(400).json({
        success: false,
        message: 'Angebot kann nicht gelöscht werden, da es bereits akzeptiert wurde oder mit Rechnungen verknüpft ist'
      });
    }
    
    // Lösche das Angebot
    await angebot.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Angebot erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Angebots:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Angebots',
      error: error.message
    });
  }
};

// RECHNUNGEN CONTROLLER FUNKTIONEN
exports.getRechnungen = async (req, res) => {
  try {
    const filter = {};
    
    // Optionale Filter
    if (req.query.status) filter.status = req.query.status;
    if (req.query.kundeId) filter.kunde = req.query.kundeId;
    if (req.query.umzugId) filter.umzug = req.query.umzugId;
    
    // Zeitfilter
    if (req.query.von && req.query.bis) {
      filter.ausstellungsdatum = {
        $gte: new Date(req.query.von),
        $lte: new Date(req.query.bis)
      };
    }
    
    const rechnungen = await Rechnung.find(filter)
      .populate('kunde', 'name')
      .populate('umzug', 'bezeichnung')
      .populate('angebot', 'angebotNummer')
      .populate('erstelltVon', 'name')
      .sort({ ausstellungsdatum: -1 });
      
    res.status(200).json({
      success: true,
      anzahl: rechnungen.length,
      rechnungen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnungen',
      error: error.message
    });
  }
};

exports.getRechnungById = async (req, res) => {
  try {
    const rechnung = await Rechnung.findById(req.params.id)
      .populate('kunde', 'name adresse telefon email')
      .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
      .populate('angebot', 'angebotNummer')
      .populate('erstelltVon', 'name')
      .populate('dateien');
      
    if (!rechnung) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    res.status(200).json({
      success: true,
      rechnung
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnung',
      error: error.message
    });
  }
};

exports.createRechnung = async (req, res) => {
  try {
    // Extrahiere die Rechnungsdaten
    const {
      kunde,
      umzug,
      angebot,
      faelligkeitsdatum,
      status,
      zahlungsmethode,
      mehrwertsteuer,
      positionsliste,
      notizen
    } = req.body;
    
    // Generiere eine eindeutige Rechnungsnummer
    const rechnungNummer = await generateUniqueNumber(Rechnung, 'rechnungNummer', 'REC');
    
    // Wenn Angebot angegeben ist, prüfe ob es existiert und hole dessen Daten
    let angebotDaten = null;
    
    if (angebot) {
      angebotDaten = await Angebot.findById(angebot);
      
      if (!angebotDaten) {
        return res.status(404).json({
          success: false,
          message: 'Das angegebene Angebot existiert nicht'
        });
      }
    }
    
    // Erstelle die neue Rechnung
    const rechnung = await Rechnung.create({
      rechnungNummer,
      kunde: kunde || (angebotDaten ? angebotDaten.kunde : null),
      umzug: umzug || (angebotDaten ? angebotDaten.umzug : null),
      angebot,
      ausstellungsdatum: new Date(),
      faelligkeitsdatum,
      status: status || 'Entwurf',
      zahlungsmethode: zahlungsmethode || 'Überweisung',
      mehrwertsteuer: mehrwertsteuer || 19,
      positionsliste: positionsliste || (angebotDaten ? angebotDaten.positionsliste : []),
      notizen,
      erstelltVon: req.user.id,
      gesamtbetrag: 0 // Wird durch pre-save-Hook aktualisiert
    });
    
    // Wenn diese Rechnung zu einem Angebot gehört, setze dessen Status auf 'Akzeptiert'
    if (angebotDaten && angebotDaten.status !== 'Akzeptiert') {
      angebotDaten.status = 'Akzeptiert';
      await angebotDaten.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Rechnung erfolgreich erstellt',
      rechnung
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Rechnung',
      error: error.message
    });
  }
};

exports.updateRechnung = async (req, res) => {
  try {
    const rechnungId = req.params.id;
    
    // Extrahiere die Rechnungsdaten
    const {
      kunde,
      umzug,
      angebot,
      ausstellungsdatum,
      faelligkeitsdatum,
      status,
      bezahltAm,
      zahlungsmethode,
      mehrwertsteuer,
      positionsliste,
      notizen,
      zahlungserinnerungen
    } = req.body;
    
    // Prüfe, ob die Rechnung existiert
    const rechnung = await Rechnung.findById(rechnungId);
    
    if (!rechnung) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // Aktualisiere die Rechnung
    rechnung.kunde = kunde || rechnung.kunde;
    rechnung.umzug = umzug || rechnung.umzug;
    rechnung.angebot = angebot || rechnung.angebot;
    rechnung.ausstellungsdatum = ausstellungsdatum || rechnung.ausstellungsdatum;
    rechnung.faelligkeitsdatum = faelligkeitsdatum || rechnung.faelligkeitsdatum;
    
    // Status-Aktualisierung
    if (status && status !== rechnung.status) {
      // Wenn Status auf "Bezahlt" gesetzt wird und noch kein Bezahldatum existiert
      if (status === 'Bezahlt' && !rechnung.bezahltAm && !bezahltAm) {
        rechnung.bezahltAm = new Date();
      }
      rechnung.status = status;
    }
    
    // Weitere Felder aktualisieren
    if (bezahltAm) rechnung.bezahltAm = bezahltAm;
    if (zahlungsmethode) rechnung.zahlungsmethode = zahlungsmethode;
    if (mehrwertsteuer) rechnung.mehrwertsteuer = mehrwertsteuer;
    if (positionsliste) rechnung.positionsliste = positionsliste;
    if (notizen !== undefined) rechnung.notizen = notizen;
    
    // Zahlungserinnerungen
    if (zahlungserinnerungen) {
      if (Array.isArray(zahlungserinnerungen)) {
        rechnung.zahlungserinnerungen = zahlungserinnerungen;
      } else if (typeof zahlungserinnerungen === 'object') {
        // Füge eine einzelne neue Erinnerung hinzu
        rechnung.zahlungserinnerungen.push({
          datum: zahlungserinnerungen.datum || new Date(),
          notiz: zahlungserinnerungen.notiz || 'Zahlungserinnerung gesendet'
        });
      }
    }
    
    // Speichere die Änderungen
    await rechnung.save();
    
    res.status(200).json({
      success: true,
      message: 'Rechnung erfolgreich aktualisiert',
      rechnung
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Rechnung',
      error: error.message
    });
  }
};

exports.deleteRechnung = async (req, res) => {
  try {
    const rechnungId = req.params.id;
    
    // Prüfe, ob die Rechnung existiert
    const rechnung = await Rechnung.findById(rechnungId);
    
    if (!rechnung) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // Prüfe, ob die Rechnung bereits bezahlt ist
    if (rechnung.status === 'Bezahlt') {
      return res.status(400).json({
        success: false,
        message: 'Bezahlte Rechnungen können nicht gelöscht werden'
      });
    }
    
    // Lösche die Rechnung
    await rechnung.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Rechnung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Rechnung',
      error: error.message
    });
  }
};

exports.markRechnungAsBezahlt = async (req, res) => {
  try {
    const rechnungId = req.params.id;
    const { zahlungsmethode, bezahltAm } = req.body;
    
    // Prüfe, ob die Rechnung existiert
    const rechnung = await Rechnung.findById(rechnungId);
    
    if (!rechnung) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    // Setze die Rechnung auf bezahlt
    rechnung.status = 'Bezahlt';
    rechnung.bezahltAm = bezahltAm || new Date();
    
    if (zahlungsmethode) {
      rechnung.zahlungsmethode = zahlungsmethode;
    }
    
    // Speichere die Änderungen
    await rechnung.save();
    
    res.status(200).json({
      success: true,
      message: 'Rechnung als bezahlt markiert',
      rechnung
    });
  } catch (error) {
    console.error('Fehler beim Markieren der Rechnung als bezahlt:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren der Rechnung als bezahlt',
      error: error.message
    });
  }
};

// PROJEKTKOSTEN CONTROLLER FUNKTIONEN
exports.getProjektkosten = async (req, res) => {
  try {
    const filter = {};
    
    // Optionale Filter
    if (req.query.kategorie) filter.kategorie = req.query.kategorie;
    if (req.query.umzugId) filter.umzug = req.query.umzugId;
    if (req.query.bezahlstatus) filter.bezahlstatus = req.query.bezahlstatus;
    
    // Zeitfilter
    if (req.query.von && req.query.bis) {
      filter.datum = {
        $gte: new Date(req.query.von),
        $lte: new Date(req.query.bis)
      };
    }
    
    const projektkosten = await Projektkosten.find(filter)
      .populate('umzug', 'bezeichnung')
      .populate('erstelltVon', 'name')
      .populate('belege')
      .sort({ datum: -1 });
      
    res.status(200).json({
      success: true,
      anzahl: projektkosten.length,
      projektkosten
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Projektkosten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Projektkosten',
      error: error.message
    });
  }
};

exports.getProjektkostenById = async (req, res) => {
  try {
    const projektkosten = await Projektkosten.findById(req.params.id)
      .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
      .populate('erstelltVon', 'name')
      .populate('belege');
      
    if (!projektkosten) {
      return res.status(404).json({
        success: false,
        message: 'Projektkosten nicht gefunden'
      });
    }
    
    res.status(200).json({
      success: true,
      projektkosten
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Projektkosten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Projektkosten',
      error: error.message
    });
  }
};

exports.createProjektkosten = async (req, res) => {
  try {
    // Extrahiere die Projektkosten-Daten
    const {
      bezeichnung,
      umzug,
      kategorie,
      betrag,
      datum,
      beschreibung,
      bezahlstatus,
      bezahltAm,
      zahlungsmethode
    } = req.body;
    
    // Erstelle die neuen Projektkosten
    const projektkosten = await Projektkosten.create({
      bezeichnung,
      umzug,
      kategorie,
      betrag,
      datum: datum || new Date(),
      beschreibung,
      erstelltVon: req.user.id,
      bezahlstatus: bezahlstatus || 'Offen',
      bezahltAm,
      zahlungsmethode
    });
    
    res.status(201).json({
      success: true,
      message: 'Projektkosten erfolgreich erstellt',
      projektkosten
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Projektkosten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Projektkosten',
      error: error.message
    });
  }
};

exports.updateProjektkosten = async (req, res) => {
  try {
    const projektkostenId = req.params.id;
    
    // Extrahiere die Projektkosten-Daten
    const {
      bezeichnung,
      umzug,
      kategorie,
      betrag,
      datum,
      beschreibung,
      bezahlstatus,
      bezahltAm,
      zahlungsmethode
    } = req.body;
    
    // Prüfe, ob die Projektkosten existieren
    const projektkosten = await Projektkosten.findById(projektkostenId);
    
    if (!projektkosten) {
      return res.status(404).json({
        success: false,
        message: 'Projektkosten nicht gefunden'
      });
    }
    
    // Aktualisiere die Projektkosten
    projektkosten.bezeichnung = bezeichnung || projektkosten.bezeichnung;
    projektkosten.umzug = umzug || projektkosten.umzug;
    projektkosten.kategorie = kategorie || projektkosten.kategorie;
    projektkosten.betrag = betrag !== undefined ? betrag : projektkosten.betrag;
    projektkosten.datum = datum || projektkosten.datum;
    projektkosten.beschreibung = beschreibung !== undefined ? beschreibung : projektkosten.beschreibung;
    
    // Status-Aktualisierung
    if (bezahlstatus && bezahlstatus !== projektkosten.bezahlstatus) {
      // Wenn Status auf "Bezahlt" gesetzt wird und noch kein Bezahldatum existiert
      if (bezahlstatus === 'Bezahlt' && !projektkosten.bezahltAm && !bezahltAm) {
        projektkosten.bezahltAm = new Date();
      }
      projektkosten.bezahlstatus = bezahlstatus;
    }
    
    // Weitere Felder aktualisieren
    if (bezahltAm) projektkosten.bezahltAm = bezahltAm;
    if (zahlungsmethode) projektkosten.zahlungsmethode = zahlungsmethode;
    
    // Speichere die Änderungen
    await projektkosten.save();
    
    res.status(200).json({
      success: true,
      message: 'Projektkosten erfolgreich aktualisiert',
      projektkosten
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Projektkosten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Projektkosten',
      error: error.message
    });
  }
};

exports.deleteProjektkosten = async (req, res) => {
  try {
    const projektkostenId = req.params.id;
    
    // Prüfe, ob die Projektkosten existieren
    const projektkosten = await Projektkosten.findById(projektkostenId);
    
    if (!projektkosten) {
      return res.status(404).json({
        success: false,
        message: 'Projektkosten nicht gefunden'
      });
    }
    
    // Lösche die Projektkosten
    await projektkosten.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Projektkosten erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Projektkosten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Projektkosten',
      error: error.message
    });
  }
};

// Hilfsfunktion zur automatischen Aktualisierung der Finanzübersicht
exports.updateFinanzuebersicht = async (jahr, monat) => {
  try {
    // Zeitraum für den Monat bestimmen
    const startDate = new Date(jahr, monat - 1, 1);
    const endDate = new Date(jahr, monat, 0, 23, 59, 59);
    
    // Hole alle Finanzaktivitäten für den Monat
    const [rechnungen, ausgaben, angebote] = await Promise.all([
      Rechnung.find({
        $or: [
          { ausstellungsdatum: { $gte: startDate, $lte: endDate } },
          { bezahltAm: { $gte: startDate, $lte: endDate } }
        ]
      }).lean(),
      
      Projektkosten.find({
        $or: [
          { datum: { $gte: startDate, $lte: endDate } },
          { bezahltAm: { $gte: startDate, $lte: endDate } }
        ]
      }).lean(),
      
      Angebot.find({
        erstelltAm: { $gte: startDate, $lte: endDate }
      }).lean()
    ]);
    
    // Berechne Einnahmen (nur von Rechnungen, die in diesem Monat bezahlt wurden)
    const bezahlteRechnungen = rechnungen.filter(r => 
      r.status === 'Bezahlt' && 
      r.bezahltAm >= startDate && 
      r.bezahltAm <= endDate
    );
    
    const einnahmen = bezahlteRechnungen.reduce((sum, r) => sum + r.gesamtbetrag, 0);
    
    // Berechne Ausgaben (nur von Kosten, die in diesem Monat bezahlt wurden)
    const bezahlteAusgaben = ausgaben.filter(a => 
      a.bezahlstatus === 'Bezahlt' && 
      a.bezahltAm >= startDate && 
      a.bezahltAm <= endDate
    );
    
    const ausgabenGesamt = bezahlteAusgaben.reduce((sum, a) => sum + a.betrag, 0);
    
    // Berechne Ausgaben pro Kategorie
    const umsatzProKategorie = {
      personal: 0,
      fahrzeuge: 0,
      material: 0,
      unterauftraege: 0,
      sonstiges: 0
    };
    
    bezahlteAusgaben.forEach(a => {
      switch(a.kategorie) {
        case 'Personal':
          umsatzProKategorie.personal += a.betrag;
          break;
        case 'Fahrzeuge':
          umsatzProKategorie.fahrzeuge += a.betrag;
          break;
        case 'Material':
          umsatzProKategorie.material += a.betrag;
          break;
        case 'Unterauftrag':
          umsatzProKategorie.unterauftraege += a.betrag;
          break;
        default:
          umsatzProKategorie.sonstiges += a.betrag;
      }
    });
    
    // Finde existierende Finanzübersicht oder erstelle eine neue
    let finanzuebersicht = await Finanzuebersicht.findOne({ jahr, monat });
    
    if (!finanzuebersicht) {
      finanzuebersicht = new Finanzuebersicht({ jahr, monat });
    }
    
    // Aktualisiere die Finanzübersicht
    finanzuebersicht.einnahmen = einnahmen;
    finanzuebersicht.ausgaben = ausgabenGesamt;
    finanzuebersicht.gewinn = einnahmen - ausgabenGesamt;
    finanzuebersicht.offeneRechnungen = rechnungen.filter(r => r.status !== 'Bezahlt').length;
    finanzuebersicht.bezahlteRechnungen = bezahlteRechnungen.length;
    finanzuebersicht.angeboteGesendet = angebote.filter(a => a.status === 'Gesendet').length;
    finanzuebersicht.angeboteAkzeptiert = angebote.filter(a => a.status === 'Akzeptiert').length;
    finanzuebersicht.umsatzProKategorie = umsatzProKategorie;
    finanzuebersicht.zuletzt_aktualisiert = new Date();
    
    // Speichere die Finanzübersicht
    await finanzuebersicht.save();
    
    return finanzuebersicht;
  } catch (error) {
    console.error('Fehler bei der Aktualisierung der Finanzübersicht:', error);
    throw error;
  }
};

// Scheduler für die Aktualisierung der Finanzübersicht aufrufen
// z.B. über einen Cron-Job oder nach Finanzaktionen