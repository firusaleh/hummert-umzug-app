// utils/indexMonitor.js - Database index monitoring
const mongoose = require('mongoose');
const { indexDefinitions } = require('../config/indexes');
require('dotenv').config();

class IndexMonitor {
  constructor() {
    this.slowQueries = [];
    this.queryStats = new Map();
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB for monitoring');
      
      // Enable profiling for slow queries
      await this.enableProfiling();
      return true;
    } catch (error) {
      console.error('Failed to connect:', error.message);
      return false;
    }
  }

  async enableProfiling(slowMs = 1000) {
    try {
      const db = mongoose.connection.db;
      await db.setProfilingLevel(1, { slowms: slowMs });
      console.log(`Profiling enabled for queries slower than ${slowMs}ms`);
    } catch (error) {
      console.error('Failed to enable profiling:', error.message);
    }
  }

  async getIndexUsageStats() {
    const stats = {};
    
    for (const collectionName of Object.keys(indexDefinitions)) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Get index usage statistics
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        // Get collection statistics
        const collStats = await collection.stats();
        
        stats[collectionName] = {
          documentCount: collStats.count,
          totalSize: collStats.size,
          avgObjectSize: collStats.avgObjSize,
          indexes: indexStats.map(stat => ({
            name: stat.name,
            operations: stat.accesses.ops,
            since: stat.accesses.since,
            usage: this.calculateUsageRate(stat.accesses)
          }))
        };
      } catch (error) {
        console.error(`Failed to get stats for ${collectionName}:`, error.message);
      }
    }
    
    return stats;
  }

  calculateUsageRate(accesses) {
    const now = new Date();
    const since = new Date(accesses.since);
    const daysActive = (now - since) / (1000 * 60 * 60 * 24);
    
    if (daysActive < 1) return 'New index';
    
    const opsPerDay = accesses.ops / daysActive;
    
    if (opsPerDay === 0) return 'Unused';
    if (opsPerDay < 10) return 'Low usage';
    if (opsPerDay < 100) return 'Moderate usage';
    if (opsPerDay < 1000) return 'High usage';
    return 'Very high usage';
  }

  async getSlowQueries(limit = 20) {
    try {
      const db = mongoose.connection.db;
      const profileCollection = db.collection('system.profile');
      
      const slowQueries = await profileCollection
        .find({ millis: { $gt: 100 } })
        .sort({ millis: -1 })
        .limit(limit)
        .toArray();
      
      return slowQueries.map(query => ({
        collection: query.ns.split('.')[1],
        operation: query.op,
        duration: query.millis,
        timestamp: query.ts,
        query: query.command || query.query,
        index: query.planSummary
      }));
    } catch (error) {
      console.error('Failed to get slow queries:', error.message);
      return [];
    }
  }

  async analyzeQueryPerformance() {
    const slowQueries = await this.getSlowQueries();
    const analysis = {
      totalSlowQueries: slowQueries.length,
      byCollection: {},
      byOperation: {},
      recommendations: []
    };
    
    // Analyze slow queries
    for (const query of slowQueries) {
      // By collection
      if (!analysis.byCollection[query.collection]) {
        analysis.byCollection[query.collection] = {
          count: 0,
          totalTime: 0,
          queries: []
        };
      }
      analysis.byCollection[query.collection].count++;
      analysis.byCollection[query.collection].totalTime += query.duration;
      analysis.byCollection[query.collection].queries.push(query);
      
      // By operation
      if (!analysis.byOperation[query.operation]) {
        analysis.byOperation[query.operation] = 0;
      }
      analysis.byOperation[query.operation]++;
      
      // Generate recommendations
      if (query.index === 'COLLSCAN') {
        analysis.recommendations.push({
          collection: query.collection,
          issue: 'Collection scan detected',
          recommendation: `Consider adding an index for query: ${JSON.stringify(query.query)}`,
          impact: 'High'
        });
      }
    }
    
    return analysis;
  }

  async getUnusedIndexes() {
    const stats = await this.getIndexUsageStats();
    const unusedIndexes = [];
    
    for (const [collection, data] of Object.entries(stats)) {
      for (const index of data.indexes) {
        if (index.operations === 0 && index.name !== '_id_') {
          unusedIndexes.push({
            collection,
            index: index.name,
            since: index.since,
            recommendation: 'Consider dropping this unused index to save storage'
          });
        }
      }
    }
    
    return unusedIndexes;
  }

  async getMissingIndexes() {
    const slowQueries = await this.getSlowQueries(50);
    const recommendations = new Map();
    
    for (const query of slowQueries) {
      if (query.index === 'COLLSCAN') {
        const key = `${query.collection}:${JSON.stringify(query.query)}`;
        
        if (!recommendations.has(key)) {
          recommendations.set(key, {
            collection: query.collection,
            query: query.query,
            occurrences: 0,
            totalTime: 0,
            suggestedIndex: this.suggestIndex(query.query)
          });
        }
        
        const rec = recommendations.get(key);
        rec.occurrences++;
        rec.totalTime += query.duration;
      }
    }
    
    return Array.from(recommendations.values())
      .sort((a, b) => b.totalTime - a.totalTime);
  }

  suggestIndex(query) {
    const fields = {};
    
    // Extract fields from query
    const extractFields = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;
        
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          if (value.$gt || value.$gte || value.$lt || value.$lte) {
            fields[fieldPath] = 1; // Range query - ascending index
          } else if (value.$in) {
            fields[fieldPath] = 1; // IN query
          } else {
            extractFields(value, fieldPath);
          }
        } else {
          fields[fieldPath] = 1; // Equality query
        }
      }
    };
    
    extractFields(query);
    return fields;
  }

  async generateReport() {
    console.log('Generating index performance report...\n');
    
    // Get all statistics
    const usageStats = await this.getIndexUsageStats();
    const performanceAnalysis = await this.analyzeQueryPerformance();
    const unusedIndexes = await this.getUnusedIndexes();
    const missingIndexes = await this.getMissingIndexes();
    
    // Print report
    console.log('=== INDEX USAGE STATISTICS ===\n');
    
    for (const [collection, stats] of Object.entries(usageStats)) {
      console.log(`Collection: ${collection}`);
      console.log(`  Documents: ${stats.documentCount}`);
      console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Indexes:`);
      
      for (const index of stats.indexes) {
        console.log(`    ${index.name}: ${index.operations} operations (${index.usage})`);
      }
      console.log();
    }
    
    console.log('=== QUERY PERFORMANCE ANALYSIS ===\n');
    console.log(`Total slow queries: ${performanceAnalysis.totalSlowQueries}`);
    console.log('\nSlow queries by collection:');
    
    for (const [collection, data] of Object.entries(performanceAnalysis.byCollection)) {
      console.log(`  ${collection}: ${data.count} queries, ${data.totalTime}ms total`);
    }
    
    console.log('\n=== UNUSED INDEXES ===\n');
    
    if (unusedIndexes.length === 0) {
      console.log('No unused indexes found');
    } else {
      for (const unused of unusedIndexes) {
        console.log(`${unused.collection}.${unused.index}`);
        console.log(`  ${unused.recommendation}`);
      }
    }
    
    console.log('\n=== MISSING INDEX RECOMMENDATIONS ===\n');
    
    if (missingIndexes.length === 0) {
      console.log('No missing indexes detected');
    } else {
      for (const missing of missingIndexes) {
        console.log(`Collection: ${missing.collection}`);
        console.log(`  Query: ${JSON.stringify(missing.query)}`);
        console.log(`  Occurrences: ${missing.occurrences}`);
        console.log(`  Total time: ${missing.totalTime}ms`);
        console.log(`  Suggested index: ${JSON.stringify(missing.suggestedIndex)}`);
        console.log();
      }
    }
    
    console.log('=== OPTIMIZATION RECOMMENDATIONS ===\n');
    
    for (const rec of performanceAnalysis.recommendations) {
      console.log(`[${rec.impact}] ${rec.collection}: ${rec.issue}`);
      console.log(`  ${rec.recommendation}`);
      console.log();
    }
    
    return {
      usageStats,
      performanceAnalysis,
      unusedIndexes,
      missingIndexes
    };
  }

  async startMonitoring(intervalMinutes = 5) {
    console.log(`Starting continuous index monitoring (interval: ${intervalMinutes} minutes)`);
    
    // Initial report
    await this.generateReport();
    
    // Set up interval
    setInterval(async () => {
      console.log('\n=== MONITORING UPDATE ===');
      console.log(new Date().toISOString());
      await this.generateReport();
    }, intervalMinutes * 60 * 1000);
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Monitoring disconnected');
  }
}

// CLI handler
async function main() {
  const monitor = new IndexMonitor();
  const command = process.argv[2];
  
  if (!await monitor.connect()) {
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'report':
        await monitor.generateReport();
        break;
        
      case 'monitor':
        const interval = parseInt(process.argv[3]) || 5;
        await monitor.startMonitoring(interval);
        // Keep process running
        process.stdin.resume();
        break;
        
      case 'unused':
        const unused = await monitor.getUnusedIndexes();
        console.log('Unused Indexes:', unused);
        break;
        
      case 'missing':
        const missing = await monitor.getMissingIndexes();
        console.log('Missing Indexes:', missing);
        break;
        
      case 'slow':
        const slow = await monitor.getSlowQueries();
        console.log('Slow Queries:', slow);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node utils/indexMonitor.js report    - Generate full report');
        console.log('  node utils/indexMonitor.js monitor   - Start continuous monitoring');
        console.log('  node utils/indexMonitor.js unused    - Show unused indexes');
        console.log('  node utils/indexMonitor.js missing   - Show missing indexes');
        console.log('  node utils/indexMonitor.js slow      - Show slow queries');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (command !== 'monitor') {
      await monitor.disconnect();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = IndexMonitor;