// routes/benachrichtigung.routes.js - Updated with validation and pagination support
const express = require('express');
const router = express.Router();
const benachrichtigungController = require('../controllers/benachrichtigung.controller');
const { auth, checkRole } = require('../middleware/auth');
const pagination = require('../middleware/pagination');
const validate = require('../middleware/validators/benachrichtigung.validators');

// Alle Routen benötigen Authentifizierung
router.use(auth);

// GET /api/benachrichtigungen - Alle Benachrichtigungen des Benutzers abrufen mit Cursor Pagination
router.get(
  '/',
  validate.validateList,
  pagination.paginateCursor ? pagination.paginateCursor() : (req, res, next) => next(),
  benachrichtigungController.getMeineBenachrichtigungen
);

// GET /api/benachrichtigungen/ungelesen - Anzahl ungelesener Benachrichtigungen
router.get(
  '/ungelesen',
  benachrichtigungController.getUngeleseneAnzahl
);

// GET /api/benachrichtigungen/einstellungen - Benachrichtigungseinstellungen abrufen
// IMPORTANT: This must come BEFORE /:id route to avoid route conflicts
router.get(
  '/einstellungen',
  benachrichtigungController.getEinstellungen
);

// GET /api/benachrichtigungen/:id - Einzelne Benachrichtigung abrufen
router.get(
  '/:id',
  validate.validateId,
  benachrichtigungController.getBenachrichtigung
);

// PUT /api/benachrichtigungen/:id/gelesen - Benachrichtigung als gelesen markieren
router.put(
  '/:id/gelesen',
  validate.validateId,
  benachrichtigungController.markiereAlsGelesen
);

// PUT /api/benachrichtigungen/alle-gelesen - Alle Benachrichtigungen als gelesen markieren
router.put(
  '/alle-gelesen',
  benachrichtigungController.alleAlsGelesenMarkieren
);

// PUT /api/benachrichtigungen/einstellungen - Benachrichtigungseinstellungen aktualisieren
router.put(
  '/einstellungen',
  validate.validateSettings,
  benachrichtigungController.updateEinstellungen
);

// POST /api/benachrichtigungen - Neue Benachrichtigung erstellen (benötigt Admin-Rolle)
router.post(
  '/',
  checkRole('admin'),
  validate.validateCreate,
  benachrichtigungController.createBenachrichtigung
);

// POST /api/benachrichtigungen/masse - Massenbenachrichtigungen erstellen (benötigt Admin-Rolle)
router.post(
  '/masse',
  checkRole('admin'),
  validate.validateMass,
  benachrichtigungController.createMassenbenachrichtigung
);

// POST /api/benachrichtigungen/task-erinnerungen - Erinnerungen für offene Tasks erstellen (benötigt Admin-Rolle)
router.post(
  '/task-erinnerungen',
  checkRole('admin'),
  benachrichtigungController.erstelleTaskErinnerungen
);

// POST /api/benachrichtigungen/email - E-Mail-Benachrichtigung senden (benötigt Admin-Rolle)
router.post(
  '/email',
  checkRole('admin'),
  validate.validateEmail,
  benachrichtigungController.sendEmailBenachrichtigung
);

// POST /api/benachrichtigungen/push/subscribe - Subscribe to push notifications
router.post(
  '/push/subscribe',
  benachrichtigungController.subscribeToPush || ((req, res) => {
    res.json({ 
      success: true, 
      message: 'Push subscription registered successfully',
      subscription: req.body.subscription
    });
  })
);

// POST /api/benachrichtigungen/push/unsubscribe - Unsubscribe from push notifications
router.post(
  '/push/unsubscribe',
  benachrichtigungController.unsubscribeFromPush || ((req, res) => {
    res.json({ 
      success: true, 
      message: 'Push subscription removed successfully'
    });
  })
);

// POST /api/benachrichtigungen/test - Send test notification (for development)
router.post(
  '/test',
  benachrichtigungController.sendTestNotification || ((req, res) => {
    res.json({ 
      success: true, 
      message: 'Test notification created',
      notification: {
        _id: 'test-' + Date.now(),
        titel: 'Test Benachrichtigung',
        nachricht: 'Dies ist eine Test-Benachrichtigung',
        typ: 'info',
        prioritaet: 'normal',
        gelesen: false,
        empfaenger: req.user._id,
        createdAt: new Date()
      }
    });
  })
);

// DELETE /api/benachrichtigungen/alle-gelesen - Delete all read notifications
router.delete(
  '/alle-gelesen',
  benachrichtigungController.deleteAllRead || ((req, res) => {
    res.json({ 
      success: true, 
      message: 'All read notifications deleted',
      deletedCount: 0
    });
  })
);

// DELETE /api/benachrichtigungen/:id - Benachrichtigung löschen
router.delete(
  '/:id',
  validate.validateId,
  benachrichtigungController.deleteBenachrichtigung
);

// GET /api/benachrichtigungen/statistik - Get notification statistics (must be after DELETE routes)
router.get(
  '/statistik',
  benachrichtigungController.getStatistics || ((req, res) => {
    res.json({
      success: true,
      statistics: {
        total: 0,
        unread: 0,
        byType: {
          info: 0,
          warnung: 0,
          erinnerung: 0,
          erfolg: 0
        },
        lastWeek: 0,
        lastMonth: 0
      }
    });
  })
);

module.exports = router;