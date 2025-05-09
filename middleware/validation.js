// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Validierungsergebnis-Middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validierung für die Benutzerregistrierung
exports.registerValidation = [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('email').isEmail().withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Passwort muss mindestens 6 Zeichen lang sein'),
  validate
];

// Validierung für die Benutzeranmeldung
exports.loginValidation = [
  body('email').isEmail().withMessage('Gültige E-Mail-Adresse erforderlich'),
  body('password').notEmpty().withMessage('Passwort ist erforderlich'),
  validate
];

// Validierung für Mitarbeiter
exports.mitarbeiterValidation = [
  body('vorname').notEmpty().withMessage('Vorname ist erforderlich'),
  body('nachname').notEmpty().withMessage('Nachname ist erforderlich'),
  body('userId').notEmpty().withMessage('Benutzer-ID ist erforderlich'),
  validate
];

// Validierung für Umzug
exports.umzugValidation = [
  body('startDatum').isISO8601().withMessage('Gültiges Startdatum erforderlich'),
  body('endDatum').isISO8601().withMessage('Gültiges Enddatum erforderlich'),
  body('auszugsadresse.strasse').notEmpty().withMessage('Straße (Auszug) ist erforderlich'),
  body('auszugsadresse.hausnummer').notEmpty().withMessage('Hausnummer (Auszug) ist erforderlich'),
  body('auszugsadresse.plz').notEmpty().withMessage('PLZ (Auszug) ist erforderlich'),
  body('auszugsadresse.ort').notEmpty().withMessage('Ort (Auszug) ist erforderlich'),
  body('einzugsadresse.strasse').notEmpty().withMessage('Straße (Einzug) ist erforderlich'),
  body('einzugsadresse.hausnummer').notEmpty().withMessage('Hausnummer (Einzug) ist erforderlich'),
  body('einzugsadresse.plz').notEmpty().withMessage('PLZ (Einzug) ist erforderlich'),
  body('einzugsadresse.ort').notEmpty().withMessage('Ort (Einzug) ist erforderlich'),
  body('auftraggeber.name').notEmpty().withMessage('Name des Auftraggebers ist erforderlich'),
  body('auftraggeber.telefon').notEmpty().withMessage('Telefon des Auftraggebers ist erforderlich'),
  validate
];

// Validierung für Aufnahme
exports.aufnahmeValidation = [
  body('datum').optional().isISO8601().withMessage('Gültiges Datum erforderlich'),
  body('kundenName').notEmpty().withMessage('Kundenname ist erforderlich'),
  validate
];

// Validierung für Projekte
exports.projectValidation = [
  body('name')
    .notEmpty().withMessage('Projektname ist erforderlich'),
  body('client')
    .notEmpty().withMessage('Client ist erforderlich'),
  body('startDate')
    .notEmpty().withMessage('Startdatum ist erforderlich')
    .isISO8601().withMessage('Ungültiges Datumsformat für Startdatum'),
  validate
];

// Validierung für Tasks
exports.taskValidation = [
  body('title').notEmpty().withMessage('Titel ist erforderlich'),
  body('project').notEmpty().withMessage('Projekt ist erforderlich'),
  body('status')
    .optional()
    .isIn(['offen', 'in Bearbeitung', 'Review', 'abgeschlossen'])
    .withMessage('Status muss einer der folgenden sein: offen, in Bearbeitung, Review, abgeschlossen'),
  body('priority')
    .optional()
    .isIn(['niedrig', 'mittel', 'hoch', 'kritisch'])
    .withMessage('Priorität muss eine der folgenden sein: niedrig, mittel, hoch, kritisch'),
  validate
];

// Validierung für Clients - Dies ist die fehlende Middleware
exports.clientValidation = [
  body('name').notEmpty().withMessage('Name ist erforderlich'),
  body('type')
    .optional()
    .isIn(['Firma', 'Privat'])
    .withMessage('Typ muss entweder Firma oder Privat sein'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Bitte geben Sie eine gültige E-Mail-Adresse an'),
  body('phone')
    .optional()
    .matches(/^[0-9\s\+\-\(\)]{8,20}$/)
    .withMessage('Bitte geben Sie eine gültige Telefonnummer an'),
  validate
];

// Weitere Validierungen können nach Bedarf hinzugefügt werden