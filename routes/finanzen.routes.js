// routes/finanzen.routes.js - Updated with new validation system
const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const finanzenController = require('../controllers/finanzen.controller');
const { finanzen: finanzenValidation } = require('../middleware/validators');

// All routes require authentication
router.use(auth);

// Finanzübersicht routes
router.get('/uebersicht', finanzenController.getFinanzuebersicht);
router.get('/monatsuebersicht/:jahr', 
  finanzenValidation.validateJahr,
  finanzenController.getMonatsuebersicht
);
router.get('/monat/:monat/:jahr', 
  finanzenValidation.validateMonatJahr,
  finanzenController.getMonatsdetails
);

// Angebote (quotes) routes
router.get('/angebote', 
  finanzenValidation.listAngebote,
  finanzenController.getAngebote
);
router.get('/angebote/:id', 
  finanzenValidation.validateId,
  finanzenController.getAngebotById
);
router.post('/angebote', 
  finanzenValidation.createAngebot,
  finanzenController.createAngebot
);
router.put('/angebote/:id', 
  finanzenValidation.validateId,
  finanzenValidation.updateAngebot,
  finanzenController.updateAngebot
);
router.delete('/angebote/:id', 
  finanzenValidation.validateId,
  finanzenController.deleteAngebot
);

// Rechnungen (invoices) routes
router.get('/rechnungen', 
  finanzenValidation.listRechnungen,
  finanzenController.getRechnungen
);
router.get('/rechnungen/:id', 
  finanzenValidation.validateId,
  finanzenController.getRechnungById
);
router.post('/rechnungen', 
  finanzenValidation.createRechnung,
  finanzenController.createRechnung
);
router.put('/rechnungen/:id', 
  finanzenValidation.validateId,
  finanzenValidation.updateRechnung,
  finanzenController.updateRechnung
);
router.delete('/rechnungen/:id', 
  finanzenValidation.validateId,
  finanzenController.deleteRechnung
);
router.put('/rechnungen/:id/bezahlt', 
  finanzenValidation.validateId,
  finanzenValidation.markRechnungAsPaid,
  finanzenController.markRechnungAsBezahlt
);

// Projektkosten (project costs) routes
router.get('/projektkosten', 
  finanzenValidation.listProjektkosten,
  finanzenController.getProjektkosten
);
router.get('/projektkosten/:id', 
  finanzenValidation.validateId,
  finanzenController.getProjektkostenById
);
router.post('/projektkosten', 
  finanzenValidation.createProjektkosten,
  finanzenController.createProjektkosten
);
router.put('/projektkosten/:id', 
  finanzenValidation.validateId,
  finanzenValidation.updateProjektkosten,
  finanzenController.updateProjektkosten
);
router.delete('/projektkosten/:id', 
  finanzenValidation.validateId,
  finanzenController.deleteProjektkosten
);

module.exports = router;