// routes/umzug.paginated.routes.js - Umzug routes with pagination
const express = require('express');
const router = express.Router();
const umzugController = require('../controllers/umzug.paginated.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { 
  paginateOffset, 
  paginateCursor,
  sortMiddleware,
  filterMiddleware,
  searchMiddleware
} = require('../middleware/pagination');

// Configure allowed sort fields
const allowedSortFields = ['termin', 'status', 'createdAt', 'kosten.gesamtBrutto'];

// Configure filters
const filterConfig = {
  status: 'array',
  termin: 'dateRange',
  'bezahlung.status': 'exact',
  'vonAdresse.plz': 'exact',
  'nachAdresse.plz': 'exact'
};

// Configure search fields
const searchFields = [
  'kunde.name',
  'kunde.firma',
  'referenzNummer',
  'vonAdresse.ort',
  'nachAdresse.ort',
  'internaleBemerkungen'
];

// Offset pagination routes (traditional page navigation)
router.get('/',
  authenticate,
  paginateOffset(20, 100),
  sortMiddleware(allowedSortFields),
  filterMiddleware(filterConfig),
  searchMiddleware(searchFields),
  umzugController.getUmzuege
);

// Cursor pagination route (infinite scroll)
router.get('/cursor',
  authenticate,
  paginateCursor(20, 50),
  sortMiddleware(allowedSortFields),
  filterMiddleware(filterConfig),
  searchMiddleware(searchFields),
  umzugController.getUmzuegeCursor
);

// Get by month with pagination
router.get('/month/:month/:year',
  authenticate,
  paginateOffset(50, 200),
  sortMiddleware(['termin', 'status']),
  umzugController.getUmzuegeByMonth
);

// Get upcoming with pagination
router.get('/upcoming',
  authenticate,
  paginateOffset(10, 50),
  umzugController.getUpcomingUmzuege
);

// Search with pagination
router.get('/search',
  authenticate,
  paginateOffset(20, 100),
  sortMiddleware(allowedSortFields),
  umzugController.searchUmzuege
);

// Get by status with pagination
router.get('/status/:status',
  authenticate,
  paginateOffset(20, 100),
  sortMiddleware(['termin', 'createdAt']),
  umzugController.getUmzuegeByStatus
);

// Get overdue payments with pagination
router.get('/overdue',
  authenticate,
  authorize(['admin', 'buchhalter']),
  paginateOffset(20, 100),
  sortMiddleware(['termin', 'bezahlung.status']),
  umzugController.getOverduePayments
);

// Get filtered results with pagination
router.get('/filtered',
  authenticate,
  paginateOffset(20, 100),
  sortMiddleware(allowedSortFields),
  umzugController.getFilteredUmzuege
);

// Statistics (no pagination needed)
router.get('/statistics',
  authenticate,
  authorize(['admin']),
  umzugController.getUmzugStatistics
);

// CRUD operations (no pagination)
router.post('/',
  authenticate,
  umzugController.createUmzug
);

router.get('/:id',
  authenticate,
  umzugController.getUmzugById
);

router.put('/:id',
  authenticate,
  umzugController.updateUmzug
);

router.delete('/:id',
  authenticate,
  authorize(['admin']),
  umzugController.deleteUmzug
);

module.exports = router;