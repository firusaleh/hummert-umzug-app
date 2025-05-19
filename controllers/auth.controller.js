// controllers/auth.controller.js - Korrigierte Version
const { User } = require('../models'); // Zentraler Import
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Hilfsfunktion, um besser zu verstehen, was vom Frontend gesendet wird
const logRequestBody = (req) => {
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
};

// Erstellt JWT Token
const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    console.error('WARNUNG: JWT_SECRET nicht definiert in Umgebungsvariablen!');
    // Fallback für Entwicklungsumgebung (NICHT FÜR PRODUKTION VERWENDEN!)
    return jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      'development_secret_key_replace_in_production',
      { expiresIn: '1d' }
    );
  }
  
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role }, 
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
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Extrahiere Daten aus dem Request
    const { email, password, role } = req.body;
    
    // Das Modell verwendet 'name', nicht 'username'
    const name = req.body.name || email.split('@')[0];

    console.log('Verwendeter Name:', name);

    // Prüfen, ob Benutzer bereits existiert
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'Benutzer mit dieser E-Mail existiert bereits' 
      });
    }

    // Neuen Benutzer erstellen mit den Feldern, die das Modell erwartet
    const user = new User({
      name,        // Verwende 'name' statt 'username'
      email,
      password,
      role: role || 'mitarbeiter' // Erlaube das Setzen der Rolle beim Registrieren (Standardwert korrigiert)
    });

    await user.save();

    // Token erstellen
    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich registriert',
      token,
      user: {
        id: user._id,
        name: user.name,
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
        success: false,
        message: 'Validierungsfehler',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ 
      success: false,
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
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Benutzer finden
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' });
    }

    // Passwort überprüfen
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' });
    }

    // Prüfen, ob Benutzer aktiv ist
    if (user.isActive !== undefined && !user.isActive) {
      return res.status(401).json({ success: false, message: 'Dieses Konto wurde deaktiviert' });
    }

    // Login-Zeit aktualisieren
    user.lastLogin = Date.now();
    await user.save();

    // Token erstellen
    const token = createToken(user);

    res.json({
      success: true,
      message: 'Login erfolgreich',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Login', 
      error: error.message 
    });
  }
}; 

// Funktion zum Abrufen des eigenen Profils
exports.getMe = async (req, res) => {
  try {
    // Der Benutzer ist bereits in req.user verfügbar, da die auth-Middleware ihn dort platziert hat
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzerprofils:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen des Benutzerprofils' 
    });
  }
};

// Authentifizierungsstatus überprüfen
exports.checkAuth = async (req, res) => {
  try {
    // req.user wird durch auth-Middleware hinzugefügt
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }
    
    res.json({
      success: true,
      message: 'Authentifiziert',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Fehler bei der Authentifizierungsprüfung:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler bei der Authentifizierungsprüfung'
    });
  }
};

// Neue Funktion: Admin-Benutzer erstellen
exports.createAdmin = async (req, res) => {
  try {
    // Request-Body für Debugging loggen
    logRequestBody(req);

    const { email, password, name } = req.body;
    
    // Prüfen, ob Benutzer bereits existiert
    const userExists = await User.findOne({ email });

    if (userExists) {
      // Wenn der Benutzer existiert, zu Admin machen
      userExists.role = 'admin';
      await userExists.save();
      
      return res.status(200).json({ 
        success: true,
        message: 'Benutzer wurde zum Admin hochgestuft',
        user: {
          id: userExists._id,
          name: userExists.name,
          email: userExists.email,
          role: userExists.role
        }
      });
    }

    // Neuen Admin-Benutzer erstellen
    const user = new User({
      name: name || email.split('@')[0],
      email,
      password,
      role: 'admin'
    });

    await user.save();

    // Token erstellen
    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: 'Admin-Benutzer erfolgreich erstellt',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Admin-Benutzers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Serverfehler beim Erstellen des Admin-Benutzers', 
      error: error.message 
    });
  }
};