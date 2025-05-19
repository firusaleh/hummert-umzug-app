// migrations/create-indexes.js - Database index migration script
const mongoose = require('mongoose');
const { indexDefinitions } = require('../config/indexes');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Index creation class
class IndexMigration {
  constructor() {
    this.results = {
      created: [],
      existing: [],
      failed: [],
      dropped: []
    };
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      await mongoose.connect(mongoUri);
      console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Failed to connect to MongoDB:${colors.reset}`, error.message);
      return false;
    }
  }

  async createIndexesForCollection(collectionName, indexes) {
    console.log(`\n${colors.cyan}Processing collection: ${collectionName}${colors.reset}`);
    
    try {
      const collection = mongoose.connection.collection(collectionName);
      
      // Get existing indexes
      const existingIndexes = await collection.indexes();
      const existingIndexNames = existingIndexes.map(idx => idx.name);
      
      for (const indexDef of indexes) {
        const indexName = this.generateIndexName(indexDef.fields);
        
        try {
          // Check if index already exists
          if (this.indexExists(existingIndexes, indexDef.fields)) {
            console.log(`${colors.yellow}  ⚬ Index already exists: ${indexName}${colors.reset}`);
            this.results.existing.push({ collection: collectionName, index: indexName });
            continue;
          }
          
          // Create the index
          const options = { ...indexDef.options, background: true };
          await collection.createIndex(indexDef.fields, options);
          
          console.log(`${colors.green}  ✓ Created index: ${indexName}${colors.reset}`);
          console.log(`    Purpose: ${indexDef.purpose}`);
          this.results.created.push({ 
            collection: collectionName, 
            index: indexName,
            purpose: indexDef.purpose 
          });
          
        } catch (error) {
          console.error(`${colors.red}  ✗ Failed to create index: ${indexName}${colors.reset}`);
          console.error(`    Error: ${error.message}`);
          this.results.failed.push({ 
            collection: collectionName, 
            index: indexName,
            error: error.message 
          });
        }
      }
      
    } catch (error) {
      console.error(`${colors.red}✗ Failed to process collection ${collectionName}:${colors.reset}`, error.message);
    }
  }

  indexExists(existingIndexes, fields) {
    // Convert fields object to sorted string for comparison
    const newFieldsStr = JSON.stringify(this.sortObject(fields));
    
    return existingIndexes.some(existing => {
      if (!existing.key) return false;
      const existingFieldsStr = JSON.stringify(this.sortObject(existing.key));
      return existingFieldsStr === newFieldsStr;
    });
  }

  sortObject(obj) {
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  generateIndexName(fields) {
    return Object.entries(fields)
      .map(([key, value]) => `${key}_${value}`)
      .join('_');
  }

  async createAllIndexes() {
    console.log(`${colors.blue}Starting index creation...${colors.reset}`);
    
    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      await this.createIndexesForCollection(collectionName, indexes);
    }
    
    this.printResults();
  }

  async dropIndexesForCollection(collectionName, keepRequired = true) {
    console.log(`\n${colors.yellow}Dropping indexes for collection: ${collectionName}${colors.reset}`);
    
    try {
      const collection = mongoose.connection.collection(collectionName);
      const indexes = await collection.indexes();
      
      for (const index of indexes) {
        // Skip the required _id index
        if (index.name === '_id_') continue;
        
        // Skip unique indexes if keepRequired is true
        if (keepRequired && index.unique) {
          console.log(`${colors.cyan}  ⚬ Keeping unique index: ${index.name}${colors.reset}`);
          continue;
        }
        
        try {
          await collection.dropIndex(index.name);
          console.log(`${colors.green}  ✓ Dropped index: ${index.name}${colors.reset}`);
          this.results.dropped.push({ collection: collectionName, index: index.name });
        } catch (error) {
          console.error(`${colors.red}  ✗ Failed to drop index: ${index.name}${colors.reset}`);
          console.error(`    Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}✗ Failed to drop indexes for ${collectionName}:${colors.reset}`, error.message);
    }
  }

  async dropAllIndexes(keepRequired = true) {
    console.log(`${colors.yellow}Dropping all indexes...${colors.reset}`);
    
    const collections = Object.keys(indexDefinitions);
    for (const collectionName of collections) {
      await this.dropIndexesForCollection(collectionName, keepRequired);
    }
    
    this.printResults();
  }

  async getIndexStats() {
    console.log(`${colors.blue}Gathering index statistics...${colors.reset}\n`);
    
    const stats = {};
    
    for (const collectionName of Object.keys(indexDefinitions)) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        const indexes = await collection.indexes();
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        stats[collectionName] = {
          count: indexes.length,
          indexes: indexes.map(idx => ({
            name: idx.name,
            fields: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false,
            usage: indexStats.find(stat => stat.name === idx.name)
          }))
        };
      } catch (error) {
        console.error(`${colors.red}Failed to get stats for ${collectionName}:${colors.reset}`, error.message);
      }
    }
    
    this.printIndexStats(stats);
    return stats;
  }

  printIndexStats(stats) {
    console.log(`${colors.cyan}=== Index Statistics ===${colors.reset}\n`);
    
    for (const [collection, data] of Object.entries(stats)) {
      console.log(`${colors.blue}${collection}:${colors.reset} ${data.count} indexes`);
      
      for (const index of data.indexes) {
        console.log(`  ${index.name}:`);
        console.log(`    Fields: ${JSON.stringify(index.fields)}`);
        console.log(`    Unique: ${index.unique}, Sparse: ${index.sparse}`);
        
        if (index.usage) {
          console.log(`    Usage: ${index.usage.accesses?.ops || 0} operations`);
        }
      }
      console.log();
    }
  }

  printResults() {
    console.log(`\n${colors.cyan}=== Migration Results ===${colors.reset}`);
    
    if (this.results.created.length > 0) {
      console.log(`\n${colors.green}Created Indexes (${this.results.created.length}):${colors.reset}`);
      this.results.created.forEach(item => {
        console.log(`  ✓ ${item.collection}.${item.index}`);
        console.log(`    Purpose: ${item.purpose}`);
      });
    }
    
    if (this.results.existing.length > 0) {
      console.log(`\n${colors.yellow}Existing Indexes (${this.results.existing.length}):${colors.reset}`);
      this.results.existing.forEach(item => {
        console.log(`  ⚬ ${item.collection}.${item.index}`);
      });
    }
    
    if (this.results.failed.length > 0) {
      console.log(`\n${colors.red}Failed Indexes (${this.results.failed.length}):${colors.reset}`);
      this.results.failed.forEach(item => {
        console.log(`  ✗ ${item.collection}.${item.index}`);
        console.log(`    Error: ${item.error}`);
      });
    }
    
    if (this.results.dropped.length > 0) {
      console.log(`\n${colors.yellow}Dropped Indexes (${this.results.dropped.length}):${colors.reset}`);
      this.results.dropped.forEach(item => {
        console.log(`  ✓ ${item.collection}.${item.index}`);
      });
    }
    
    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    console.log(`  Created: ${this.results.created.length}`);
    console.log(`  Existing: ${this.results.existing.length}`);
    console.log(`  Failed: ${this.results.failed.length}`);
    console.log(`  Dropped: ${this.results.dropped.length}`);
    console.log();
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log(`${colors.green}✓ Disconnected from MongoDB${colors.reset}`);
  }
}

// CLI handler
async function main() {
  const migration = new IndexMigration();
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!await migration.connect()) {
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'up':
      case 'create':
        await migration.createAllIndexes();
        break;
        
      case 'down':
      case 'drop':
        const keepRequired = args[1] !== '--force';
        await migration.dropAllIndexes(keepRequired);
        break;
        
      case 'stats':
      case 'status':
        await migration.getIndexStats();
        break;
        
      case 'reset':
        await migration.dropAllIndexes(true);
        await migration.createAllIndexes();
        break;
        
      default:
        console.log(`${colors.cyan}Usage:${colors.reset}`);
        console.log('  node migrations/create-indexes.js <command> [options]');
        console.log('\nCommands:');
        console.log('  up, create    - Create all indexes');
        console.log('  down, drop    - Drop all non-essential indexes');
        console.log('  down --force  - Drop all indexes including unique ones');
        console.log('  stats, status - Show index statistics');
        console.log('  reset         - Drop and recreate all indexes');
    }
  } catch (error) {
    console.error(`${colors.red}Migration failed:${colors.reset}`, error.message);
    process.exit(1);
  } finally {
    await migration.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = IndexMigration;