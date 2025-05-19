// routes/user.routes.fixed.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, admin, authorize } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/error.middleware');
const { paginate, sort, filter } = require('../middleware/pagination');

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
const userValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name ist erforderlich')
      .isLength({ min: 2, max: 100 }),
    body('email')
      .trim()
      .notEmpty().withMessage('E-Mail ist erforderlich')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Passwort ist erforderlich')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    body('role')
      .optional()
      .isIn(['admin', 'mitarbeiter', 'helfer']),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/)
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^(\+49|0)[1-9][0-9]{1,14}$/),
    body('role')
      .optional()
      .isIn(['admin', 'mitarbeiter', 'helfer']),
    body('isActive')
      .optional()
      .isBoolean()
  ],
  
  validateId: [
    param('id').isMongoId().withMessage('Ungültige Benutzer-ID')
  ],
  
  query: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['admin', 'mitarbeiter', 'helfer']),
    query('isActive').optional().isBoolean(),
    query('search').optional().trim()
  ]
};

// All routes require authentication
router.use(auth);

// User management routes (admin only)

// GET /api/users - Get all users with pagination
router.get('/',
  authorize('admin'),
  userValidation.query,
  validate,
  paginate,
  filter(['role', 'isActive']),
  sort(['name', 'email', 'createdAt']),
  asyncHandler(userController.getAllUsers)
);

// GET /api/users/stats - Get user statistics
router.get('/stats',
  authorize('admin'),
  asyncHandler(userController.getUserStats)
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  authorize('admin'),
  userValidation.validateId,
  validate,
  asyncHandler(userController.getUserById)
);

// POST /api/users - Create new user
router.post('/',
  authorize('admin'),
  userValidation.create,
  validate,
  asyncHandler(userController.createUser)
);

// PUT /api/users/:id - Update user
router.put('/:id',
  authorize('admin'),
  userValidation.validateId,
  userValidation.update,
  validate,
  asyncHandler(userController.updateUser)
);

// DELETE /api/users/:id - Delete/deactivate user
router.delete('/:id',
  authorize('admin'),
  userValidation.validateId,
  validate,
  asyncHandler(userController.deleteUser)
);

// User role management
router.put('/:id/role',
  authorize('admin'),
  userValidation.validateId,
  body('role').notEmpty().isIn(['admin', 'mitarbeiter', 'helfer']),
  validate,
  asyncHandler(userController.updateUserRole)
);

// User status management
router.put('/:id/status',
  authorize('admin'),
  userValidation.validateId,
  body('isActive').notEmpty().isBoolean(),
  body('reason').optional().trim(),
  validate,
  asyncHandler(userController.updateUserStatus)
);

// Password reset by admin
router.post('/:id/reset-password',
  authorize('admin'),
  userValidation.validateId,
  body('temporaryPassword').optional().isLength({ min: 8 }),
  validate,
  asyncHandler(userController.resetUserPassword)
);

// User activity log
router.get('/:id/activity',
  authorize('admin'),
  userValidation.validateId,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validate,
  asyncHandler(userController.getUserActivity)
);

// User permissions
router.get('/:id/permissions',
  authorize('admin'),
  userValidation.validateId,
  validate,
  asyncHandler(userController.getUserPermissions)
);

router.put('/:id/permissions',
  authorize('admin'),
  userValidation.validateId,
  body('permissions').isArray(),
  body('permissions.*').isString(),
  validate,
  asyncHandler(userController.updateUserPermissions)
);

// User sessions
router.get('/:id/sessions',
  authorize('admin'),
  userValidation.validateId,
  validate,
  asyncHandler(userController.getUserSessions)
);

router.delete('/:id/sessions',
  authorize('admin'),
  userValidation.validateId,
  validate,
  asyncHandler(userController.terminateUserSessions)
);

// Export users
router.get('/export',
  authorize('admin'),
  query('format').isIn(['csv', 'excel']),
  validate,
  asyncHandler(userController.exportUsers)
);

// Bulk operations
router.post('/bulk/deactivate',
  authorize('admin'),
  body('userIds').isArray(),
  body('userIds.*').isMongoId(),
  validate,
  asyncHandler(userController.bulkDeactivateUsers)
);

router.post('/bulk/activate',
  authorize('admin'),
  body('userIds').isArray(),
  body('userIds.*').isMongoId(),
  validate,
  asyncHandler(userController.bulkActivateUsers)
);

module.exports = router;