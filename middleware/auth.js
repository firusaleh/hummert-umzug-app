// middleware/auth.js - Korrigierte Version
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Zentraler Import

// Hauptauthentifizierungs-Middleware
exports.auth = async (req, res, next) => {
  try {
    // Token aus dem Header holen
    let token = req.header('Authorization');
    
    // Falls Token nicht im Header ist, versuche es aus Cookies oder Query-Parametern
    if (!token && req.cookies) {
      token = req.cookies.token;
    }
    
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    // 'Bearer '-Präfix entfernen, falls vorhanden
    if (token && token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kein Authentifizierungstoken bereitgestellt' 
      });
    }
    
    // Umgebungsvariablen-Prüfung für JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'development_secret_key_replace_in_production';
    if (!process.env.JWT_SECRET) {
      console.warn('WARNUNG: JWT_SECRET nicht definiert in Umgebungsvariablen!');
    }
    
    // Token verifizieren
    const decoded = jwt.verify(token, jwtSecret);
    
    // Benutzer in der Datenbank suchen
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }
    
    // Prüfen, ob Benutzer aktiv ist
    if (user.isActive !== undefined && !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Konto ist deaktiviert' 
      });
    }
    
    // Benutzer zum Request hinzufügen
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentifizierungsfehler:', error);
    
    // Bessere Fehlermeldungen für häufige JWT-Fehler
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Ungültiges Token. Bitte melden Sie sich erneut an.' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: 'Nicht authentifiziert' 
    });
  }
};

// Middleware für Rollenbasierte Zugriffskontrollen
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nicht authentifiziert' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unzureichende Berechtigungen für diese Aktion' 
      });
    }
    
    next();
  };
};

// Admin-Prüfung
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Zugriff verweigert. Admin-Rechte erforderlich.'
    });
  }
};

// Mitarbeiter-Prüfung (für Endpoints, die sowohl Mitarbeiter als auch Admins nutzen können)
exports.mitarbeiter = (req, res, next) => {
  if (req.user && (req.user.role === 'mitarbeiter' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Zugriff verweigert. Mitarbeiter- oder Admin-Rechte erforderlich.'
    });
  }
};

// Exportiere 'protect' für Kompatibilität mit älterem Code
exports.protect = exports.auth;