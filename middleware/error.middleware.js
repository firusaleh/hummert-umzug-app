// middleware/errorHandler.js
exports.errorHandler = (err, req, res, next) => {
  // Multer-Fehler
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Datei ist zu groß. Maximale Größe: 10MB'
      });
    }
    return res.status(400).json({
      message: `Fehler beim Hochladen der Datei: ${err.message}`
    });
  }

  // JWT-Fehler
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Ungültiger Token. Bitte erneut anmelden.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token abgelaufen. Bitte erneut anmelden.'
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      message: messages
    });
  }

  // MongoDB Duplikatschlüssel-Fehler
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Doppelter Schlüsselwert. Ein Datensatz mit diesem Wert existiert bereits.'
    });
  }

  // Standard-Serverfehlermeldung
  console.error('Server Error:', err);
  
  res.status(500).json({
    message: 'Serverfehler',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Interner Serverfehler'
  });
};