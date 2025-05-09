// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Zentraler Import

exports.auth = async (req, res, next) => {
  try {
    // Token aus dem Header holen
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Kein Authentifizierungstoken bereitgestellt' });
    }
    
    // Token verifizieren
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Benutzer in der Datenbank suchen
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }
    
    // Prüfen, ob Benutzer aktiv ist
    if (user.isActive !== undefined && !user.isActive) {
      return res.status(401).json({ message: 'Konto ist deaktiviert' });
    }
    
    // Benutzer zum Request hinzufügen
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentifizierungsfehler:', error);
    res.status(401).json({ message: 'Token ist ungültig oder abgelaufen' });
  }
};

// Middleware für Rollenbasierte Zugriffskontrollen
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Unzureichende Berechtigungen für diese Aktion' 
      });
    }
    
    next();
  };
};

exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      message: 'Zugriff verweigert. Admin-Rechte erforderlich.'
    });
  }
};

// Exportiere 'protect' für Kompatibilität
exports.protect = exports.auth;