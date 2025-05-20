/**
 * benachrichtigung.controller.js - Controller for notification endpoints
 * Uses standardized error handling and service layer pattern
 */

const NotificationService = require('../services/notification.service');
const User = require('../models/user');
const Umzug = require('../models/umzug.model');
const nodemailer = require('nodemailer');
const { 
  catchAsync, 
  AppError, 
  createNotFoundError,
  createForbiddenError
} = require('../utils/error.utils');

/**
 * @desc    Get user's notifications with pagination
 * @route   GET /api/benachrichtigungen
 * @access  Private
 */
exports.getMeineBenachrichtigungen = catchAsync(async (req, res) => {
  const { gelesen, typ, search, page = 1, limit = 20 } = req.query;
  
  // Build filter and options
  const filter = {};
  
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
  
  const options = {
    filter,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    showRead: gelesen === 'true'
  };
  
  const { data, pagination } = await NotificationService.getUserNotifications(
    req.user.id, 
    options
  );
  
  res.json({
    success: true,
    data,
    pagination
  });
});

/**
 * @desc    Get count of unread notifications
 * @route   GET /api/benachrichtigungen/ungelesen/anzahl
 * @access  Private
 */
exports.getUngeleseneAnzahl = catchAsync(async (req, res) => {
  const count = await NotificationService.getUnreadCount(req.user.id);
  
  res.json({
    success: true,
    data: { count }
  });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/benachrichtigungen/:id/gelesen
 * @access  Private
 */
exports.markiereAlsGelesen = catchAsync(async (req, res) => {
  const benachrichtigung = await NotificationService.markAsRead(
    req.params.id,
    req.user.id
  );
  
  res.json({
    success: true,
    message: 'Benachrichtigung als gelesen markiert',
    data: benachrichtigung
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/benachrichtigungen/alle-gelesen
 * @access  Private
 */
exports.alleAlsGelesenMarkieren = catchAsync(async (req, res) => {
  const result = await NotificationService.markAllAsRead(req.user.id);
  
  res.json({ 
    success: true,
    message: 'Alle Benachrichtigungen als gelesen markiert',
    data: { modifiedCount: result.count }
  });
});

/**
 * @desc    Get specific notification
 * @route   GET /api/benachrichtigungen/:id
 * @access  Private
 */
exports.getBenachrichtigung = catchAsync(async (req, res) => {
  const benachrichtigung = await NotificationService.findById(
    Benachrichtigung,
    req.params.id,
    {
      populate: ['erstelltVon', 'bezug.id'],
      resourceName: 'Benachrichtigung'
    }
  );
  
  // Ensure the notification belongs to the user
  if (benachrichtigung.empfaenger.toString() !== req.user.id) {
    throw createForbiddenError('Sie haben keine Berechtigung, diese Benachrichtigung anzusehen');
  }
  
  res.json({
    success: true,
    data: benachrichtigung
  });
});

/**
 * @desc    Create a new notification (Admin only)
 * @route   POST /api/benachrichtigungen
 * @access  Private/Admin
 */
exports.createBenachrichtigung = catchAsync(async (req, res) => {
  const { empfaenger, titel, inhalt, typ, linkUrl, bezug } = req.body;
  
  // Validation
  if (!empfaenger || !titel || !inhalt) {
    throw new AppError('Empfänger, Titel und Inhalt sind erforderlich', 400);
  }
  
  // Validate type
  if (typ && !['info', 'warnung', 'erinnerung', 'erfolg'].includes(typ)) {
    throw new AppError('Ungültiger Benachrichtigungstyp', 400);
  }
  
  // Validate reference type
  if (bezug && bezug.typ && !['umzug', 'aufnahme', 'mitarbeiter', 'task', 'system'].includes(bezug.typ)) {
    throw new AppError('Ungültiger Bezugstyp', 400);
  }
  
  const benachrichtigung = await NotificationService.createNotification({
    empfaenger,
    titel,
    inhalt,
    typ: typ || 'info',
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

/**
 * @desc    Create mass notifications (Admin only)
 * @route   POST /api/benachrichtigungen/masse
 * @access  Private/Admin
 */
exports.createMassenbenachrichtigung = catchAsync(async (req, res) => {
  const { empfaengerGruppe, empfaengerIds, titel, inhalt, typ, linkUrl, bezug } = req.body;
  
  // Validation
  if (!titel || !inhalt) {
    throw new AppError('Titel und Inhalt sind erforderlich', 400);
  }
  
  let userIds = [];
  
  // Determine recipients
  if (empfaengerGruppe === 'alle') {
    const users = await User.find({ isActive: true }).select('_id');
    userIds = users.map(u => u._id);
  } else if (empfaengerGruppe === 'mitarbeiter') {
    const users = await User.find({ role: 'mitarbeiter', isActive: true }).select('_id');
    userIds = users.map(u => u._id);
  } else if (empfaengerIds && empfaengerIds.length > 0) {
    userIds = empfaengerIds;
  } else {
    throw new AppError('Keine Empfänger angegeben', 400);
  }
  
  // Create batch notifications
  const context = bezug ? { type: bezug.typ, id: bezug.id } : null;
  
  const result = await NotificationService.createBatchNotifications(
    userIds,
    titel,
    inhalt,
    {
      type: typ || 'info',
      link: linkUrl,
      context
    }
  );
  
  res.status(201).json({
    success: true,
    message: `${result.count} Benachrichtigungen erfolgreich erstellt`,
    data: { count: result.count }
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/benachrichtigungen/:id
 * @access  Private
 */
exports.deleteBenachrichtigung = catchAsync(async (req, res) => {
  await NotificationService.deleteNotification(req.params.id, req.user.id);
  
  res.json({
    success: true,
    message: 'Benachrichtigung erfolgreich gelöscht'
  });
});

/**
 * @desc    Create reminders for open tasks
 * @route   POST /api/benachrichtigungen/task-erinnerungen
 * @access  Private/Admin
 */
exports.erstelleTaskErinnerungen = catchAsync(async (req, res) => {
  // Find all moves with open tasks in the next week
  const jetzt = new Date();
  const eineWocheVoraus = new Date();
  eineWocheVoraus.setDate(eineWocheVoraus.getDate() + 7);
  
  const umzuege = await Umzug.find({
    startDatum: { $lte: eineWocheVoraus, $gte: jetzt },
    'tasks.erledigt': false
  }).populate('tasks.zugewiesen');
  
  let erstellteBenachrichtigungen = 0;
  
  // Create reminders for each move
  for (const umzug of umzuege) {
    for (const task of umzug.tasks) {
      if (!task.erledigt && task.zugewiesen) {
        try {
          // Create a new reminder with duplicate check
          await NotificationService.createSystemNotification(
            task.zugewiesen,
            'Offene Aufgabe für bevorstehenden Umzug',
            `Sie haben eine offene Aufgabe für den Umzug am ${umzug.startDatum.toLocaleDateString('de-DE')}: ${task.beschreibung}`,
            {
              type: 'erinnerung',
              link: `/umzuege/${umzug._id}`,
              context: {
                type: 'umzug',
                id: umzug._id
              }
            }
          );
          
          erstellteBenachrichtigungen++;
        } catch (err) {
          console.error(`Fehler beim Erstellen der Erinnerung für Task ${task._id}:`, err.message);
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

/**
 * @desc    Send email notification
 * @route   POST /api/benachrichtigungen/email
 * @access  Private/Admin
 */
exports.sendEmailBenachrichtigung = catchAsync(async (req, res) => {
  const { empfaenger, betreff, inhalt, html = false } = req.body;
  
  // Validation
  if (!empfaenger || !betreff || !inhalt) {
    throw new AppError('Empfänger, Betreff und Inhalt sind erforderlich', 400);
  }
  
  // Check if recipient exists
  const user = await User.findById(empfaenger);
  if (!user || !user.email) {
    throw new AppError('Empfänger existiert nicht oder hat keine E-Mail-Adresse', 400);
  }
  
  // Create email transporter
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
  
  // Email options
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
  
  // Send email
  const info = await transporter.sendMail(mailOptions);
  
  // Create notification for the email
  await NotificationService.createNotification({
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

/**
 * @desc    Get notification settings
 * @route   GET /api/benachrichtigungen/einstellungen
 * @access  Private
 */
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

/**
 * @desc    Update notification settings
 * @route   PATCH /api/benachrichtigungen/einstellungen
 * @access  Private
 */
exports.updateEinstellungen = catchAsync(async (req, res) => {
  const { email, push, typen } = req.body;
  
  const user = await User.findById(req.user.id);
  if (!user) {
    throw createNotFoundError('Benutzer');
  }
  
  // Update settings
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