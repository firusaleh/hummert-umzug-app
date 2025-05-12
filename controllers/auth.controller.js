// controllers/auth.controller.js
const { User } = require('../models'); // Zentraler Import
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Hilfsfunktion, um besser zu verstehen, was vom Frontend gesendet wird
const logRequestBody = (req) => {
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
};

// Erstellt JWT Token
const createToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );
};

exports.register = async (req, res) => {
  try {
    // Request-Body für Debugging loggen
    logRequestBody(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Hier ist der wichtige Fix: Akzeptiere 'name' oder 'username'
    const { email, password } = req.body;
    const username = req.body.username || req.body.name || email.split('@')[0];

    console.log('Verwendeter Benutzername:', username);

    // Prüfen, ob Benutzer bereits existiert
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }]
    });

    if (userExists) {
      return res.status(400).json({ 
        message: 'Benutzer mit dieser E-Mail oder diesem Benutzernamen existiert bereits' 
      });
    }

    // Neuen Benutzer erstellen
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Token erstellen
    const token = createToken(user);

    res.status(201).json({
      message: 'Benutzer erfolgreich registriert',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Fehler bei der Benutzerregistrierung:', error);
    
    // Verbesserte Fehlerbehandlung
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validierungsfehler',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      message: 'Serverfehler bei der Registrierung', 
      error: error.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    // Request-Body für Debugging loggen
    logRequestBody(req);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Benutzer finden
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    // Passwort überprüfen
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }

    // Login-Zeit aktualisieren
    user.lastLogin = Date.now();
    await user.save();

    // Token erstellen
    const token = createToken(user);

    res.json({
      message: 'Login erfolgreich',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ message: 'Serverfehler beim Login', error: error.message });
  }
}; 

// Funktion zum Abrufen des eigenen Profils
exports.getMe = async (req, res) => {
  try {
    // Der Benutzer ist bereits in req.user verfügbar, da die auth-Middleware ihn dort platziert hat
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzerprofils:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Benutzerprofils' });
  }
};