
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Token aus dem Authorization Header extrahieren
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Prüfen, ob Token existiert
    if (!token) {
      return res.status(401).json({
        message: 'Nicht autorisierter Zugriff. Bitte melden Sie sich an.'
      });
    }

    try {
      // Token verifizieren
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Benutzer aus Token-ID finden
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          message: 'Benutzer existiert nicht mehr'
        });
      }

      // Benutzer zu Request hinzufügen
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        message: 'Ungültiger Token. Bitte erneut anmelden.'
      });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      message: 'Serverfehler bei der Authentifizierung'
    });
  }
};

// Middleware für Admin-Berechtigungen
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      message: 'Zugriff verweigert. Admin-Rechte erforderlich.'
    });
  }
};