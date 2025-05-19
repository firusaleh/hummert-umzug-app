// controllers/aufnahme.controller.fixed.js
const Aufnahme = require('../models/aufnahme.model');
const Umzug = require('../models/umzug.model');
const BaseController = require('./base.controller.enhanced');
const { 
  createOffsetPaginationResponse, 
  createDateRangeFilter,
  createSearchFilter 
} = require('../middleware/pagination');

class AufnahmeController extends BaseController {
  // Alle Aufnahmen abrufen mit Pagination
  async getAllAufnahmen(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const { status, aufnehmer, startDatum, endDatum, search } = req.query;
      
      // Filter erstellen
      const filter = { ...req.filters };
      
      if (status) {
        filter.status = status;
      }
      
      if (aufnehmer) {
        filter.aufnehmer = aufnehmer;
      }
      
      // Date range filter
      const dateFilter = createDateRangeFilter(startDatum, endDatum, 'datum');
      Object.assign(filter, dateFilter);
      
      // Search filter
      if (search) {
        const searchFilter = createSearchFilter(search, ['kundenName', 'kontaktperson']);
        Object.assign(filter, searchFilter);
      }
      
      // Build query
      const query = Aufnahme.find(filter)
        .populate('aufnehmer', 'name')
        .sort(req.sorting || { datum: -1 });
      
      // Count query
      const countQuery = Aufnahme.countDocuments(filter);
      
      // Create paginated response
      const response = await createOffsetPaginationResponse(query, countQuery, req);
      
      return response;
    });
  }

  // Eine Aufnahme nach ID abrufen
  async getAufnahmeById(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const aufnahme = await Aufnahme.findById(req.params.id)
        .populate('aufnehmer', 'name');
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }
      
      return aufnahme;
    });
  }

  // Neue Aufnahme erstellen
  async createAufnahme(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);

      // Daten bereinigen
      const aufnahmeData = this.sanitizeInput({ ...req.body });
      
      // Datumsfelder korrekt formatieren
      if (aufnahmeData.datum) {
        aufnahmeData.datum = new Date(aufnahmeData.datum);
        if (isNaN(aufnahmeData.datum.getTime())) {
          throw this.createValidationError('Ungültiges Datumsformat');
        }
      } else {
        aufnahmeData.datum = new Date();
      }
      
      // Wenn aufnehmer nicht angegeben, aber User vorhanden, dann User als Aufnehmer setzen
      if (!aufnahmeData.aufnehmer && req.user) {
        aufnahmeData.aufnehmer = req.user.id;
      }
      
      // Adressen validieren
      if (aufnahmeData.auszugsadresse && typeof aufnahmeData.auszugsadresse !== 'object') {
        throw this.createValidationError('Auszugsadresse muss ein Objekt sein');
      }
      
      if (aufnahmeData.einzugsadresse && typeof aufnahmeData.einzugsadresse !== 'object') {
        throw this.createValidationError('Einzugsadresse muss ein Objekt sein');
      }

      // Neue Aufnahme erstellen
      const aufnahme = new Aufnahme(aufnahmeData);
      await aufnahme.save({ session });

      // Populierte Version zurückgeben
      await aufnahme.populate('aufnehmer', 'name');

      return this.createSuccessResponse(
        { aufnahme },
        'Aufnahme erfolgreich erstellt',
        201
      );
    });
  }

  // Aufnahme aktualisieren
  async updateAufnahme(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Daten bereinigen
      const updateData = this.sanitizeInput({ ...req.body });
      
      // Datumsfelder korrekt formatieren
      if (updateData.datum) {
        updateData.datum = new Date(updateData.datum);
        if (isNaN(updateData.datum.getTime())) {
          throw this.createValidationError('Ungültiges Datumsformat');
        }
      }
      
      // Adressen validieren
      if (updateData.auszugsadresse && typeof updateData.auszugsadresse !== 'object') {
        throw this.createValidationError('Auszugsadresse muss ein Objekt sein');
      }
      
      if (updateData.einzugsadresse && typeof updateData.einzugsadresse !== 'object') {
        throw this.createValidationError('Einzugsadresse muss ein Objekt sein');
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

      await aufnahme.save({ session });

      // Populierte Version zurückgeben
      await aufnahme.populate('aufnehmer', 'name');

      return this.createSuccessResponse(
        { aufnahme },
        'Aufnahme erfolgreich aktualisiert'
      );
    });
  }

  // Raum hinzufügen
  async addRaum(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { name, flaeche, etage, besonderheiten } = this.sanitizeInput(req.body);

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Neuen Raum hinzufügen
      const neuerRaum = {
        name,
        flaeche: flaeche ? parseFloat(flaeche) : undefined,
        etage: etage ? parseInt(etage) : 0,
        besonderheiten,
        moebel: []
      };

      aufnahme.raeume.push(neuerRaum);
      await aufnahme.save({ session });

      const raum = aufnahme.raeume[aufnahme.raeume.length - 1];

      return this.createSuccessResponse(
        { raum },
        'Raum erfolgreich hinzugefügt',
        201
      );
    });
  }

  // Möbel hinzufügen
  async addMoebel(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { raumId } = req.params;
      const { 
        name, anzahl, kategorie, groesse, 
        gewicht, zerbrechlich, besonderheiten, 
        demontage, montage, verpackung 
      } = this.sanitizeInput(req.body);

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Raum finden
      const raum = aufnahme.raeume.id(raumId);
      
      if (!raum) {
        throw this.createResourceNotFoundError('Raum nicht gefunden');
      }

      // Neues Möbel hinzufügen
      const neuesMoebel = {
        name,
        anzahl: anzahl || 1,
        kategorie: kategorie || 'sonstiges',
        groesse,
        gewicht: gewicht ? parseFloat(gewicht) : undefined,
        zerbrechlich: zerbrechlich || false,
        besonderheiten,
        demontage: demontage || false,
        montage: montage || false,
        verpackung: verpackung || false
      };

      // Volumen berechnen wenn Größenangaben vorhanden
      if (groesse && groesse.laenge && groesse.breite && groesse.hoehe) {
        const volumen = (groesse.laenge * groesse.breite * groesse.hoehe) / 1000000; // cm³ zu m³
        neuesMoebel.groesse.volumen = volumen;
      }

      raum.moebel.push(neuesMoebel);
      
      // Gesamtvolumen der Aufnahme neu berechnen
      aufnahme.gesamtvolumen = this.berechneGesamtvolumen(aufnahme);
      
      await aufnahme.save({ session });

      const moebel = raum.moebel[raum.moebel.length - 1];

      return this.createSuccessResponse(
        { moebel },
        'Möbel erfolgreich hinzugefügt',
        201
      );
    });
  }

  // Möbel aktualisieren
  async updateMoebel(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { raumId, moebelId } = req.params;
      const updateData = this.sanitizeInput(req.body);

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Raum finden
      const raum = aufnahme.raeume.id(raumId);
      
      if (!raum) {
        throw this.createResourceNotFoundError('Raum nicht gefunden');
      }

      // Möbel finden
      const moebel = raum.moebel.id(moebelId);
      
      if (!moebel) {
        throw this.createResourceNotFoundError('Möbel nicht gefunden');
      }

      // Felder aktualisieren
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          moebel[key] = updateData[key];
        }
      });

      // Volumen neu berechnen wenn Größenangaben geändert wurden
      if (updateData.groesse && updateData.groesse.laenge && updateData.groesse.breite && updateData.groesse.hoehe) {
        const volumen = (updateData.groesse.laenge * updateData.groesse.breite * updateData.groesse.hoehe) / 1000000;
        moebel.groesse.volumen = volumen;
      }

      // Gesamtvolumen der Aufnahme neu berechnen
      aufnahme.gesamtvolumen = this.berechneGesamtvolumen(aufnahme);
      
      await aufnahme.save({ session });

      return this.createSuccessResponse(
        { moebel },
        'Möbel erfolgreich aktualisiert'
      );
    });
  }

  // Möbel löschen
  async deleteMoebel(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const { raumId, moebelId } = req.params;

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Raum finden
      const raum = aufnahme.raeume.id(raumId);
      
      if (!raum) {
        throw this.createResourceNotFoundError('Raum nicht gefunden');
      }

      // Möbel finden und entfernen
      const moebel = raum.moebel.id(moebelId);
      
      if (!moebel) {
        throw this.createResourceNotFoundError('Möbel nicht gefunden');
      }

      moebel.remove();
      
      // Gesamtvolumen neu berechnen
      aufnahme.gesamtvolumen = this.berechneGesamtvolumen(aufnahme);
      
      await aufnahme.save({ session });

      return this.createSuccessResponse(
        null,
        'Möbel erfolgreich gelöscht'
      );
    });
  }

  // Raum löschen
  async deleteRaum(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const { raumId } = req.params;

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Raum finden und entfernen
      const raum = aufnahme.raeume.id(raumId);
      
      if (!raum) {
        throw this.createResourceNotFoundError('Raum nicht gefunden');
      }

      raum.remove();
      
      // Gesamtvolumen neu berechnen
      aufnahme.gesamtvolumen = this.berechneGesamtvolumen(aufnahme);
      
      await aufnahme.save({ session });

      return this.createSuccessResponse(
        null,
        'Raum erfolgreich gelöscht'
      );
    });
  }

  // Bild hinzufügen
  async addBild(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { pfad } = this.sanitizeInput(req.body);

      if (!pfad) {
        throw this.createValidationError('Bildpfad ist erforderlich');
      }

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Neues Bild hinzufügen
      aufnahme.bilder.push(pfad);
      await aufnahme.save({ session });

      return this.createSuccessResponse(
        { pfad },
        'Bild erfolgreich hinzugefügt',
        201
      );
    });
  }

  // Bild löschen
  async deleteBild(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const { pfad } = req.params;

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Bild entfernen
      const index = aufnahme.bilder.indexOf(pfad);
      if (index === -1) {
        throw this.createResourceNotFoundError('Bild nicht gefunden');
      }

      aufnahme.bilder.splice(index, 1);
      await aufnahme.save({ session });

      return this.createSuccessResponse(
        null,
        'Bild erfolgreich gelöscht'
      );
    });
  }

  // Angebot erstellen
  async erstelleAngebot(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { netto, brutto } = this.sanitizeInput(req.body);

      if (!netto || !brutto) {
        throw this.createValidationError('Netto- und Bruttopreis sind erforderlich');
      }

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      // Angebotspreis setzen
      aufnahme.angebotspreis = {
        netto: parseFloat(netto),
        brutto: parseFloat(brutto)
      };
      
      // Status aktualisieren
      aufnahme.status = 'angebot_erstellt';
      aufnahme.statusHistory = aufnahme.statusHistory || [];
      aufnahme.statusHistory.push({
        status: 'angebot_erstellt',
        datum: new Date(),
        aktion: 'Angebot erstellt',
        benutzer: req.user.id
      });

      await aufnahme.save({ session });

      return this.createSuccessResponse(
        { angebotspreis: aufnahme.angebotspreis },
        'Angebot erfolgreich erstellt'
      );
    });
  }

  // Status ändern
  async updateStatus(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      this.checkValidationErrors(req);

      const { status } = this.sanitizeInput(req.body);
      const erlaubteStatus = ['entwurf', 'aktiv', 'angebot_erstellt', 'angebot_angenommen', 'abgeschlossen', 'abgebrochen'];
      
      if (!erlaubteStatus.includes(status)) {
        throw this.createValidationError(`Ungültiger Status. Erlaubt sind: ${erlaubteStatus.join(', ')}`);
      }

      // Aufnahme finden
      const aufnahme = await Aufnahme.findById(req.params.id).session(session);
      
      if (!aufnahme) {
        throw this.createResourceNotFoundError('Aufnahme nicht gefunden');
      }

      const altersStatus = aufnahme.status;
      aufnahme.status = status;
      aufnahme.statusHistory = aufnahme.statusHistory || [];
      aufnahme.statusHistory.push({
        status,
        datum: new Date(),
        aktion: `Status geändert von ${altersStatus} zu ${status}`,
        benutzer: req.user.id
      });

      await aufnahme.save({ session });

      return this.createSuccessResponse(
        { aufnahme },
        'Status erfolgreich aktualisiert'
      );
    });
  }

  // Hilfsmethode zur Berechnung des Gesamtvolumens
  berechneGesamtvolumen(aufnahme) {
    let gesamtvolumen = 0;
    
    aufnahme.raeume.forEach(raum => {
      raum.moebel.forEach(moebel => {
        if (moebel.groesse && moebel.groesse.volumen) {
          gesamtvolumen += moebel.groesse.volumen * moebel.anzahl;
        }
      });
    });
    
    return Math.round(gesamtvolumen * 100) / 100; // Auf 2 Dezimalstellen runden
  }
}

// Exportiere Singleton-Instanz
module.exports = new AufnahmeController();