// routes/config.routes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Configuration data
const configurations = {
  umzugStatuses: ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
  paymentMethods: ['rechnung', 'bar', 'ueberweisung', 'ec', 'kreditkarte', 'paypal'],
  employeePositions: [
    'Teamleiter',
    'Packer',
    'Fahrer',
    'Aufnahmespezialist',
    'Disponent',
    'Lagerarbeiter',
    'Monteur',
    'Helfer',
    'Auszubildender',
    'Praktikant'
  ],
  employeeSkills: [
    'Umzugsplanung',
    'Teamführung',
    'Führerschein Klasse B',
    'Führerschein Klasse C',
    'Führerschein Klasse CE',
    'Möbelmontage',
    'Klaviertransport',
    'Verpackung',
    'Lagerorganisation',
    'Kundenbetreuung',
    'Gefahrguttransport',
    'Schwerlasttransport',
    'Elektroarbeiten',
    'IT-Kenntnisse'
  ],
  employeeRoles: ['fahrer', 'helfer', 'teamleiter', 'träger'],
  vehicleTypes: ['LKW', 'Transporter', 'PKW', 'Anhänger', 'Sonstige'],
  vehicleStatuses: ['Verfügbar', 'Im Einsatz', 'In Wartung', 'Defekt', 'Außer Dienst'],
  licenseClasses: ['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE']
};

// GET /api/config/all - Get all configurations
router.get('/all', auth, (req, res) => {
  res.json({
    success: true,
    ...configurations
  });
});

// GET /api/config/umzug-statuses
router.get('/umzug-statuses', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.umzugStatuses
  });
});

// GET /api/config/payment-methods
router.get('/payment-methods', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.paymentMethods
  });
});

// GET /api/config/employee-positions
router.get('/employee-positions', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.employeePositions
  });
});

// GET /api/config/employee-skills
router.get('/employee-skills', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.employeeSkills
  });
});

// GET /api/config/employee-roles
router.get('/employee-roles', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.employeeRoles
  });
});

// GET /api/config/vehicle-types
router.get('/vehicle-types', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.vehicleTypes
  });
});

// GET /api/config/vehicle-statuses
router.get('/vehicle-statuses', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.vehicleStatuses
  });
});

// GET /api/config/license-classes
router.get('/license-classes', auth, (req, res) => {
  res.json({
    success: true,
    data: configurations.licenseClasses
  });
});

module.exports = router;