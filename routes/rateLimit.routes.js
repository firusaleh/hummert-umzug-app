// routes/rateLimit.routes.js - Rate limit management routes
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.secure');
const { rateLimitStatus, clearRateLimits } = require('../middleware/rateLimiter');
const monitor = require('../services/rateLimitMonitor');

// Get current rate limit status for authenticated user
router.get('/status', authenticate, rateLimitStatus);

// Get rate limit statistics (admin only)
router.get('/statistics', authenticate, authorize(['admin']), (req, res) => {
  const stats = monitor.getStatistics();
  res.json({
    success: true,
    statistics: stats,
    timestamp: new Date().toISOString()
  });
});

// Get rate limit violations (admin only)
router.get('/violations', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { type, timeframe = '1h' } = req.query;
    const stats = monitor.getStatistics();
    
    let violations = stats.topOffenders;
    
    if (type) {
      violations = violations.filter(v => v.type === type);
    }
    
    res.json({
      success: true,
      violations,
      total: stats.totalViolations,
      byType: stats.byType,
      timeframe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Verstöße',
      error: error.message
    });
  }
});

// Clear rate limits for specific key (admin only)
router.delete('/clear/:key', authenticate, authorize(['admin']), clearRateLimits);

// Get rate limit configuration (admin only)
router.get('/config', authenticate, authorize(['admin']), (req, res) => {
  res.json({
    success: true,
    configuration: {
      auth: {
        window: '15 minutes',
        limit: 5,
        strategy: 'token_bucket'
      },
      api: {
        window: '1 minute',
        limit: 100,
        strategy: 'sliding_window'
      },
      upload: {
        window: '1 hour',
        limit: 20,
        strategy: 'cost_based'
      },
      financial: {
        window: '1 hour',
        limit: 50,
        strategy: 'fixed_window'
      }
    }
  });
});

// Test endpoint to verify rate limiting is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rate limit test endpoint',
    timestamp: new Date().toISOString(),
    headers: {
      'X-RateLimit-Limit': res.getHeader('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': res.getHeader('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': res.getHeader('X-RateLimit-Reset')
    }
  });
});

// Whitelist management (admin only)
router.post('/whitelist', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { ip, duration = 86400 } = req.body; // Default 24 hours
    
    // Add to whitelist in Redis
    await monitor.redisClient.setex(`whitelist:${ip}`, duration, '1');
    
    res.json({
      success: true,
      message: `IP ${ip} wurde zur Whitelist hinzugefügt`,
      duration: `${duration} Sekunden`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen zur Whitelist',
      error: error.message
    });
  }
});

// Remove from whitelist (admin only)
router.delete('/whitelist/:ip', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { ip } = req.params;
    
    await monitor.redisClient.del(`whitelist:${ip}`);
    
    res.json({
      success: true,
      message: `IP ${ip} wurde von der Whitelist entfernt`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen von der Whitelist',
      error: error.message
    });
  }
});

// Get current whitelist (admin only)
router.get('/whitelist', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const keys = await monitor.redisClient.keys('whitelist:*');
    const whitelist = [];
    
    for (const key of keys) {
      const ip = key.replace('whitelist:', '');
      const ttl = await monitor.redisClient.ttl(key);
      whitelist.push({ ip, ttl });
    }
    
    res.json({
      success: true,
      whitelist,
      count: whitelist.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Whitelist',
      error: error.message
    });
  }
});

// Health check for rate limiting system
router.get('/health', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // Check Redis connection
    const redisPing = await monitor.redisClient.ping();
    const redisConnected = redisPing === 'PONG';
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      health: {
        redis: {
          connected: redisConnected,
          ping: redisPing
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        },
        monitoring: {
          active: true,
          violations: monitor.getStatistics().totalViolations
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Systemstatus',
      error: error.message
    });
  }
});

module.exports = router;