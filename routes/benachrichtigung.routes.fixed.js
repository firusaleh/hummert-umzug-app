// routes/benachrichtigung.routes.fixed.js
const express = require('express');
const router = express.Router();
const benachrichtigungController = require('../controllers/benachrichtigung.controller');
const { auth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { paginate, sort } = require('../middleware/pagination');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation rules
const benachrichtigungValidation = {
  create: [
    body('empfaenger')
      .notEmpty().withMessage('Empfänger ist erforderlich')
      .isMongoId().withMessage('Ungültige Empfänger-ID'),
    body('titel')
      .trim()
      .notEmpty().withMessage('Titel ist erforderlich')
      .isLength({ max: 200 }),
    body('nachricht')
      .trim()
      .notEmpty().withMessage('Nachricht ist erforderlich')
      .isLength({ max: 1000 }),
    body('typ')
      .notEmpty()
      .isIn(['info', 'warnung', 'fehler', 'erfolg']),
    body('prioritaet')
      .optional()
      .isIn(['niedrig', 'mittel', 'hoch']),
    body('relatedType')
      .optional()
      .isIn(['umzug', 'aufnahme', 'rechnung', 'aufgabe']),
    body('relatedId')
      .optional()
      .isMongoId()
  ],
  
  markAsRead: [
    body('gelesen')
      .notEmpty()
      .isBoolean()
  ],
  
  validateId: [
    param('id').isMongoId().withMessage('Ungültige Benachrichtigungs-ID')
  ],
  
  query: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('gelesen').optional().isBoolean(),
    query('typ').optional().isIn(['info', 'warnung', 'fehler', 'erfolg']),
    query('prioritaet').optional().isIn(['niedrig', 'mittel', 'hoch']),
    query('sort').optional().isIn(['createdAt', '-createdAt', 'prioritaet'])
  ]
};

// All routes require authentication
router.use(auth);

// Routes

// GET /api/benachrichtigungen - Get user's notifications
router.get('/',
  benachrichtigungValidation.query,
  validate,
  paginate,
  sort(['createdAt', 'prioritaet']),
  asyncHandler(benachrichtigungController.getMyNotifications)
);

// GET /api/benachrichtigungen/unread-count - Get unread count
router.get('/unread-count',
  asyncHandler(benachrichtigungController.getUnreadCount)
);

// GET /api/benachrichtigungen/:id - Get specific notification
router.get('/:id',
  benachrichtigungValidation.validateId,
  validate,
  asyncHandler(benachrichtigungController.getNotificationById)
);

// POST /api/benachrichtigungen - Create notification (admin only)
router.post('/',
  benachrichtigungValidation.create,
  validate,
  asyncHandler(benachrichtigungController.createNotification)
);

// PUT /api/benachrichtigungen/:id/read - Mark as read/unread
router.put('/:id/read',
  benachrichtigungValidation.validateId,
  benachrichtigungValidation.markAsRead,
  validate,
  asyncHandler(benachrichtigungController.markAsRead)
);

// PUT /api/benachrichtigungen/mark-all-read - Mark all as read
router.put('/mark-all-read',
  asyncHandler(benachrichtigungController.markAllAsRead)
);

// DELETE /api/benachrichtigungen/:id - Delete notification
router.delete('/:id',
  benachrichtigungValidation.validateId,
  validate,
  asyncHandler(benachrichtigungController.deleteNotification)
);

// DELETE /api/benachrichtigungen/delete-all-read - Delete all read notifications
router.delete('/delete-all-read',
  asyncHandler(benachrichtigungController.deleteAllRead)
);

// Notification preferences
router.get('/preferences',
  asyncHandler(benachrichtigungController.getPreferences)
);

router.put('/preferences',
  body('email').optional().isBoolean(),
  body('push').optional().isBoolean(),
  body('types').optional().isObject(),
  validate,
  asyncHandler(benachrichtigungController.updatePreferences)
);

// Subscribe to push notifications
router.post('/subscribe',
  body('subscription').notEmpty().isObject(),
  validate,
  asyncHandler(benachrichtigungController.subscribeToPush)
);

// Unsubscribe from push notifications
router.post('/unsubscribe',
  asyncHandler(benachrichtigungController.unsubscribeFromPush)
);

// Test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test',
    asyncHandler(benachrichtigungController.sendTestNotification)
  );
}

module.exports = router;