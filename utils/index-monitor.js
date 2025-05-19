// utils/index-monitor.js - MongoDB Index Monitoring and Analysis

const mongoose = require('mongoose');
const config = require('../config/database');

/**
 * Index monitoring and performance analysis tool
 */
class IndexMonitor {
  constructor() {
    this.collections = [
      'users', 'umzugs', 'mitarbeiters', 'aufnahmes',
      'angebots', 'rechnungs', 'projektkostens',
      'benachrichtigungs', 'zeiterfassungs', 'tokens'
    ];
  }

  /**
   * Connect to database
   */
  async connect() {
    try {
      await mongoose.connect(config.MONGODB_URI, config.options);
      console.log('Connected to MongoDB for monitoring');
      return true;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      return false;
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats() {
    const db = mongoose.connection.db;
    const stats = {};

    for (const collection of this.collections) {
      try {
        const indexStats = await db.collection(collection)
          .aggregate([{ $indexStats: {} }])
          .toArray();

        stats[collection] = indexStats.map(stat => ({
          name: stat.name,
          key: stat.key,
          host: stat.host,
          accesses: {
            ops: stat.accesses.ops,
            since: stat.accesses.since
          }
        }));
      } catch (error) {
        stats[collection] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(durationMs = 100) {
    const db = mongoose.connection.db;
    
    try {
      const profile = await db.collection('system.profile')
        .find({ millis: { $gt: durationMs } })
        .sort({ ts: -1 })
        .limit(50)
        .toArray();

      return profile.map(query => ({
        collection: query.ns,
        command: query.command,
        duration: query.millis,
        timestamp: query.ts,
        planSummary: query.planSummary,
        execStats: query.execStats
      }));
    } catch (error) {
      console.error('Error fetching slow queries:', error);
      return [];
    }
  }

  /**
   * Analyze query patterns
   */
  async analyzeQueryPatterns() {
    const db = mongoose.connection.db;
    const patterns = {};

    for (const collection of this.collections) {
      try {
        const queries = await db.collection('system.profile')
          .find({ 
            ns: new RegExp(`${collection}$`),
            command: { $exists: true }
          })
          .limit(100)
          .toArray();

        patterns[collection] = this.extractPatterns(queries);
      } catch (error) {
        patterns[collection] = { error: error.message };
      }
    }

    return patterns;
  }

  /**
   * Extract query patterns from profile data
   */
  extractPatterns(queries) {
    const patterns = {
      findPatterns: {},
      sortPatterns: {},
      aggregationPipelines: []
    };

    queries.forEach(query => {
      if (query.command) {
        // Find queries
        if (query.command.find) {
          const filterKeys = Object.keys(query.command.filter || {}).sort().join(',');
          patterns.findPatterns[filterKeys] = (patterns.findPatterns[filterKeys] || 0) + 1;
          
          // Sort patterns
          if (query.command.sort) {
            const sortKeys = Object.keys(query.command.sort).sort().join(',');
            patterns.sortPatterns[sortKeys] = (patterns.sortPatterns[sortKeys] || 0) + 1;
          }
        }
        
        // Aggregation queries
        if (query.command.aggregate && query.command.pipeline) {
          patterns.aggregationPipelines.push({
            stages: query.command.pipeline.map(stage => Object.keys(stage)[0]),
            duration: query.millis
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Get index sizes
   */
  async getIndexSizes() {
    const db = mongoose.connection.db;
    const sizes = {};

    for (const collection of this.collections) {
      try {
        const stats = await db.collection(collection).stats();
        sizes[collection] = {
          totalIndexSize: this.formatBytes(stats.totalIndexSize),
          indexSizes: {}
        };

        for (const [indexName, size] of Object.entries(stats.indexSizes)) {
          sizes[collection].indexSizes[indexName] = this.formatBytes(size);
        }
      } catch (error) {
        sizes[collection] = { error: error.message };
      }
    }

    return sizes;
  }

  /**
   * Check for missing indexes based on query patterns
   */
  async checkMissingIndexes() {
    const patterns = await this.analyzeQueryPatterns();
    const recommendations = {};

    for (const [collection, data] of Object.entries(patterns)) {
      if (data.error) continue;

      recommendations[collection] = [];

      // Check find patterns
      for (const [pattern, count] of Object.entries(data.findPatterns)) {
        if (count > 10) { // Frequent query pattern
          recommendations[collection].push({
            type: 'find',
            fields: pattern.split(','),
            frequency: count,
            recommendation: `Consider adding index on: {${pattern.split(',').map(f => `${f}: 1`).join(', ')}}`
          });
        }
      }

      // Check sort patterns
      for (const [pattern, count] of Object.entries(data.sortPatterns)) {
        if (count > 5) { // Frequent sort pattern
          recommendations[collection].push({
            type: 'sort',
            fields: pattern.split(','),
            frequency: count,
            recommendation: `Consider adding index for sorting on: {${pattern.split(',').map(f => `${f}: 1`).join(', ')}}`
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    console.log('Generating Index Performance Report...\n');

    const [usage, slowQueries, sizes, recommendations] = await Promise.all([
      this.getIndexUsageStats(),
      this.getSlowQueries(),
      this.getIndexSizes(),
      this.checkMissingIndexes()
    ]);

    const report = {
      timestamp: new Date(),
      indexUsage: usage,
      slowQueries: slowQueries,
      indexSizes: sizes,
      recommendations: recommendations
    };

    this.displayReport(report);
    return report;
  }

  /**
   * Display report in console
   */
  displayReport(report) {
    console.log('=== INDEX PERFORMANCE REPORT ===');
    console.log(`Generated: ${report.timestamp}\n`);

    // Index Usage
    console.log('--- Index Usage Statistics ---');
    for (const [collection, stats] of Object.entries(report.indexUsage)) {
      console.log(`\n${collection}:`);
      if (stats.error) {
        console.log(`  Error: ${stats.error}`);
      } else {
        stats.forEach(index => {
          console.log(`  ${index.name}: ${index.accesses.ops} operations`);
        });
      }
    }

    // Slow Queries
    console.log('\n--- Slow Queries (>100ms) ---');
    report.slowQueries.slice(0, 10).forEach(query => {
      console.log(`\n${query.collection}:`);
      console.log(`  Duration: ${query.duration}ms`);
      console.log(`  Plan: ${query.planSummary}`);
      console.log(`  Command: ${JSON.stringify(query.command).substring(0, 100)}...`);
    });

    // Index Sizes
    console.log('\n--- Index Sizes ---');
    for (const [collection, sizes] of Object.entries(report.indexSizes)) {
      console.log(`\n${collection}:`);
      if (sizes.error) {
        console.log(`  Error: ${sizes.error}`);
      } else {
        console.log(`  Total: ${sizes.totalIndexSize}`);
        for (const [indexName, size] of Object.entries(sizes.indexSizes)) {
          console.log(`    ${indexName}: ${size}`);
        }
      }
    }

    // Recommendations
    console.log('\n--- Index Recommendations ---');
    for (const [collection, recommendations] of Object.entries(report.recommendations)) {
      if (recommendations.length > 0) {
        console.log(`\n${collection}:`);
        recommendations.forEach(rec => {
          console.log(`  ${rec.recommendation} (${rec.frequency} queries)`);
        });
      }
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Monitor indexes continuously
   */
  async startMonitoring(intervalMinutes = 60) {
    console.log(`Starting continuous monitoring (every ${intervalMinutes} minutes)...`);
    
    // Initial report
    await this.generateReport();
    
    // Set up interval
    setInterval(async () => {
      console.log('\n=== PERIODIC INDEX CHECK ===');
      await this.generateReport();
    }, intervalMinutes * 60 * 1000);
  }
}

// CLI handling
if (require.main === module) {
  const monitor = new IndexMonitor();
  
  (async () => {
    const connected = await monitor.connect();
    if (!connected) {
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const command = args[0] || 'report';
    
    switch (command) {
      case 'report':
        await monitor.generateReport();
        break;
      case 'monitor':
        const interval = parseInt(args[1]) || 60;
        await monitor.startMonitoring(interval);
        break;
      case 'usage':
        const usage = await monitor.getIndexUsageStats();
        console.log(JSON.stringify(usage, null, 2));
        break;
      case 'slow':
        const slowQueries = await monitor.getSlowQueries();
        console.log(JSON.stringify(slowQueries, null, 2));
        break;
      case 'recommendations':
        const recommendations = await monitor.checkMissingIndexes();
        console.log(JSON.stringify(recommendations, null, 2));
        break;
      default:
        console.log('Usage: node index-monitor.js [command] [options]');
        console.log('Commands:');
        console.log('  report           - Generate full performance report');
        console.log('  monitor [mins]   - Start continuous monitoring');
        console.log('  usage           - Show index usage statistics');
        console.log('  slow            - Show slow queries');
        console.log('  recommendations - Show index recommendations');
    }
    
    if (command !== 'monitor') {
      await mongoose.connection.close();
    }
  })();
}

module.exports = IndexMonitor;