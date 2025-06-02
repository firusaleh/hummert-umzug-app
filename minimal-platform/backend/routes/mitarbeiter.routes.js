const express = require('express');
const { body } = require('express-validator');
const mitarbeiterController = require('../controllers/mitarbeiter.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation rules
const mitarbeiterValidation = [
  body('vorname').trim().notEmpty().withMessage('First name is required'),
  body('nachname').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('telefon').trim().notEmpty().withMessage('Phone is required'),
  body('position').trim().notEmpty().withMessage('Position is required')
];

// All routes require authentication
router.use(auth);

// Routes
router.post('/', mitarbeiterValidation, mitarbeiterController.create);
router.get('/', mitarbeiterController.getAll);
router.get('/:id', mitarbeiterController.getById);

module.exports = router;