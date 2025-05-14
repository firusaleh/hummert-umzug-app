// routes/health.js
const express = require('express');
const router = express.Router();

// Einfacher Health-Check-Endpunkt
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hummert-umzug-api'
  });
});

module.exports = router;