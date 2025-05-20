// controllers/benachrichtigung.controller.js - Updated with standardized error handling
const Benachrichtigung = require('../models/benachrichtigung.model');
const User = require('../models/user');
const Umzug = require('../models/umzug.model');
const nodemailer = require('nodemailer');
const { 
  catchAsync, 
  AppError, 
  createNotFoundError,
  createForbiddenError
} = require('../utils/error.utils');

const { 
  createCursorPaginatedResponse,
  createSearchFilter 
} = require('../middleware/pagination');

// Erstelle eine neue Benachrichtigung mit vollständiger Validierung
const createNotification = async (data) => {
  const { empfaenger, titel, inhalt, typ = 'info', linkUrl, bezug, erstelltVon } = data;
  
  // Prüfen, ob der Empfänger existiert
  const user = await User.findById(empfaenger);
  if (!user) {
    throw new AppError('Empfänger existiert nicht', 400);
  }
  
  const benachrichtigung = new Benachrichtigung({
    empfaenger,
    titel,
    inhalt,
    typ,
    linkUrl,
    bezug,
    erstelltVon
  });
  
  await benachrichtigung.save();
  return benachrichtigung;
};

// Alle Benachrichtigungen eines Benutzers abrufen mit Cursor Pagination
exports.getMeineBenachrichtigungen = catchAsync(async (req, res) => {
  const { gelesen, typ, search, sortBy = 'createdAt:desc' } = req.query;
  
  // Filter erstellen
  const filter = { empfaenger: req.user.id };
  
  if (gelesen !== undefined) {
    filter.gelesen = gelesen === 'true';
  }
  
  if (typ) {
    if (!['info', 'warnung', 'erinnerung', 'erfolg'].includes(typ)) {
      throw new AppError('Ungültiger Benachrichtigungstyp', 400);
    }
    filter.typ = typ;
  }
  
  if (search) {
    filter.$or = [
      { titel: { $regex: search, $options: 'i' } },
      { inhalt: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Parse sort options
  const [sortField, sortOrder] = sortBy.split(':');
  const sort = { [sortField]: sortOrder === 'desc' ? -1 : 1 };
  
  // Build query
  const query = Benachrichtigung.find(filter)
    .populate('erstelltVon', 'name email')
    .populate('bezug.id')
    .sort(sort);
  
  // Create cursor-based response
  const response = await createCursorPaginatedResponse(
    Benachrichtigung, 
    filter, 
    req.pagination || { limit: 20, sort }
  );
  
  // Füge populierte Daten hinzu
  if (response.data.length > 0) {
    response.data = await Benachrichtigung.populate(response.data, [
      { path: 'erstelltVon', select: 'name email' },
      { path: 'bezug.id' }
    ]);
  }
  
  res.json({
    success: true,
    ...response
  });
});

// Ungelesene Benachrichtigungen zählen
exports.getUngeleseneAnzahl = catchAsync(async (req, res) => {
  const count = await Benachrichtigung.countDocuments({
    empfaenger: req.user.id,
    gelesen: false
  });
  
  res.json({
    success: true,
    data: { count }
  });
});

// Benachrichtigung als gelesen markieren
exports.markiereAlsGelesen = catchAsync(async (req, res) => {
  const benachrichtigung = await Benachrichtigung.findById(req.params.id);
  
  if (!benachrichtigung) {
    throw createNotFoundError('Benachrichtigung');
  }
  
  // Prüfen, ob der Benutzer der Empfänger ist
  if (benachrichtigung.empfaenger.toString() !== req.user.id) {
    throw createForbiddenError('Sie haben keine Berechtigung, diese Benachrichtigung zu bearbeiten');
  }
  
  benachrichtigung.gelesen = true;
  benachrichtigung.gelesenAm = new Date();
  await benachrichtigung.save();
  
  res.json({
    success: true,
    message: 'Benachrichtigung als gelesen markiert',
    data: benachrichtigung
  });
});

// Alle Benachrichtigungen als gelesen markieren
exports.alleAlsGelesenMarkieren = catchAsync(async (req, res) => {
  const result = await Benachrichtigung.updateMany(
    { empfaenger: req.user.id, gelesen: false },
    { 
      gelesen: true,
      gelesenAm: new Date()
    }
  );
  
  res.json({ 
    success: true,
    message: 'Alle Benachrichtigungen als gelesen markiert',
    data: { modifiedCount: result.modifiedCount }
  });
});

// Einzelne Benachrichtigung abrufen
exports.getBenachrichtigung = catchAsync(async (req, res) => {
  const benachrichtigung = await Benachrichtigung.findById(req.params.id)
    .populate('erstelltVon', 'name email')
    .populate('bezug.id');
  
  if (!benachrichtigung) {
    throw createNotFoundError('Benachrichtigung');
  }
  
  // Prüfen, ob der Benutzer der Empfänger ist
  if (benachrichtigung.empfaenger.toString() !== req.user.id) {
    throw createForbiddenError('Sie haben keine Berechtigung, diese Benachrichtigung anzusehen');
  }
  
  res.json({
    success: true,
    data: benachrichtigung
  });
});

// Neue Benachrichtigung erstellen (nur für Admins)
exports.createBenachrichtigung = catchAsync(async (req, res) => {
  const { empfaenger, titel, inhalt, typ, linkUrl, bezug } = req.body;
  
  // Validierung
  if (!empfaenger || !titel || !inhalt) {
    throw new AppError('Empfänger, Titel und Inhalt sind erforderlich', 400);
  }
  
  // Typ validieren
  if (typ && !['info', 'warnung', 'erinnerung', 'erfolg'].includes(typ)) {
    throw new AppError('Ungültiger Benachrichtigungstyp', 400);
  }
  
  // Bezug validieren
  if (bezug && bezug.typ && !['umzug', 'aufnahme', 'mitarbeiter', 'task', 'system'].includes(bezug.typ)) {
    throw new AppError('Ungültiger Bezugstyp', 400);
  }
  
  const benachrichtigung = await createNotification({
    empfaenger,
    titel,
    inhalt,
    typ,
    linkUrl,
    bezug,
    erstelltVon: req.user.id
  });
  
  res.status(201).json({
    success: true,
    message: 'Benachrichtigung erfolgreich erstellt',
    data: benachrichtigung
  });
});

// Massenbenachrichtigungen erstellen (nur für Admins)
exports.createMassenbenachrichtigung = catchAsync(async (req, res) => {
  const { empfaengerGruppe, empfaengerIds, titel, inhalt, typ, linkUrl } = req.body;
  
  // Validierung
  if (!titel || !inhalt) {
    throw new AppError('Titel und Inhalt sind erforderlich', 400);
  }
  
  let empfaenger = [];
  
  // Empfänger bestimmen
  if (empfaengerGruppe === 'alle') {
    const users = await User.find({ isActive: true }).select('_id');
    empfaenger = users.map(u => u._id);
  } else if (empfaengerGruppe === 'mitarbeiter') {
    const users = await User.find({ role: 'mitarbeiter', isActive: true }).select('_id');
    empfaenger = users.map(u => u._id);
  } else if (empfaengerIds && empfaengerIds.length > 0) {
    empfaenger = empfaengerIds;
  } else {
    throw new AppError('Keine Empfänger angegeben', 400);
  }
  
  // Benachrichtigungen erstellen
  const benachrichtigungen = await Promise.all(
    empfaenger.map(empfaengerId => 
      createNotification({
        empfaenger: empfaengerId,
        titel,
        inhalt,
        typ: typ || 'info',
        linkUrl,
        erstelltVon: req.user.id
      }).catch(err => {
        // Bei Fehler mit einzelnem Empfänger nur diese überspringen
        console.error(`Fehler beim Erstellen der Benachrichtigung für ${empfaengerId}:`, err.message);
        return null;
      })
    )
  );
  
  // Erfolgreiche Benachrichtigungen zählen
  const erfolgreicheBenachrichtigungen = benachrichtigungen.filter(b => b !== null);
  
  res.status(201).json({
    success: true,
    message: `${erfolgreicheBenachrichtigungen.length} Benachrichtigungen erfolgreich erstellt`,
    data: { count: erfolgreicheBenachrichtigungen.length }
  });
});

// Benachrichtigung löschen
exports.deleteBenachrichtigung = catchAsync(async (req, res) => {
  const benachrichtigung = await Benachrichtigung.findById(req.params.id);
  
  if (!benachrichtigung) {
    throw createNotFoundError('Benachrichtigung');
  }
  
  // Prüfen, ob der Benutzer der Empfänger ist oder Admin
  if (benachrichtigung.empfaenger.toString() !== req.user.id && req.user.role !== 'admin') {
    throw createForbiddenError('Sie haben keine Berechtigung, diese Benachrichtigung zu löschen');
  }
  
  await benachrichtigung.deleteOne();
  
  res.json({
    success: true,
    message: 'Benachrichtigung erfolgreich gelöscht'
  });
});

// Erinnerungen für offene Tasks erstellen
exports.erstelleTaskErinnerungen = catchAsync(async (req, res) => {
  // Alle Umzüge mit offenen Tasks in der nächsten Woche finden
  const jetzt = new Date();
  const eineWocheVoraus = new Date();
  eineWocheVoraus.setDate(eineWocheVoraus.getDate() + 7);
  
  const umzuege = await Umzug.find({
    startDatum: { $lte: eineWocheVoraus, $gte: jetzt },
    'tasks.erledigt': false
  }).populate('tasks.zugewiesen');
  
  let erstellteBenachrichtigungen = 0;
  
  // Für jeden Umzug Erinnerungen erstellen
  for (const umzug of umzuege) {
    for (const task of umzug.tasks) {
      if (!task.erledigt && task.zugewiesen) {
        // Prüfen, ob bereits eine Erinnerung existiert
        const existierendeBenachrichtigung = await Benachrichtigung.findOne({
          empfaenger: task.zugewiesen,
          'bezug.typ': 'umzug',
          'bezug.id': umzug._id,
          inhalt: { $regex: task.beschreibung },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Nur in den letzten 24 Stunden
        });
        
        if (!existierendeBenachrichtigung) {
          try {
            // Neue Erinnerung erstellen
            await createNotification({
              empfaenger: task.zugewiesen,
              titel: 'Offene Aufgabe für bevorstehenden Umzug',
              inhalt: `Sie haben eine offene Aufgabe für den Umzug am ${umzug.startDatum.toLocaleDateString('de-DE')}: ${task.beschreibung}`,
              typ: 'erinnerung',
              linkUrl: `/umzuege/${umzug._id}`,
              bezug: {
                typ: 'umzug',
                id: umzug._id
              },
              erstelltVon: req.user.id
            });
            
            erstellteBenachrichtigungen++;
          } catch (err) {
            console.error(`Fehler beim Erstellen der Erinnerung für Task ${task._id}:`, err.message);
            // Weiter mit der nächsten Task
          }
        }
      }
    }
  }
  
  res.json({
    success: true,
    message: `${erstellteBenachrichtigungen} Erinnerungen erfolgreich erstellt`,
    data: { count: erstellteBenachrichtigungen }
  });
});

// E-Mail-Benachrichtigung senden
exports.sendEmailBenachrichtigung = catchAsync(async (req, res) => {
  const { empfaenger, betreff, inhalt, html = false } = req.body;
  
  // Validierung
  if (!empfaenger || !betreff || !inhalt) {
    throw new AppError('Empfänger, Betreff und Inhalt sind erforderlich', 400);
  }
  
  // Prüfen, ob der Empfänger existiert
  const user = await User.findById(empfaenger);
  if (!user || !user.email) {
    throw new AppError('Empfänger existiert nicht oder hat keine E-Mail-Adresse', 400);
  }
  
  // E-Mail-Transporter erstellen (mit besserer Fehlerbehandlung)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new AppError('E-Mail-Konfiguration fehlt', 500);
  }
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  // E-Mail-Optionen
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'Hummert Umzug'} <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: betreff,
    [html ? 'html' : 'text']: inhalt,
    headers: {
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'X-Mailer': 'Hummert Umzug Notification System'
    }
  };
  
  // E-Mail senden
  const info = await transporter.sendMail(mailOptions);
  
  // Benachrichtigung in der Datenbank speichern
  await createNotification({
    empfaenger,
    titel: betreff,
    inhalt: `E-Mail gesendet: ${betreff}`,
    typ: 'info',
    erstelltVon: req.user.id
  });
  
  res.json({ 
    success: true,
    message: 'E-Mail erfolgreich gesendet',
    data: { messageId: info.messageId }
  });
});

