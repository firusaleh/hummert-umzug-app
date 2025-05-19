// controllers/mitarbeiter.controller.fixed.js
const Mitarbeiter = require('../models/mitarbeiter.model');
const User = require('../models/user');
const BaseController = require('./base.controller.enhanced');
const { 
  createOffsetPaginationResponse, 
  createSearchFilter 
} = require('../middleware/pagination');

class MitarbeiterController extends BaseController {
  // Alle Mitarbeiter abrufen mit Pagination
  async getAllMitarbeiter(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
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
      
      return response;
    });
  }

  // Einen Mitarbeiter nach ID abrufen
  async getMitarbeiterById(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const mitarbeiter = await Mitarbeiter.findById(req.params.id)
        .populate('userId', 'name email role');
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      return mitarbeiter;
    });
  }

  // Neuen Mitarbeiter erstellen
  async createMitarbeiter(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);
      
      // Daten bereinigen
      const data = this.sanitizeInput(req.body);
      
      // In der Anfrage oder vom authentifizierten Benutzer die Benutzer-ID holen
      const userId = data.userId || req.user.id;
      
      if (!userId) {
        throw this.createValidationError('Benutzer-ID ist erforderlich', 'userId');
      }
      
      // Prüfen, ob bereits ein Mitarbeiter mit dieser userId existiert
      const existingMitarbeiter = await Mitarbeiter.findOne({ userId }).session(session);
      if (existingMitarbeiter) {
        throw this.createValidationError('Es existiert bereits ein Mitarbeiter für diesen Benutzer', 'userId');
      }
      
      // Mitarbeiterdaten zusammenstellen
      const mitarbeiterData = {
        ...data,
        userId,
        createdBy: req.user.id
      };
      
      // Mitarbeiter in der Datenbank erstellen
      const mitarbeiter = new Mitarbeiter(mitarbeiterData);
      await mitarbeiter.save({ session });
      
      // Populated mitarbeiter zurückgeben
      await mitarbeiter.populate('userId', 'name email role');
      
      return this.createSuccessResponse(
        { mitarbeiter },
        'Mitarbeiter erfolgreich erstellt',
        201
      );
    });
  }

  // Mitarbeiter aktualisieren
  async updateMitarbeiter(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);
      
      const updateData = this.sanitizeInput(req.body);
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Felder aktualisieren
      const updateFields = [
        'vorname', 'nachname', 'telefon', 'adresse', 
        'position', 'einstellungsdatum', 'faehigkeiten', 
        'fuehrerscheinklassen', 'notizen', 'isActive'
      ];
      
      updateFields.forEach(field => {
        if (updateData[field] !== undefined) {
          mitarbeiter[field] = updateData[field];
        }
      });
      
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        { mitarbeiter },
        'Mitarbeiter erfolgreich aktualisiert'
      );
    });
  }

  // Arbeitszeit hinzufügen
  async addArbeitszeit(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);
      
      const { datum, startzeit, endzeit, pausen, notizen } = this.sanitizeInput(req.body);
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Validierung: Startzeit vor Endzeit
      const start = new Date(`${datum}T${startzeit}`);
      const end = new Date(`${datum}T${endzeit}`);
      
      if (start >= end) {
        throw this.createValidationError('Startzeit muss vor Endzeit liegen');
      }
      
      // Neue Arbeitszeit hinzufügen
      const arbeitszeit = {
        datum: new Date(datum),
        startzeit,
        endzeit,
        pausen: pausen || [],
        notizen,
        berechnet: this.calculateArbeitszeit(start, end, pausen)
      };
      
      mitarbeiter.arbeitszeiten.push(arbeitszeit);
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        { arbeitszeit: mitarbeiter.arbeitszeiten[mitarbeiter.arbeitszeiten.length - 1] },
        'Arbeitszeit erfolgreich hinzugefügt',
        201
      );
    });
  }

  // Arbeitszeit aktualisieren
  async updateArbeitszeit(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);
      
      const { arbeitszeitId } = req.params;
      const updateData = this.sanitizeInput(req.body);
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Arbeitszeit finden
      const arbeitszeit = mitarbeiter.arbeitszeiten.id(arbeitszeitId);
      
      if (!arbeitszeit) {
        throw this.createResourceNotFoundError('Arbeitszeit nicht gefunden');
      }
      
      // Felder aktualisieren
      if (updateData.datum !== undefined) arbeitszeit.datum = new Date(updateData.datum);
      if (updateData.startzeit !== undefined) arbeitszeit.startzeit = updateData.startzeit;
      if (updateData.endzeit !== undefined) arbeitszeit.endzeit = updateData.endzeit;
      if (updateData.pausen !== undefined) arbeitszeit.pausen = updateData.pausen;
      if (updateData.notizen !== undefined) arbeitszeit.notizen = updateData.notizen;
      
      // Arbeitszeit neu berechnen
      if (updateData.startzeit || updateData.endzeit || updateData.pausen) {
        const start = new Date(`${arbeitszeit.datum.toISOString().split('T')[0]}T${arbeitszeit.startzeit}`);
        const end = new Date(`${arbeitszeit.datum.toISOString().split('T')[0]}T${arbeitszeit.endzeit}`);
        arbeitszeit.berechnet = this.calculateArbeitszeit(start, end, arbeitszeit.pausen);
      }
      
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        { arbeitszeit },
        'Arbeitszeit erfolgreich aktualisiert'
      );
    });
  }

  // Arbeitszeit löschen
  async deleteArbeitszeit(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const { arbeitszeitId } = req.params;
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Arbeitszeit finden und entfernen
      const arbeitszeit = mitarbeiter.arbeitszeiten.id(arbeitszeitId);
      
      if (!arbeitszeit) {
        throw this.createResourceNotFoundError('Arbeitszeit nicht gefunden');
      }
      
      arbeitszeit.remove();
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        null,
        'Arbeitszeit erfolgreich gelöscht'
      );
    });
  }

  // Dokument hinzufügen
  async addDokument(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      // Validierungsfehler prüfen
      this.checkValidationErrors(req);
      
      const { name, pfad } = this.sanitizeInput(req.body);
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Neues Dokument hinzufügen
      mitarbeiter.dokumente.push({
        name,
        pfad,
        datum: new Date()
      });
      
      await mitarbeiter.save({ session });
      
      const dokument = mitarbeiter.dokumente[mitarbeiter.dokumente.length - 1];
      
      return this.createSuccessResponse(
        { dokument },
        'Dokument erfolgreich hinzugefügt',
        201
      );
    });
  }

  // Dokument löschen
  async deleteDokument(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const { dokumentId } = req.params;
      
      // Mitarbeiter finden
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      // Dokument finden und entfernen
      const dokument = mitarbeiter.dokumente.id(dokumentId);
      
      if (!dokument) {
        throw this.createResourceNotFoundError('Dokument nicht gefunden');
      }
      
      dokument.remove();
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        null,
        'Dokument erfolgreich gelöscht'
      );
    });
  }

  // Mitarbeiter deaktivieren (soft delete)
  async deaktiviereMitarbeiter(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      mitarbeiter.isActive = false;
      mitarbeiter.deaktiviertAm = new Date();
      mitarbeiter.deaktiviertVon = req.user.id;
      
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        { mitarbeiter },
        'Mitarbeiter erfolgreich deaktiviert'
      );
    });
  }

  // Mitarbeiter reaktivieren
  async aktiviereMitarbeiter(req, res) {
    return await this.executeWithTransaction(req, res, async (session) => {
      const mitarbeiter = await Mitarbeiter.findById(req.params.id).session(session);
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      mitarbeiter.isActive = true;
      mitarbeiter.reaktiviertAm = new Date();
      mitarbeiter.reaktiviertVon = req.user.id;
      
      await mitarbeiter.save({ session });
      
      return this.createSuccessResponse(
        { mitarbeiter },
        'Mitarbeiter erfolgreich reaktiviert'
      );
    });
  }

  // Arbeitszeiten für einen Zeitraum abrufen
  async getArbeitszeitenByDateRange(req, res) {
    return await this.executeWithErrorHandling(req, res, async () => {
      const { startDatum, endDatum } = req.query;
      
      if (!startDatum || !endDatum) {
        throw this.createValidationError('Start- und Enddatum sind erforderlich');
      }
      
      const mitarbeiter = await Mitarbeiter.findById(req.params.id)
        .populate('userId', 'name email');
      
      if (!mitarbeiter) {
        throw this.createResourceNotFoundError('Mitarbeiter nicht gefunden');
      }
      
      const start = new Date(startDatum);
      const end = new Date(endDatum);
      
      const arbeitszeiten = mitarbeiter.arbeitszeiten.filter(az => {
        const azDatum = new Date(az.datum);
        return azDatum >= start && azDatum <= end;
      });
      
      const gesamtstunden = arbeitszeiten.reduce((sum, az) => sum + (az.berechnet || 0), 0);
      
      return {
        mitarbeiter: {
          id: mitarbeiter._id,
          name: `${mitarbeiter.vorname} ${mitarbeiter.nachname}`,
          position: mitarbeiter.position
        },
        zeitraum: {
          start: startDatum,
          end: endDatum
        },
        arbeitszeiten,
        gesamtstunden,
        anzahlTage: arbeitszeiten.length
      };
    });
  }

  // Hilfsmethode zur Berechnung der Arbeitszeit
  calculateArbeitszeit(start, end, pausen = []) {
    let gesamtzeit = (end - start) / 1000 / 60; // in Minuten
    
    // Pausen abziehen
    const pausenzeit = pausen.reduce((sum, pause) => {
      const pauseStart = new Date(`1970-01-01T${pause.start}`);
      const pauseEnd = new Date(`1970-01-01T${pause.ende}`);
      return sum + (pauseEnd - pauseStart) / 1000 / 60;
    }, 0);
    
    return Math.max(0, (gesamtzeit - pausenzeit) / 60); // in Stunden
  }
}

// Exportiere Singleton-Instanz
module.exports = new MitarbeiterController();