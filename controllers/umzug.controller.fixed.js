// controllers/umzug.controller.fixed.js
const BaseController = require('./base.controller');
const Umzug = require('../models/umzug.model');
const Aufnahme = require('../models/aufnahme.model');
const Benachrichtigung = require('../models/benachrichtigung.model');
const { validationResult } = require('express-validator');

class UmzugController extends BaseController {
  /**
   * Get all Umzüge with pagination and filtering
   */
  static getAllUmzuege = this.asyncHandler(async (req, res) => {
    try {
      // Create filter from query parameters
      const allowedFilters = ['status', 'startDatum', 'endDatum', 'search', 'auftraggeber'];
      const filter = this.createFilter(req.query, allowedFilters);

      // Handle date range
      if (req.query.startDatum || req.query.endDatum) {
        filter.startDatum = {};
        if (req.query.startDatum) {
          filter.startDatum.$gte = new Date(req.query.startDatum);
        }
        if (req.query.endDatum) {
          filter.startDatum.$lte = new Date(req.query.endDatum);
        }
      }

      // Handle search
      if (req.query.search) {
        filter.$or = [
          { kundennummer: { $regex: req.query.search, $options: 'i' } },
          { 'auftraggeber.name': { $regex: req.query.search, $options: 'i' } }
        ];
      }

      // Pagination
      const pagination = this.createPagination(req.query);
      const sort = this.createSort(req.query);

      // Execute query
      const [umzuege, total] = await Promise.all([
        Umzug.find(filter)
          .populate('mitarbeiter.mitarbeiterId', 'vorname nachname')
          .populate('aufnahmeId')
          .sort(sort)
          .limit(pagination.limit)
          .skip(pagination.skip)
          .lean(),
        Umzug.countDocuments(filter)
      ]);

      const response = this.paginatedResponse(umzuege, total, pagination);
      return this.success(res, response);

    } catch (error) {
      return this.handleError(res, error, 'Failed to retrieve Umzüge');
    }
  });

  /**
   * Get Umzug by ID
   */
  static getUmzugById = this.asyncHandler(async (req, res) => {
    try {
      const umzug = await Umzug.findById(req.params.id)
        .populate('mitarbeiter.mitarbeiterId', 'vorname nachname telefon')
        .populate('aufnahmeId')
        .lean();

      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      return this.success(res, { umzug });

    } catch (error) {
      return this.handleError(res, error, 'Failed to retrieve Umzug');
    }
  });

