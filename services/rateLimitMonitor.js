// services/rateLimitMonitor.js - Rate limit monitoring and alerting
const EventEmitter = require('events');
const { redisClient } = require('../middleware/rateLimiter');
const fs = require('fs').promises;
const path = require('path');

class RateLimitMonitor extends EventEmitter {
  constructor() {
    super();
    this.violations = new Map();
    this.thresholds = {
      auth: { count: 10, window: 60 * 60 * 1000 }, // 10 violations per hour
      api: { count: 100, window: 60 * 60 * 1000 }, // 100 violations per hour
      financial: { count: 20, window: 60 * 60 * 1000 }, // 20 violations per hour
      upload: { count: 50, window: 60 * 60 * 1000 } // 50 violations per hour
    };
    this.startMonitoring();
  }

  startMonitoring() {
    // Monitor Redis for rate limit violations
    setInterval(() => this.checkViolations(), 60 * 1000); // Check every minute
    
    // Log violations
    this.on('violation', (data) => this.logViolation(data));
    
    // Alert on suspicious patterns
    this.on('suspiciousActivity', (data) => this.alertSuspiciousActivity(data));
  }

  async checkViolations() {
    try {
      const keys = await redisClient.keys('rl:*');
      
      for (const key of keys) {
        const value = await redisClient.get(key);
        const count = parseInt(value) || 0;
        const [, type, identifier] = key.split(':');
        
        // Check if this is a violation
        const threshold = this.getThresholdForType(type);
        if (count >= threshold) {
          this.recordViolation(type, identifier, count);
        }
      }
      
      // Check for patterns
      this.checkPatterns();
    } catch (error) {
      console.error('Error checking rate limit violations:', error);
    }
  }

  getThresholdForType(type) {
    const thresholds = {
      auth: 5,
      api: 100,
      financial: 50,
      upload: 20,
      public: 20,
      admin: 500,
      reset: 3,
      email: 10
    };
    
    return thresholds[type] || 100;
  }

  recordViolation(type, identifier, count) {
    const now = Date.now();
    const violationKey = `${type}:${identifier}`;
    
    if (!this.violations.has(violationKey)) {
      this.violations.set(violationKey, []);
    }
    
    const violations = this.violations.get(violationKey);
    violations.push({ timestamp: now, count });
    
    // Keep only recent violations
    const windowSize = this.thresholds[type]?.window || 60 * 60 * 1000;
    const recentViolations = violations.filter(v => now - v.timestamp < windowSize);
    this.violations.set(violationKey, recentViolations);
    
    // Emit violation event
    this.emit('violation', {
      type,
      identifier,
      count,
      recentViolations: recentViolations.length,
      timestamp: now
    });
    
    // Check if this constitutes suspicious activity
    if (recentViolations.length >= (this.thresholds[type]?.count || 10)) {
      this.emit('suspiciousActivity', {
        type,
        identifier,
        violationCount: recentViolations.length,
        window: windowSize,
        timestamp: now
      });
    }
  }

  checkPatterns() {
    // Check for distributed attacks (same pattern from multiple IPs)
    const ipPatterns = new Map();
    
    for (const [key, violations] of this.violations) {
      const [type, identifier] = key.split(':');
      if (identifier.startsWith('ip:')) {
        const ip = identifier.substring(3);
        const subnet = ip.split('.').slice(0, 3).join('.');
        
        if (!ipPatterns.has(subnet)) {
          ipPatterns.set(subnet, []);
        }
        
        ipPatterns.get(subnet).push({ type, ip, violations: violations.length });
      }
    }
    
    // Alert on suspicious patterns
    for (const [subnet, ips] of ipPatterns) {
      if (ips.length > 5) { // More than 5 IPs from same subnet
        this.emit('suspiciousActivity', {
          type: 'distributed_attack',
          subnet,
          ipCount: ips.length,
          details: ips,
          timestamp: Date.now()
        });
      }
    }
  }

  async logViolation(data) {
    const logDir = path.join(__dirname, '..', 'logs', 'rate-limits');
    const logFile = path.join(logDir, `violations-${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.mkdir(logDir, { recursive: true });
      const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  }

  async alertSuspiciousActivity(data) {
    // Log to special file
    const logDir = path.join(__dirname, '..', 'logs', 'rate-limits');
    const alertFile = path.join(logDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
    
    try {
      await fs.mkdir(logDir, { recursive: true });
      const alertEntry = `${new Date().toISOString()} - ALERT: ${JSON.stringify(data)}\n`;
      await fs.appendFile(alertFile, alertEntry);
      
      // In production, this would send email/SMS alerts
      console.error('RATE LIMIT ALERT:', data);
      
      // Could integrate with monitoring services like:
      // - Send email via nodemailer
      // - Send SMS via Twilio
      // - Post to Slack webhook
      // - Create incident in PagerDuty
      
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }

  // Get current monitoring statistics
  getStatistics() {
    const stats = {
      totalViolations: 0,
      byType: {},
      topOffenders: [],
      recentAlerts: []
    };
    
    for (const [key, violations] of this.violations) {
      const [type, identifier] = key.split(':');
      
      stats.totalViolations += violations.length;
      
      if (!stats.byType[type]) {
        stats.byType[type] = 0;
      }
      stats.byType[type] += violations.length;
      
      stats.topOffenders.push({
        identifier,
        type,
        count: violations.length
      });
    }
    
    // Sort and limit top offenders
    stats.topOffenders.sort((a, b) => b.count - a.count);
    stats.topOffenders = stats.topOffenders.slice(0, 10);
    
    return stats;
  }

  // Clear old violations from memory
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, violations] of this.violations) {
      const recentViolations = violations.filter(v => now - v.timestamp < maxAge);
      
      if (recentViolations.length === 0) {
        this.violations.delete(key);
      } else {
        this.violations.set(key, recentViolations);
      }
    }
  }
}

// Create singleton instance
const monitor = new RateLimitMonitor();

// Cleanup old data periodically
setInterval(() => monitor.cleanup(), 60 * 60 * 1000); // Every hour

module.exports = monitor;