// routes/index.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth'); // ODER verwende auth.middleware.js
const fileController = require('../controllers/fileController');

// Importieren der Routen mit korrekten Pfaden
const authRoutes = require('./auth.routes');
const userRoutes = require('./user');  // Geändert von './user.model' zu './user'
const projectRoutes = require('./projekt'); // Ändern zu deinem tatsächlichen Dateinamen
const taskRoutes = require('./task');
const clientRoutes = require('./clients'); // Falls dies der richtige Dateiname ist
const fileRoutes = require('./file');
const umzugRoutes = require('./umzug.routes');
const aufnahmeRoutes = require('./aufnahme.routes');
const mitarbeiterRoutes = require('./mitarbeiter.routes');
const benachrichtigungRoutes = require('./benachrichtigung.routes');
const uploadRoutes = require('./upload.routes');

// Zuweisen der Routen
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/clients', clientRoutes);
router.use('/files', fileRoutes);
router.use('/umzuege', umzugRoutes);
router.use('/aufnahmen', aufnahmeRoutes);
router.use('/mitarbeiter', mitarbeiterRoutes);
router.use('/benachrichtigungen', benachrichtigungRoutes);
router.use('/uploads', uploadRoutes);

// Route zum Löschen aller Beispieldaten (nur für Admins)
router.delete('/delete-example-data', protect, admin, fileController.deleteAllExampleData);

module.exports = router;