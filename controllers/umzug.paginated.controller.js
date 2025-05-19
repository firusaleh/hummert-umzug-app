// controllers/umzug.paginated.controller.js - Umzug controller with pagination
const Umzug = require('../models/umzug.model');
const { 
  createPaginatedResponse, 
  createCursorPaginatedResponse 
} = require('../middleware/pagination');

// Get all Umzuege with offset pagination
exports.getUmzuege = async (req, res, next) => {
  try {
    // Build base query
    const query = {};
    
    // Apply user-specific filtering if needed
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.id;
    }
    
    // Get paginated results
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get Umzuege with cursor pagination (for infinite scroll)
exports.getUmzuegeCursor = async (req, res, next) => {
  try {
    const query = {};
    
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.id;
    }
    
    const result = await createCursorPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get Umzuege by month with pagination
exports.getUmzuegeByMonth = async (req, res, next) => {
  try {
    const { month, year } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const query = {
      termin: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      month,
      year,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get upcoming Umzuege with pagination
exports.getUpcomingUmzuege = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const query = {
      termin: { $gte: today },
      status: { $in: ['Bestätigt', 'In Bearbeitung'] }
    };
    
    // Override default sort to sort by termin ascending
    req.pagination.sort = { termin: 1 };
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Search Umzuege with pagination
exports.searchUmzuege = async (req, res, next) => {
  try {
    const { search } = req.query;
    
    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Suchbegriff erforderlich'
      });
    }
    
    const query = {
      $or: [
        { 'kunde.name': { $regex: search, $options: 'i' } },
        { 'kunde.firma': { $regex: search, $options: 'i' } },
        { referenzNummer: { $regex: search, $options: 'i' } },
        { 'vonAdresse.ort': { $regex: search, $options: 'i' } },
        { 'nachAdresse.ort': { $regex: search, $options: 'i' } }
      ]
    };
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      searchTerm: search,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get Umzuege by status with pagination
exports.getUmzuegeByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    
    const query = { status };
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      status,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get overdue payments with pagination
exports.getOverduePayments = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const query = {
      'bezahlung.status': { $in: ['Offen', 'Teilweise bezahlt'] },
      termin: { $lt: thirtyDaysAgo }
    };
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      overdueThreshold: '30 days',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Get Umzuege with filters and pagination
exports.getFilteredUmzuege = async (req, res, next) => {
  try {
    const query = {};
    
    // Status filter
    if (req.query.status) {
      query.status = { $in: req.query.status.split(',') };
    }
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.termin = {};
      if (req.query.startDate) {
        query.termin.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.termin.$lte = new Date(req.query.endDate);
      }
    }
    
    // Location filter
    if (req.query.plz) {
      query.$or = [
        { 'vonAdresse.plz': req.query.plz },
        { 'nachAdresse.plz': req.query.plz }
      ];
    }
    
    // Payment status filter
    if (req.query.paymentStatus) {
      query['bezahlung.status'] = req.query.paymentStatus;
    }
    
    const result = await createPaginatedResponse(
      Umzug,
      query,
      req.pagination
    );
    
    res.json({
      success: true,
      filters: req.query,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// CRUD operations (existing methods remain the same)
exports.createUmzug = async (req, res, next) => {
  try {
    const umzugData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const umzug = await Umzug.create(umzugData);
    
    res.status(201).json({
      success: true,
      data: umzug
    });
  } catch (error) {
    next(error);
  }
};

exports.getUmzugById = async (req, res, next) => {
  try {
    const umzug = await Umzug.findById(req.params.id)
      .populate('personal.mitarbeiter')
      .populate('fahrzeuge');
    
    if (!umzug) {
      return res.status(404).json({
        success: false,
        message: 'Umzug nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: umzug
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUmzug = async (req, res, next) => {
  try {
    const umzug = await Umzug.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!umzug) {
      return res.status(404).json({
        success: false,
        message: 'Umzug nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: umzug
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUmzug = async (req, res, next) => {
  try {
    const umzug = await Umzug.findByIdAndDelete(req.params.id);
    
    if (!umzug) {
      return res.status(404).json({
        success: false,
        message: 'Umzug nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Umzug erfolgreich gelöscht'
    });
  } catch (error) {
    next(error);
  }
};

// Statistics endpoints
exports.getUmzugStatistics = async (req, res, next) => {
  try {
    const stats = await Umzug.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$kosten.gesamtBrutto' }
        }
      }
    ]);
    
    const monthlyStats = await Umzug.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$termin' },
            month: { $month: '$termin' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$kosten.gesamtBrutto' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      success: true,
      statistics: {
        byStatus: stats,
        monthly: monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};