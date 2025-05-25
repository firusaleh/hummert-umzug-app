// middleware/legacyFormat.js
// Middleware to handle legacy API request formats

/**
 * Transform legacy request formats to current format
 */
exports.transformLegacyRequest = (req, res, next) => {
  // Transform Umzug legacy format
  if (req.path.includes('/umzuege') && req.method === 'POST') {
    if (req.body.kunde && !req.body.auftraggeber) {
      req.body.auftraggeber = req.body.kunde;
      delete req.body.kunde;
    }
    
    if (req.body.datum && !req.body.startDatum) {
      req.body.startDatum = req.body.datum;
      req.body.endDatum = req.body.datum;
      delete req.body.datum;
    }
  }
  
  // Transform Fahrzeug legacy format
  if (req.path.includes('/fahrzeuge') && req.method === 'POST') {
    if (req.body.status === 'verfuegbar') {
      req.body.status = 'verfügbar';
    }
    
    // Add bezeichnung if missing
    if (!req.body.bezeichnung && req.body.marke && req.body.modell) {
      req.body.bezeichnung = `${req.body.marke} ${req.body.modell}`;
    }
  }
  
  next();
};

/**
 * Transform responses to include consistent format
 */
exports.transformResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // If data is an array, wrap it in standard format
    if (Array.isArray(data)) {
      data = {
        success: true,
        data: data,
        count: data.length
      };
    }
    // If data doesn't have success field, add it
    else if (data && typeof data === 'object' && !data.hasOwnProperty('success')) {
      data = {
        success: true,
        ...data
      };
    }
    
    originalJson.call(this, data);
  };
  
  next();
};