  /**
   * Create new Umzug
   */
  static createUmzug = this.asyncHandler(async (req, res) => {
    // Validate input
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      // Clean and validate data
      const umzugData = this.cleanUmzugData(req.body);

      // Validate aufnahmeId if provided
      if (umzugData.aufnahmeId) {
        const aufnahme = await Aufnahme.findById(umzugData.aufnahmeId);
        if (!aufnahme) {
          return this.error(res, 'Referenced Aufnahme does not exist', 400);
        }
      }

      // Create Umzug
      const umzug = new Umzug(umzugData);
      await umzug.save();

      // Populate references for response
      await umzug.populate('mitarbeiter.mitarbeiterId', 'vorname nachname');
      await umzug.populate('aufnahmeId');

      return this.success(res, { umzug }, 'Umzug created successfully', 201);

    } catch (error) {
      return this.handleError(res, error, 'Failed to create Umzug');
    }
  });

  /**
   * Update Umzug
   */
  static updateUmzug = this.asyncHandler(async (req, res) => {
    // Validate input
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      // Find Umzug
      const umzug = await Umzug.findById(req.params.id);
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      // Clean and validate data
      const updateData = this.cleanUmzugData(req.body);

      // Validate aufnahmeId if provided
      if (updateData.aufnahmeId && updateData.aufnahmeId !== umzug.aufnahmeId?.toString()) {
        const aufnahme = await Aufnahme.findById(updateData.aufnahmeId);
        if (!aufnahme) {
          return this.error(res, 'Referenced Aufnahme does not exist', 400);
        }
      }

      // Update fields
      Object.assign(umzug, updateData);
      await umzug.save();

      // Populate references for response
      await umzug.populate('mitarbeiter.mitarbeiterId', 'vorname nachname');
      await umzug.populate('aufnahmeId');

      return this.success(res, { umzug }, 'Umzug updated successfully');

    } catch (error) {
      return this.handleError(res, error, 'Failed to update Umzug');
    }
  });

  /**
   * Delete Umzug
   */
  static deleteUmzug = this.asyncHandler(async (req, res) => {
    try {
      const umzug = await Umzug.findById(req.params.id);
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      // Use transaction for safe deletion
      await this.withTransaction(async (session) => {
        // Delete associated notifications
        await Benachrichtigung.deleteMany(
          { 'bezug.id': umzug._id, 'bezug.typ': 'umzug' },
          { session }
        );

        // Delete the Umzug
        await umzug.deleteOne({ session });
      });

      return this.success(res, null, 'Umzug deleted successfully');

    } catch (error) {
      return this.handleError(res, error, 'Failed to delete Umzug');
    }
  });

  /**
   * Add task to Umzug
   */
  static addTask = this.asyncHandler(async (req, res) => {
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      const umzug = await Umzug.findById(req.params.id);
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      const { beschreibung, faelligkeit, prioritaet, zugewiesen } = req.body;

      // Create new task
      const newTask = {
        beschreibung,
        erledigt: false,
        faelligkeit: faelligkeit ? new Date(faelligkeit) : undefined,
        prioritaet: prioritaet || 'mittel',
        zugewiesen
      };

      umzug.tasks.push(newTask);
      await umzug.save();

      // Create notification if assigned
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
          erstelltVon: req.user.id
        });
      }

      const addedTask = umzug.tasks[umzug.tasks.length - 1];
      return this.success(res, { task: addedTask }, 'Task added successfully', 201);

    } catch (error) {
      return this.handleError(res, error, 'Failed to add task');
    }
  });

  /**
   * Update task in Umzug
   */
  static updateTask = this.asyncHandler(async (req, res) => {
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      const { taskId } = req.params;
      const umzug = await Umzug.findById(req.params.id);
      
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      const task = umzug.tasks.id(taskId);
      if (!task) {
        return this.error(res, 'Task not found', 404);
      }

      // Update task fields
      const { beschreibung, erledigt, faelligkeit, prioritaet, zugewiesen } = req.body;
      
      if (beschreibung !== undefined) task.beschreibung = beschreibung;
      if (erledigt !== undefined) task.erledigt = erledigt;
      if (faelligkeit !== undefined) task.faelligkeit = new Date(faelligkeit);
      if (prioritaet !== undefined) task.prioritaet = prioritaet;
      if (zugewiesen !== undefined) task.zugewiesen = zugewiesen;

      await umzug.save();

      return this.success(res, { task }, 'Task updated successfully');

    } catch (error) {
      return this.handleError(res, error, 'Failed to update task');
    }
  });

  /**
   * Delete task from Umzug
   */
  static deleteTask = this.asyncHandler(async (req, res) => {
    try {
      const { taskId } = req.params;
      const umzug = await Umzug.findById(req.params.id);
      
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      const task = umzug.tasks.id(taskId);
      if (!task) {
        return this.error(res, 'Task not found', 404);
      }

      umzug.tasks.pull(taskId);
      await umzug.save();

      return this.success(res, null, 'Task deleted successfully');

    } catch (error) {
      return this.handleError(res, error, 'Failed to delete task');
    }
  });

  /**
   * Add document to Umzug
   */
  static addDokument = this.asyncHandler(async (req, res) => {
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      const umzug = await Umzug.findById(req.params.id);
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      const { name, pfad, kategorie } = req.body;

      const dokument = {
        name,
        pfad,
        kategorie: kategorie || 'sonstiges',
        datum: new Date()
      };

      umzug.dokumente.push(dokument);
      await umzug.save();

      const addedDokument = umzug.dokumente[umzug.dokumente.length - 1];
      return this.success(res, { dokument: addedDokument }, 'Document added successfully', 201);

    } catch (error) {
      return this.handleError(res, error, 'Failed to add document');
    }
  });

  /**
   * Add note to Umzug
   */
  static addNotiz = this.asyncHandler(async (req, res) => {
    const validationError = this.handleValidationErrors(req, res);
    if (validationError) return validationError;

    try {
      const umzug = await Umzug.findById(req.params.id);
      if (!umzug) {
        return this.error(res, 'Umzug not found', 404);
      }

      const { text } = req.body;

      const notiz = {
        text,
        ersteller: req.user.name,
        datum: new Date()
      };

      umzug.notizen.push(notiz);
      await umzug.save();

      const addedNotiz = umzug.notizen[umzug.notizen.length - 1];
      return this.success(res, { notiz: addedNotiz }, 'Note added successfully', 201);

    } catch (error) {
      return this.handleError(res, error, 'Failed to add note');
    }
  });

  /**
   * Get Umzüge statistics
   */
  static getStatistics = this.asyncHandler(async (req, res) => {
    try {
      const stats = await Umzug.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$preis.brutto' }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            totalValue: 1,
            _id: 0
          }
        }
      ]);

      const totalUmzuege = await Umzug.countDocuments();
      const upcomingUmzuege = await Umzug.countDocuments({
        startDatum: { $gte: new Date() },
        status: { $in: ['geplant', 'bestaetigt'] }
      });

      return this.success(res, {
        statistics: stats,
        total: totalUmzuege,
        upcoming: upcomingUmzuege
      });

    } catch (error) {
      return this.handleError(res, error, 'Failed to retrieve statistics');
    }
  });

  /**
   * Helper method to clean and validate Umzug data
   */
  static cleanUmzugData(data) {
    const cleanData = { ...data };

    // Remove empty aufnahmeId
    if (!cleanData.aufnahmeId || cleanData.aufnahmeId === '') {
      delete cleanData.aufnahmeId;
    }

    // Clean fahrzeuge array
    if (Array.isArray(cleanData.fahrzeuge)) {
      cleanData.fahrzeuge = cleanData.fahrzeuge.map(fahrzeug => {
        const { _id, ...fahrzeugData } = fahrzeug;
        return fahrzeugData;
      });
    }

    // Clean mitarbeiter array
    if (Array.isArray(cleanData.mitarbeiter)) {
      cleanData.mitarbeiter = cleanData.mitarbeiter.filter(m => m.mitarbeiterId);
    }

    // Parse dates
    if (cleanData.startDatum) {
      cleanData.startDatum = new Date(cleanData.startDatum);
    }
    if (cleanData.endDatum) {
      cleanData.endDatum = new Date(cleanData.endDatum);
    }

    // Parse price object
    if (cleanData.preis) {
      cleanData.preis = {
        netto: parseFloat(cleanData.preis.netto || 0),
        brutto: parseFloat(cleanData.preis.brutto || 0),
        mwst: parseFloat(cleanData.preis.mwst || 19),
        bezahlt: Boolean(cleanData.preis.bezahlt),
        zahlungsart: cleanData.preis.zahlungsart || 'rechnung'
      };
    }

    return cleanData;
  }
}

module.exports = UmzugController;