// Benachrichtigungseinstellungen abrufen
exports.getEinstellungen = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('benachrichtigungseinstellungen');
  
  if (!user) {
    throw createNotFoundError('Benutzer');
  }
  
  res.json({
    success: true,
    data: {
      einstellungen: user.benachrichtigungseinstellungen || {
        email: true,
        push: true,
        typen: {
          info: true,
          warnung: true,
          erinnerung: true,
          erfolg: true
        }
      }
    }
  });
});

// Benachrichtigungseinstellungen aktualisieren
exports.updateEinstellungen = catchAsync(async (req, res) => {
  const { email, push, typen } = req.body;
  
  const user = await User.findById(req.user.id);
  if (!user) {
    throw createNotFoundError('Benutzer');
  }
  
  // Einstellungen aktualisieren
  if (!user.benachrichtigungseinstellungen) {
    user.benachrichtigungseinstellungen = {};
  }
  
  if (email !== undefined) user.benachrichtigungseinstellungen.email = email;
  if (push !== undefined) user.benachrichtigungseinstellungen.push = push;
  if (typen) {
    user.benachrichtigungseinstellungen.typen = {
      ...user.benachrichtigungseinstellungen.typen,
      ...typen
    };
  }
  
  await user.save();
  
  res.json({
    success: true,
    message: 'Einstellungen erfolgreich aktualisiert',
    data: { einstellungen: user.benachrichtigungseinstellungen }
  });
});