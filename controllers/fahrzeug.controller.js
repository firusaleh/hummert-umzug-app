// controllers/fahrzeug.controller.js
const Fahrzeug = require('../models/fahrzeug.model');
const Upload = require('../models/upload.model');
const { validationResult } = require('express-validator');
const { 
  catchAsync, 
  createValidationError, 
  createNotFoundError,
  AppError
} = require('../utils/error.utils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { 
  createOffsetPaginationResponse, 
  createSearchFilter 
} = require('../middleware/pagination.fixed');

// Get all vehicles with pagination
exports.getAllFahrzeuge = catchAsync(async (req, res) => {
  const { search, typ, status, fuehrerscheinklasse } = req.query;
  
  // Create filter
  const filter = { ...req.filters };
  
  if (typ) {
    filter.typ = typ;
  }
  
  if (status) {
    filter.status = status;
  }
  
  if (fuehrerscheinklasse) {
    filter.fuehrerscheinklasse = fuehrerscheinklasse;
  }
  
  // Search filter
  if (search) {
    const searchFilter = createSearchFilter(search, ['kennzeichen', 'bezeichnung']);
    Object.assign(filter, searchFilter);
  }
  
  // Build query
  const query = Fahrzeug.find(filter)
    .sort(req.pagination?.sort || { createdAt: -1 });
  
  // Count query
  const countQuery = Fahrzeug.countDocuments(filter);
  
  // Create paginated response
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  
  res.json(response);
});

// Get a vehicle by ID
exports.getFahrzeugById = catchAsync(async (req, res) => {
  const fahrzeug = await Fahrzeug.findById(req.params.id)
    .populate('aktuelleFahrt', 'datum startadresse zieladresse status');
  
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  res.json({
    success: true,
    data: fahrzeug
  });
});

// Create a new vehicle
exports.createFahrzeug = catchAsync(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }
  
  // Process and prepare nested data structures if they don't exist
  if (req.body.kapazitaet) {
    if (!req.body.kapazitaet.ladeflaeche) {
      req.body.kapazitaet.ladeflaeche = {};
    }
  } else {
    req.body.kapazitaet = {
      ladeflaeche: {}
    };
  }
  
  // Initialize versicherung object if not present
  if (!req.body.versicherung) {
    req.body.versicherung = {};
  }
  
  // Get data from request
  const fahrzeugData = {
    ...req.body,
    createdBy: req.user?.id
  };
  
  // Create the vehicle in the database
  const fahrzeug = await Fahrzeug.create(fahrzeugData);
  
  res.status(201).json({
    success: true,
    message: 'Fahrzeug erfolgreich erstellt',
    data: fahrzeug
  });
});

// Update a vehicle
exports.updateFahrzeug = catchAsync(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(errors);
  }
  
  // Process and prepare nested data structures if they don't exist
  if (req.body.kapazitaet) {
    if (!req.body.kapazitaet.ladeflaeche) {
      req.body.kapazitaet.ladeflaeche = {};
    }
  }
  
  // Initialize versicherung object if not present
  if (req.body.versicherung) {
    // Nothing to initialize here, just make sure it exists
  }
  
  // Get the vehicle to update
  const fahrzeug = await Fahrzeug.findById(req.params.id);
  
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  // Update fields with validated data
  Object.keys(req.body).forEach(key => {
    // Handle nested objects
    if (typeof req.body[key] === 'object' && req.body[key] !== null) {
      if (!fahrzeug[key]) fahrzeug[key] = {};
      
      Object.keys(req.body[key]).forEach(nestedKey => {
        // Handle deeply nested objects (like ladeflaeche)
        if (typeof req.body[key][nestedKey] === 'object' && req.body[key][nestedKey] !== null) {
          if (!fahrzeug[key][nestedKey]) fahrzeug[key][nestedKey] = {};
          
          Object.keys(req.body[key][nestedKey]).forEach(deepKey => {
            fahrzeug[key][nestedKey][deepKey] = req.body[key][nestedKey][deepKey];
          });
        } else {
          fahrzeug[key][nestedKey] = req.body[key][nestedKey];
        }
      });
    } else {
      fahrzeug[key] = req.body[key];
    }
  });
  
  await fahrzeug.save();
  
  res.json({
    success: true,
    message: 'Fahrzeug erfolgreich aktualisiert',
    data: fahrzeug
  });
});

