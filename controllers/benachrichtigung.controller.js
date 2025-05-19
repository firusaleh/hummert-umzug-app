// controllers/benachrichtigung.controller.js
const Benachrichtigung = require('../models/benachrichtigung.model');
const User = require('../models/user');
const Umzug = require('../models/umzug.model');
const nodemailer = require('nodemailer');
const { 
  createCursorPaginationResponse,
  createSearchFilter 
} = require('../middleware/pagination');

// Alle Benachrichtigungen eines Benutzers abrufen mit Cursor Pagination
exports.getMeineBenachrichtigungen = async (req, res) => {
  try {
    const { gelesen, typ, search } = req.query;
    
    // Filter erstellen
    const filter = { empfaenger: req.user.id };
    
    if (gelesen !== undefined) {
      filter.gelesen = gelesen === 'true';
    }
    
    if (typ) {
      filter.typ = typ;
    }
    
    if (search) {
      const searchFilter = createSearchFilter(search, ['titel', 'inhalt']);
      Object.assign(filter, searchFilter);
    }
    
    // Build query with sorting by creation date (newest first)
    const query = Benachrichtigung.find(filter)
      .populate('erstelltVon', 'name')
      .sort({ createdAt: -1 });
    
    // Create cursor-based response
    const response = await createCursorPaginationResponse(query, req, 'createdAt');
    
    res.json(response);
  } catch (error) {
    console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Benachrichtigungen' });
  }
};

// Benachrichtigung als gelesen markieren
exports.markiereAlsGelesen = async (req, res) => {
  try {
    const benachrichtigung = await Benachrichtigung.findById(req.params.id);
    
    if (!benachrichtigung) {
      return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    }
    
    // Prüfen, ob der Benutzer der Empfänger ist
    if (benachrichtigung.empfaenger.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unzureichende Berechtigungen' });
    }
    
    benachrichtigung.gelesen = true;
    await benachrichtigung.save();
    
    res.json({
      message: 'Benachrichtigung als gelesen markiert',
      benachrichtigung
    });
  } catch (error) {
    console.error('Fehler beim Markieren der Benachrichtigung:', error);
    res.status(500).json({ message: 'Serverfehler beim Markieren der Benachrichtigung' });
  }
};

// Alle Benachrichtigungen als gelesen markieren
exports.alleAlsGelesenMarkieren = async (req, res) => {
  try {
    await Benachrichtigung.updateMany(
      { empfaenger: req.user.id, gelesen: false },
      { gelesen: true }
    );
    
    res.json({ message: 'Alle Benachrichtigungen als gelesen markiert' });
  } catch (error) {
    console.error('Fehler beim Markieren aller Benachrichtigungen:', error);
    res.status(500).json({ message: 'Serverfehler beim Markieren aller Benachrichtigungen' });
  }
};

// Neue Benachrichtigung erstellen
exports.createBenachrichtigung = async (req, res) => {
  try {
    const { empfaenger, titel, inhalt, typ, linkUrl, bezug } = req.body;
    
    // Prüfen, ob der Empfänger existiert
    const user = await User.findById(empfaenger);
    if (!user) {
      return res.status(400).json({ message: 'Empfänger existiert nicht' });
    }
    
    // Neue Benachrichtigung erstellen
    const benachrichtigung = new Benachrichtigung({
      empfaenger,
      titel,
      inhalt,
      typ: typ || 'info',
      linkUrl,
      bezug,
      erstelltVon: req.user.id
    });
    
    await benachrichtigung.save();
    
    res.status(201).json({
      message: 'Benachrichtigung erfolgreich erstellt',
      benachrichtigung
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Benachrichtigung:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen der Benachrichtigung' });
  }
};

// Erinnerungen für offene Tasks erstellen
exports.erstelleTaskErinnerungen = async (req, res) => {
  try {
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
            inhalt: { $regex: task.beschreibung }
          });
          
          if (!existierendeBenachrichtigung) {
            // Neue Erinnerung erstellen
            await Benachrichtigung.create({
              empfaenger: task.zugewiesen,
              titel: 'Offene Aufgabe für bevorstehenden Umzug',
              inhalt: `Sie haben eine offene Aufgabe für den Umzug am ${umzug.startDatum.toLocaleDateString()}: ${task.beschreibung}`,
              typ: 'erinnerung',
              bezug: {
                typ: 'umzug',
                id: umzug._id
              },
              erstelltVon: req.user.id
            });
            
            erstellteBenachrichtigungen++;
          }
        }
      }
    }
    
    res.json({
      message: `${erstellteBenachrichtigungen} Erinnerungen erfolgreich erstellt`
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Erinnerungen:', error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen der Erinnerungen' });
  }
};

// E-Mail-Benachrichtigung senden
exports.sendEmailBenachrichtigung = async (req, res) => {
  try {
    const { empfaenger, betreff, inhalt } = req.body;
    
    // Prüfen, ob der Empfänger existiert
    const user = await User.findById(empfaenger);
    if (!user) {
      return res.status(400).json({ message: 'Empfänger existiert nicht' });
    }
    
    // E-Mail-Transporter erstellen
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // E-Mail-Optionen
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: betreff,
      html: inhalt
    };
    
    // E-Mail senden
    await transporter.sendMail(mailOptions);
    
    // Benachrichtigung in der Datenbank speichern
    await Benachrichtigung.create({
      empfaenger,
      titel: betreff,
      inhalt: 'E-Mail gesendet: ' + betreff,
      typ: 'info',
      erstelltVon: req.user.id
    });
    
    res.json({ message: 'E-Mail erfolgreich gesendet' });
  } catch (error) {
    console.error('Fehler beim Senden der E-Mail:', error);
    res.status(500).json({ message: 'Serverfehler beim Senden der E-Mail' });
  }
};