// routes/example.routes.js - Example of using all fixed middleware together
const express = require('express');
const router = express.Router();

// Import all fixed middleware
const auth = require('../middleware/auth.fixed');
const validation = require('../middleware/validation.fixed');
const pagination = require('../middleware/pagination.fixed');
const rateLimiter = require('../middleware/rateLimiter.fixed');
const { catchAsync } = require('../middleware/error.middleware.fixed');

// Import example controller
const exampleController = {
  // Public endpoint
  getPublicData: catchAsync(async (req, res) => {
    const data = await SomeModel.find(req.filters)
      .sort(req.pagination.sort)
      .skip(req.pagination.skip)
      .limit(req.pagination.limit);
    
    const response = await pagination.createOffsetPaginationResponse(
      data,
      await SomeModel.countDocuments(req.filters),
      req
    );
    
    res.json(response);
  }),
  
  // Protected endpoint
  getUserData: catchAsync(async (req, res) => {
    const userData = await UserModel.findById(req.user.id);
    res.json({ success: true, data: userData });
  }),
  
  // Create resource
  createResource: catchAsync(async (req, res) => {
    const resource = await ResourceModel.create({
      ...req.body,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource
    });
  })
};

// Public routes with rate limiting
router.get('/public',
  rateLimiter.rateLimiters.public,
  pagination.paginateOffset({ 
    defaultLimit: 20,
    allowedSortFields: ['name', 'createdAt'] 
  }),
  exampleController.getPublicData
);

// Authentication required routes
router.use(auth.protect); // All routes below require authentication

// User profile routes
router.get('/profile',
  rateLimiter.rateLimiters.api,
  exampleController.getUserData
);

router.put('/profile',
  rateLimiter.rateLimiters.api,
  validation.profileValidation, // Custom validation
  catchAsync(async (req, res) => {
    const updated = await UserModel.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updated });
  })
);

// Resource CRUD with proper middleware stack
router.route('/resources')
  .get(
    rateLimiter.rateLimiters.api,
    pagination.paginateOffset({
      defaultLimit: 50,
      allowedSortFields: ['name', 'status', 'createdAt']
    }),
    pagination.createFilterMiddleware({
      status: { type: 'exact' },
      name: { type: 'regex' },
      createdAt: { type: 'dateRange' }
    }),
    catchAsync(async (req, res) => {
      const resources = await ResourceModel
        .find(req.filters)
        .sort(req.pagination.sort)
        .skip(req.pagination.skip)
        .limit(req.pagination.limit);
      
      const response = await pagination.createOffsetPaginationResponse(
        resources,
        await ResourceModel.countDocuments(req.filters),
        req
      );
      
      res.json(response);
    })
  )
  .post(
    rateLimiter.rateLimiters.api,
    validation.resourceValidation,
    exampleController.createResource
  );

router.route('/resources/:id')
  .get(
    rateLimiter.rateLimiters.api,
    validation.idParamValidation,
    catchAsync(async (req, res) => {
      const resource = await ResourceModel.findById(req.params.id);
      if (!resource) {
        throw new NotFoundError('Resource not found');
      }
      res.json({ success: true, data: resource });
    })
  )
  .put(
    rateLimiter.rateLimiters.api,
    validation.idParamValidation,
    validation.resourceValidation,
    auth.requireOwnership('userId'), // Check ownership
    catchAsync(async (req, res) => {
      const updated = await ResourceModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!updated) {
        throw new NotFoundError('Resource not found');
      }
      
      res.json({ success: true, data: updated });
    })
  )
  .delete(
    rateLimiter.rateLimiters.api,
    validation.idParamValidation,
    auth.requireOwnership('userId'),
    catchAsync(async (req, res) => {
      const deleted = await ResourceModel.findByIdAndDelete(req.params.id);
      
      if (!deleted) {
        throw new NotFoundError('Resource not found');
      }
      
      res.json({ 
        success: true, 
        message: 'Resource deleted successfully' 
      });
    })
  );

// Admin only routes
router.use(auth.requireAdmin); // All routes below require admin role

router.get('/admin/stats',
  rateLimiter.rateLimiters.admin,
  catchAsync(async (req, res) => {
    const stats = await getSystemStats();
    res.json({ success: true, data: stats });
  })
);

router.delete('/admin/resources/:id',
  rateLimiter.rateLimiters.admin,
  validation.idParamValidation,
  catchAsync(async (req, res) => {
    // Admin can delete any resource
    await ResourceModel.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true, 
      message: 'Resource deleted by admin' 
    });
  })
);

// Rate limit monitoring (admin only)
router.get('/admin/rate-limits/:userId',
  rateLimiter.rateLimiters.admin,
  rateLimiter.monitoring.getStatus
);

router.delete('/admin/rate-limits/:key',
  rateLimiter.rateLimiters.admin,
  rateLimiter.monitoring.clearLimits
);

// Financial operations with strict limits
router.post('/payment',
  auth.protect,
  rateLimiter.rateLimiters.financial,
  validation.paymentValidation,
  catchAsync(async (req, res) => {
    const payment = await processPayment(req.body);
    res.json({ 
      success: true, 
      message: 'Payment processed',
      data: payment 
    });
  })
);

// File upload with specific limits
router.post('/upload',
  auth.protect,
  rateLimiter.rateLimiters.upload,
  validation.fileUploadValidation,
  upload.single('file'),
  catchAsync(async (req, res) => {
    const fileData = await saveFile(req.file);
    res.json({ 
      success: true, 
      message: 'File uploaded',
      data: fileData 
    });
  })
);

// Example of cursor-based pagination for real-time data
router.get('/feed',
  auth.protect,
  rateLimiter.rateLimiters.api,
  pagination.paginateCursor({
    defaultLimit: 20,
    allowedSortFields: ['createdAt', 'priority']
  }),
  catchAsync(async (req, res) => {
    const query = FeedModel
      .find(req.filters)
      .sort(req.pagination.sort);
    
    const response = await pagination.createCursorPaginationResponse(
      query,
      req
    );
    
    res.json(response);
  })
);

// Complex example with all middleware
router.post('/complex-operation',
  // Authentication
  auth.protect,
  
  // Role check
  auth.requireRole('admin', 'manager'),
  
  // Rate limiting
  rateLimiter.rateLimiters.strict,
  
  // Validation
  validation.complexOperationValidation,
  
  // Async error handling
  catchAsync(async (req, res) => {
    // Use transaction for complex operations
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Perform multiple operations
      const result1 = await Model1.create([data1], { session });
      const result2 = await Model2.updateMany(filter, update, { session });
      const result3 = await Model3.findByIdAndDelete(id, { session });
      
      // Commit transaction
      await session.commitTransaction();
      
      res.json({
        success: true,
        message: 'Complex operation completed',
        results: { result1, result2, result3 }
      });
    } catch (error) {
      // Rollback transaction
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  })
);

// Export router
module.exports = router;