// Update vehicle status
exports.updateFahrzeugStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  
  if (!status) {
    throw new AppError('Status ist erforderlich', 400);
  }
  
  const fahrzeug = await Fahrzeug.findById(req.params.id);
  
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  fahrzeug.status = status;
  
  // If status is "Im Einsatz", check for aktuelleFahrt
  if (status === 'Im Einsatz' && req.body.aktuelleFahrt) {
    fahrzeug.aktuelleFahrt = req.body.aktuelleFahrt;
  }
  
  // If status is changed from "Im Einsatz", clear aktuelleFahrt
  if (fahrzeug.status !== 'Im Einsatz' && status !== 'Im Einsatz') {
    fahrzeug.aktuelleFahrt = null;
  }
  
  await fahrzeug.save();
  
  res.json({
    success: true,
    message: `Fahrzeug-Status auf "${status}" geändert`,
    data: fahrzeug
  });
});

// Update kilometer reading
exports.updateKilometerstand = catchAsync(async (req, res) => {
  const { kilometerstand } = req.body;
  
  if (kilometerstand === undefined) {
    throw new AppError('Kilometerstand ist erforderlich', 400);
  }
  
  const fahrzeug = await Fahrzeug.findById(req.params.id);
  
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  // Check if new value is greater than the current one
  if (kilometerstand < fahrzeug.kilometerstand) {
    throw new AppError('Neuer Kilometerstand muss größer als der aktuelle sein', 400);
  }
  
  fahrzeug.kilometerstand = kilometerstand;
  await fahrzeug.save();
  
  res.json({
    success: true,
    message: 'Kilometerstand erfolgreich aktualisiert',
    data: fahrzeug
  });
});

// Delete a vehicle
exports.deleteFahrzeug = catchAsync(async (req, res) => {
  const fahrzeug = await Fahrzeug.findById(req.params.id);
  
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  // Hard delete
  await Fahrzeug.findByIdAndDelete(req.params.id);
  
  res.json({
    success: true,
    message: 'Fahrzeug erfolgreich gelöscht'
  });
});

// Configure multer storage for vehicle images
const vehicleImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/fahrzeug-images';
    
    // Create dir if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fahrzeugId = req.params.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, `fahrzeug-${fahrzeugId}-${uniqueSuffix}${fileExt}`);
  }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|webp/i;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  }
  
  cb(new Error('Nur Bilder im Format JPG, PNG, GIF oder WEBP sind erlaubt'));
};

// Configure multer upload
const upload = multer({
  storage: vehicleImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
}).single('file');

// Upload vehicle image
exports.uploadFahrzeugImage = catchAsync(async (req, res) => {
  const fahrzeugId = req.params.id;
  
  // Check if vehicle exists
  const fahrzeug = await Fahrzeug.findById(fahrzeugId);
  if (!fahrzeug) {
    throw createNotFoundError('Fahrzeug');
  }
  
  // Process the upload
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Datei ist zu groß. Maximalgröße ist 2MB.'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || 'Fehler beim Hochladen des Bildes'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }
    
    try {
      // Get the uploaded file path
      const filePath = req.file.path;
      
      // Create an upload entry in the database
      const upload = await Upload.create({
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: filePath,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'Fahrzeug',
        description: `Fahrzeugbild: ${fahrzeug.kennzeichen}`,
        uploadedBy: req.user?.id,
        relatedEntity: {
          type: 'Fahrzeug',
          id: fahrzeugId
        }
      });
      
      // Update the vehicle with the image path
      fahrzeug.bild = filePath;
      await fahrzeug.save();
      
      res.status(201).json({
        success: true,
        message: 'Bild erfolgreich hochgeladen',
        data: {
          file: upload,
          fahrzeug: {
            _id: fahrzeug._id,
            kennzeichen: fahrzeug.kennzeichen,
            bild: fahrzeug.bild
          }
        }
      });
    } catch (error) {
      // Remove the file if database operation fails
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      throw error;
    }
  });
});