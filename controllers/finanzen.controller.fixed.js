// controllers/finanzen.controller.fixed.js
const Angebot = require('../models/angebot.model');
const Rechnung = require('../models/rechnung.model');
const Projektkosten = require('../models/projektkosten.model');
const Finanzuebersicht = require('../models/finanzuebersicht.model');
const Umzug = require('../models/umzug.model');
const BaseController = require('./base.controller.enhanced');
const mongoose = require('mongoose');

class FinanzenController extends BaseController {
  // Hilfsfunktion zum Generieren einzigartiger Nummern
  async generateUniqueNumber(model, fieldName, prefix) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      // Zähle vorhandene Dokumente dieses Monats
      const countQuery = {};
      const regexPattern = `^${prefix}${year}${month}`;
      countQuery[fieldName] = { $regex: regexPattern };
      
      const count = await model.countDocuments(countQuery).session(session);
      const number = (count + 1).toString().padStart(3, '0');
      const uniqueNumber = `${prefix}${year}${month}-${number}`;
      
      await session.commitTransaction();
      return uniqueNumber;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ÜBERSICHT CONTROLLER FUNKTIONEN
  async getFinanzuebersicht(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
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

      return {
        success: true,
        aktuelleUebersicht,
        last12Months,
        letzteRechnungen,
        letzteAusgaben
      };
    });
  }

  async getMonatsuebersicht(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const { jahr } = req.params;
      const numericJahr = parseInt(jahr);
      
      if (isNaN(numericJahr)) {
        throw this.createValidationError('Ungültiges Jahr-Format');
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
      
      return {
        success: true,
        monatsUebersichten: result,
        jahresgesamtwerte
      };
    });
  }

  async getMonatsdetails(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const { monat, jahr } = req.params;
      const numericMonat = parseInt(monat);
      const numericJahr = parseInt(jahr);
      
      if (isNaN(numericMonat) || isNaN(numericJahr)) {
        throw this.createValidationError('Ungültiges Monats- oder Jahr-Format');
      }
      
      if (numericMonat < 1 || numericMonat > 12) {
        throw this.createValidationError('Monat muss zwischen 1 und 12 liegen');
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
      
      return {
        success: true,
        monatName: monthName,
        jahr: numericJahr,
        finanzuebersicht,
        angebote,
        rechnungen,
        ausgaben,
        ausgabenNachKategorie
      };
    });
  }

  // ANGEBOTE CONTROLLER FUNKTIONEN
  async getAngebote(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
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
        
      return {
        success: true,
        anzahl: angebote.length,
        angebote
      };
    });
  }

  async getAngebotById(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const angebot = await Angebot.findById(req.params.id)
        .populate('kunde', 'name adresse telefon email')
        .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
        .populate('erstelltVon', 'name')
        .populate('dateien');
        
      if (!angebot) {
        throw this.createResourceNotFoundError('Angebot nicht gefunden');
      }
      
      return {
        success: true,
        angebot
      };
    });
  }

  async createAngebot(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      // Extrahiere die Angebotsdaten
      const {
        kunde,
        umzug,
        gueltigBis,
        status,
        mehrwertsteuer,
        positionsliste,
        notizen
      } = this.sanitizeInput(req.body);
      
      // Generiere eine eindeutige Angebotsnummer
      const angebotNummer = await this.generateUniqueNumber(Angebot, 'angebotNummer', 'ANG');
      
      // Erstelle das neue Angebot
      const angebot = new Angebot({
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

      await angebot.save({ session });
      
      return this.createSuccessResponse(
        { angebot },
        'Angebot erfolgreich erstellt',
        201
      );
    });
  }

  async updateAngebot(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const angebotId = req.params.id;
      
      // Extrahiere die Angebotsdaten
      const updateData = this.sanitizeInput(req.body);
      
      // Prüfe, ob das Angebot existiert
      const angebot = await Angebot.findById(angebotId).session(session);
      
      if (!angebot) {
        throw this.createResourceNotFoundError('Angebot nicht gefunden');
      }
      
      // Aktualisiere die Felder
      const updateFields = [
        'kunde', 'umzug', 'gueltigBis', 'status', 
        'mehrwertsteuer', 'positionsliste', 'notizen'
      ];
      
      updateFields.forEach(field => {
        if (updateData[field] !== undefined) {
          angebot[field] = updateData[field];
        }
      });
      
      // Speichere die Änderungen
      await angebot.save({ session });
      
      return this.createSuccessResponse(
        { angebot },
        'Angebot erfolgreich aktualisiert'
      );
    });
  }

  async deleteAngebot(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const angebotId = req.params.id;
      
      // Prüfe, ob das Angebot existiert
      const angebot = await Angebot.findById(angebotId).session(session);
      
      if (!angebot) {
        throw this.createResourceNotFoundError('Angebot nicht gefunden');
      }
      
      // Prüfe, ob das Angebot bereits akzeptiert wurde oder mit Rechnungen verknüpft ist
      const verknuepfteRechnungen = await Rechnung.countDocuments({ angebot: angebotId }).session(session);
      
      if (angebot.status === 'Akzeptiert' || verknuepfteRechnungen > 0) {
        throw this.createBusinessLogicError(
          'Angebot kann nicht gelöscht werden, da es bereits akzeptiert wurde oder mit Rechnungen verknüpft ist'
        );
      }
      
      // Lösche das Angebot
      await angebot.deleteOne({ session });
      
      return this.createSuccessResponse(
        null,
        'Angebot erfolgreich gelöscht'
      );
    });
  }

  // RECHNUNGEN CONTROLLER FUNKTIONEN
  async getRechnungen(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
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
        
      return {
        success: true,
        anzahl: rechnungen.length,
        rechnungen
      };
    });
  }

  async getRechnungById(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const rechnung = await Rechnung.findById(req.params.id)
        .populate('kunde', 'name adresse telefon email')
        .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
        .populate('angebot', 'angebotNummer')
        .populate('erstelltVon', 'name')
        .populate('dateien');
        
      if (!rechnung) {
        throw this.createResourceNotFoundError('Rechnung nicht gefunden');
      }
      
      return {
        success: true,
        rechnung
      };
    });
  }

  async createRechnung(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

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
      } = this.sanitizeInput(req.body);
      
      // Generiere eine eindeutige Rechnungsnummer
      const rechnungNummer = await this.generateUniqueNumber(Rechnung, 'rechnungNummer', 'REC');
      
      // Wenn Angebot angegeben ist, prüfe ob es existiert und hole dessen Daten
      let angebotDaten = null;
      
      if (angebot) {
        angebotDaten = await Angebot.findById(angebot).session(session);
        
        if (!angebotDaten) {
          throw this.createResourceNotFoundError('Das angegebene Angebot existiert nicht');
        }
      }
      
      // Erstelle die neue Rechnung
      const rechnung = new Rechnung({
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

      await rechnung.save({ session });
      
      // Wenn diese Rechnung zu einem Angebot gehört, setze dessen Status auf 'Akzeptiert'
      if (angebotDaten && angebotDaten.status !== 'Akzeptiert') {
        angebotDaten.status = 'Akzeptiert';
        await angebotDaten.save({ session });
      }
      
      return this.createSuccessResponse(
        { rechnung },
        'Rechnung erfolgreich erstellt',
        201
      );
    });
  }

  async updateRechnung(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const rechnungId = req.params.id;
      
      // Extrahiere die Rechnungsdaten
      const updateData = this.sanitizeInput(req.body);
      
      // Prüfe, ob die Rechnung existiert
      const rechnung = await Rechnung.findById(rechnungId).session(session);
      
      if (!rechnung) {
        throw this.createResourceNotFoundError('Rechnung nicht gefunden');
      }
      
      // Aktualisiere die Felder
      const updateFields = [
        'kunde', 'umzug', 'angebot', 'ausstellungsdatum', 
        'faelligkeitsdatum', 'zahlungsmethode', 'mehrwertsteuer', 
        'positionsliste', 'notizen'
      ];
      
      updateFields.forEach(field => {
        if (updateData[field] !== undefined) {
          rechnung[field] = updateData[field];
        }
      });
      
      // Status-Aktualisierung mit Sonderbehandlung
      if (updateData.status && updateData.status !== rechnung.status) {
        // Wenn Status auf "Bezahlt" gesetzt wird und noch kein Bezahldatum existiert
        if (updateData.status === 'Bezahlt' && !rechnung.bezahltAm && !updateData.bezahltAm) {
          rechnung.bezahltAm = new Date();
        }
        rechnung.status = updateData.status;
      }
      
      // Bezahldatum separat setzen wenn vorhanden
      if (updateData.bezahltAm) {
        rechnung.bezahltAm = new Date(updateData.bezahltAm);
      }
      
      // Zahlungserinnerungen
      if (updateData.zahlungserinnerungen) {
        if (Array.isArray(updateData.zahlungserinnerungen)) {
          rechnung.zahlungserinnerungen = updateData.zahlungserinnerungen;
        } else if (typeof updateData.zahlungserinnerungen === 'object') {
          // Füge eine einzelne neue Erinnerung hinzu
          rechnung.zahlungserinnerungen.push({
            datum: updateData.zahlungserinnerungen.datum || new Date(),
            notiz: updateData.zahlungserinnerungen.notiz || 'Zahlungserinnerung gesendet'
          });
        }
      }
      
      // Speichere die Änderungen
      await rechnung.save({ session });
      
      // Aktualisiere Finanzübersicht wenn nötig
      if (updateData.status === 'Bezahlt' || updateData.bezahltAm) {
        const bezahltDatum = rechnung.bezahltAm || new Date();
        await this.updateFinanzuebersicht(
          bezahltDatum.getFullYear(), 
          bezahltDatum.getMonth() + 1
        );
      }
      
      return this.createSuccessResponse(
        { rechnung },
        'Rechnung erfolgreich aktualisiert'
      );
    });
  }

  async deleteRechnung(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const rechnungId = req.params.id;
      
      // Prüfe, ob die Rechnung existiert
      const rechnung = await Rechnung.findById(rechnungId).session(session);
      
      if (!rechnung) {
        throw this.createResourceNotFoundError('Rechnung nicht gefunden');
      }
      
      // Prüfe, ob die Rechnung bereits bezahlt ist
      if (rechnung.status === 'Bezahlt') {
        throw this.createBusinessLogicError('Bezahlte Rechnungen können nicht gelöscht werden');
      }
      
      // Lösche die Rechnung
      await rechnung.deleteOne({ session });
      
      return this.createSuccessResponse(
        null,
        'Rechnung erfolgreich gelöscht'
      );
    });
  }

  async markRechnungAsBezahlt(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const rechnungId = req.params.id;
      const { zahlungsmethode, bezahltAm } = this.sanitizeInput(req.body);
      
      // Prüfe, ob die Rechnung existiert
      const rechnung = await Rechnung.findById(rechnungId).session(session);
      
      if (!rechnung) {
        throw this.createResourceNotFoundError('Rechnung nicht gefunden');
      }
      
      // Setze die Rechnung auf bezahlt
      rechnung.status = 'Bezahlt';
      rechnung.bezahltAm = bezahltAm ? new Date(bezahltAm) : new Date();
      
      if (zahlungsmethode) {
        rechnung.zahlungsmethode = zahlungsmethode;
      }
      
      // Speichere die Änderungen
      await rechnung.save({ session });
      
      // Aktualisiere Finanzübersicht
      await this.updateFinanzuebersicht(
        rechnung.bezahltAm.getFullYear(), 
        rechnung.bezahltAm.getMonth() + 1
      );
      
      return this.createSuccessResponse(
        { rechnung },
        'Rechnung als bezahlt markiert'
      );
    });
  }

  // PROJEKTKOSTEN CONTROLLER FUNKTIONEN
  async getProjektkosten(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
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
        
      return {
        success: true,
        anzahl: projektkosten.length,
        projektkosten
      };
    });
  }

  async getProjektkostenById(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const projektkosten = await Projektkosten.findById(req.params.id)
        .populate('umzug', 'bezeichnung startAdresse zielAdresse umzugsDatum')
        .populate('erstelltVon', 'name')
        .populate('belege');
        
      if (!projektkosten) {
        throw this.createResourceNotFoundError('Projektkosten nicht gefunden');
      }
      
      return {
        success: true,
        projektkosten
      };
    });
  }

  async createProjektkosten(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

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
      } = this.sanitizeInput(req.body);
      
      // Erstelle die neuen Projektkosten
      const projektkosten = new Projektkosten({
        bezeichnung,
        umzug,
        kategorie,
        betrag: parseFloat(betrag),
        datum: datum ? new Date(datum) : new Date(),
        beschreibung,
        erstelltVon: req.user.id,
        bezahlstatus: bezahlstatus || 'Offen',
        bezahltAm: bezahltAm ? new Date(bezahltAm) : undefined,
        zahlungsmethode
      });

      await projektkosten.save({ session });
      
      // Aktualisiere Finanzübersicht wenn bereits bezahlt
      if (projektkosten.bezahlstatus === 'Bezahlt' && projektkosten.bezahltAm) {
        await this.updateFinanzuebersicht(
          projektkosten.bezahltAm.getFullYear(), 
          projektkosten.bezahltAm.getMonth() + 1
        );
      }
      
      return this.createSuccessResponse(
        { projektkosten },
        'Projektkosten erfolgreich erstellt',
        201
      );
    });
  }

  async updateProjektkosten(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const projektkostenId = req.params.id;
      
      // Extrahiere die Projektkosten-Daten
      const updateData = this.sanitizeInput(req.body);
      
      // Prüfe, ob die Projektkosten existieren
      const projektkosten = await Projektkosten.findById(projektkostenId).session(session);
      
      if (!projektkosten) {
        throw this.createResourceNotFoundError('Projektkosten nicht gefunden');
      }
      
      // Aktualisiere die Felder
      const updateFields = [
        'bezeichnung', 'umzug', 'kategorie', 'betrag', 
        'datum', 'beschreibung', 'zahlungsmethode'
      ];
      
      updateFields.forEach(field => {
        if (updateData[field] !== undefined) {
          if (field === 'betrag') {
            projektkosten[field] = parseFloat(updateData[field]);
          } else if (field === 'datum') {
            projektkosten[field] = new Date(updateData[field]);
          } else {
            projektkosten[field] = updateData[field];
          }
        }
      });
      
      // Status-Aktualisierung mit Sonderbehandlung
      if (updateData.bezahlstatus && updateData.bezahlstatus !== projektkosten.bezahlstatus) {
        // Wenn Status auf "Bezahlt" gesetzt wird und noch kein Bezahldatum existiert
        if (updateData.bezahlstatus === 'Bezahlt' && !projektkosten.bezahltAm && !updateData.bezahltAm) {
          projektkosten.bezahltAm = new Date();
        }
        projektkosten.bezahlstatus = updateData.bezahlstatus;
      }
      
      // Bezahldatum separat setzen wenn vorhanden
      if (updateData.bezahltAm) {
        projektkosten.bezahltAm = new Date(updateData.bezahltAm);
      }
      
      // Speichere die Änderungen
      await projektkosten.save({ session });
      
      // Aktualisiere Finanzübersicht wenn nötig
      if ((updateData.bezahlstatus === 'Bezahlt' || updateData.bezahltAm) && projektkosten.bezahltAm) {
        await this.updateFinanzuebersicht(
          projektkosten.bezahltAm.getFullYear(), 
          projektkosten.bezahltAm.getMonth() + 1
        );
      }
      
      return this.createSuccessResponse(
        { projektkosten },
        'Projektkosten erfolgreich aktualisiert'
      );
    });
  }

  async deleteProjektkosten(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const projektkostenId = req.params.id;
      
      // Prüfe, ob die Projektkosten existieren
      const projektkosten = await Projektkosten.findById(projektkostenId).session(session);
      
      if (!projektkosten) {
        throw this.createResourceNotFoundError('Projektkosten nicht gefunden');
      }
      
      // Lösche die Projektkosten
      await projektkosten.deleteOne({ session });
      
      return this.createSuccessResponse(
        null,
        'Projektkosten erfolgreich gelöscht'
      );
    });
  }

  // Hilfsfunktion zur automatischen Aktualisierung der Finanzübersicht
  async updateFinanzuebersicht(jahr, monat) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      
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
        }).session(session).lean(),
        
        Projektkosten.find({
          $or: [
            { datum: { $gte: startDate, $lte: endDate } },
            { bezahltAm: { $gte: startDate, $lte: endDate } }
          ]
        }).session(session).lean(),
        
        Angebot.find({
          erstelltAm: { $gte: startDate, $lte: endDate }
        }).session(session).lean()
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
      let finanzuebersicht = await Finanzuebersicht.findOne({ jahr, monat }).session(session);
      
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
      await finanzuebersicht.save({ session });
      
      await session.commitTransaction();
      return finanzuebersicht;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

// Exportiere Singleton-Instanz
module.exports = new FinanzenController();