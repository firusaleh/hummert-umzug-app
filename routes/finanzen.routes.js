// routes/finanzen.routes.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const finanzenController = require('../controllers/finanzen.controller');

// Finanzübersicht Routen
router.get('/uebersicht', protect, finanzenController.getFinanzuebersicht);
router.get('/monatsübersicht/:jahr', protect, finanzenController.getMonatsuebersicht);
router.get('/monat/:monat/:jahr', protect, finanzenController.getMonatsdetails);

// Angebote Routen
router.get('/angebote', protect, finanzenController.getAngebote);
router.get('/angebote/:id', protect, finanzenController.getAngebotById);
router.post('/angebote', protect, finanzenController.createAngebot);
router.put('/angebote/:id', protect, finanzenController.updateAngebot);
router.delete('/angebote/:id', protect, finanzenController.deleteAngebot);

// Rechnungen Routen
router.get('/rechnungen', protect, finanzenController.getRechnungen);
router.get('/rechnungen/:id', protect, finanzenController.getRechnungById);
router.post('/rechnungen', protect, finanzenController.createRechnung);
router.put('/rechnungen/:id', protect, finanzenController.updateRechnung);
router.delete('/rechnungen/:id', protect, finanzenController.deleteRechnung);
router.put('/rechnungen/:id/bezahlt', protect, finanzenController.markRechnungAsBezahlt);

// Projektkosten Routen
router.get('/projektkosten', protect, finanzenController.getProjektkosten);
router.get('/projektkosten/:id', protect, finanzenController.getProjektkostenById);
router.post('/projektkosten', protect, finanzenController.createProjektkosten);
router.put('/projektkosten/:id', protect, finanzenController.updateProjektkosten);
router.delete('/projektkosten/:id', protect, finanzenController.deleteProjektkosten);

module.exports = router;