const express = require('express');
const { body } = require('express-validator');
const umzugController = require('../controllers/umzug.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation rules
const umzugValidation = [
  body('kundenname').trim().notEmpty().withMessage('Customer name is required'),
  body('datum').isISO8601().withMessage('Valid date is required'),
  body('vonAdresse.strasse').trim().notEmpty().withMessage('From street is required'),
  body('vonAdresse.plz').trim().notEmpty().withMessage('From PLZ is required'),
  body('vonAdresse.ort').trim().notEmpty().withMessage('From city is required'),
  body('nachAdresse.strasse').trim().notEmpty().withMessage('To street is required'),
  body('nachAdresse.plz').trim().notEmpty().withMessage('To PLZ is required'),
  body('nachAdresse.ort').trim().notEmpty().withMessage('To city is required'),
  body('telefon').trim().notEmpty().withMessage('Phone is required')
];

// All routes require authentication
router.use(auth);

// Routes
router.post('/', umzugValidation, umzugController.create);
router.get('/', umzugController.getAll);
router.get('/:id', umzugController.getById);
router.put('/:id', umzugValidation, umzugController.update);
router.delete('/:id', umzugController.delete);

module.exports = router;