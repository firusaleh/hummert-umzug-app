// tests/index-performance.test.js - Index performance testing
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
require('dotenv').config();

// Import models
const User = require('../models/user.indexed');
const Umzug = require('../models/umzug.indexed');

class IndexPerformanceTest {
  constructor() {
    this.results = {
      withIndex: {},
      withoutIndex: {},
      improvements: {}
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
      console.log('Connected to MongoDB for testing');
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  async runQueryTest(collection, query, description) {
    const start = performance.now();
    const result = await collection.find(query).explain('executionStats');
    const end = performance.now();
    
    const stats = {
      executionTime: end - start,
      docsExamined: result.executionStats.totalDocsExamined,
      docsReturned: result.executionStats.nReturned,
      indexUsed: result.executionStats.executionStages.stage !== 'COLLSCAN',
      indexName: result.executionStats.executionStages.indexName || 'none',
      millis: result.executionStats.executionTimeMillis
    };
    
    return stats;
  }

  async testUserQueries() {
    console.log('\nTesting User collection queries...');
    
    const tests = [
      {
        name: 'Find by email',
        query: { email: 'test@example.com' },
        expectedIndex: 'email_1'
      },
      {
        name: 'Find admin users',
        query: { role: 'admin', isActive: true },
        expectedIndex: 'role_1_isActive_1'
      },
      {
        name: 'Recent logins',
        query: {},
        sort: { lastLogin: -1 },
        expectedIndex: 'lastLogin_-1'
      },
      {
        name: 'Text search',
        query: { $text: { $search: 'John' } },
        expectedIndex: 'name_text_email_text'
      }
    ];
    
    for (const test of tests) {
      try {
        const stats = await this.runQueryTest(User, test.query, test.name);
        this.results.withIndex[test.name] = stats;
        
        console.log(`✓ ${test.name}`);
        console.log(`  Time: ${stats.millis}ms`);
        console.log(`  Index: ${stats.indexName}`);
        console.log(`  Docs examined: ${stats.docsExamined}`);
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
      }
    }
  }

  async testUmzugQueries() {
    console.log('\nTesting Umzug collection queries...');
    
    const tests = [
      {
        name: 'Active moves by date',
        query: { status: 'Bestätigt' },
        sort: { termin: -1 },
        expectedIndex: 'status_1_termin_-1'
      },
      {
        name: 'Customer moves',
        query: { 'kunde.email': 'customer@example.com', status: 'Abgeschlossen' },
        expectedIndex: 'kunde.email_1_status_1'
      },
      {
        name: 'Location search',
        query: { 'vonAdresse.plz': '12345' },
        expectedIndex: 'vonAdresse.plz_1_nachAdresse.plz_1'
      },
      {
        name: 'Payment tracking',
        query: { 'bezahlung.status': 'Offen' },
        sort: { 'bezahlung.bezahltAm': -1 },
        expectedIndex: 'bezahlung.status_1_bezahlung.bezahltAm_-1'
      },
      {
        name: 'Reference lookup',
        query: { referenzNummer: 'UMZ-202401-0001' },
        expectedIndex: 'referenzNummer_1'
      }
    ];
    
    for (const test of tests) {
      try {
        const stats = await this.runQueryTest(Umzug, test.query, test.name);
        this.results.withIndex[test.name] = stats;
        
        console.log(`✓ ${test.name}`);
        console.log(`  Time: ${stats.millis}ms`);
        console.log(`  Index: ${stats.indexName}`);
        console.log(`  Docs examined: ${stats.docsExamined}`);
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
      }
    }
  }

  async generateTestData(count = 1000) {
    console.log(`\nGenerating ${count} test documents...`);
    
    // Generate users
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: 'hashedpassword',
        role: i % 10 === 0 ? 'admin' : 'mitarbeiter',
        isActive: i % 20 !== 0,
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    await User.insertMany(users, { ordered: false }).catch(() => {});
    
    // Generate moves
    const moves = [];
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 60) - 30);
      
      moves.push({
        status: ['Anfrage', 'Bestätigt', 'In Bearbeitung', 'Abgeschlossen'][i % 4],
        termin: date,
        kunde: {
          name: `Kunde ${i}`,
          telefon: `+49123456${i}`,
          email: `kunde${i}@example.com`,
          firma: i % 3 === 0 ? `Firma ${i}` : undefined
        },
        vonAdresse: {
          strasse: `Straße ${i}`,
          hausnummer: `${i}`,
          plz: `${10000 + (i % 90000)}`,
          ort: `Stadt ${i % 50}`
        },
        nachAdresse: {
          strasse: `Neue Straße ${i}`,
          hausnummer: `${i + 1}`,
          plz: `${20000 + (i % 80000)}`,
          ort: `Stadt ${(i + 10) % 50}`
        },
        bezahlung: {
          status: ['Offen', 'Teilweise bezahlt', 'Bezahlt'][i % 3],
          bezahltAm: i % 3 === 2 ? date : undefined
        }
      });
    }
    
    await Umzug.insertMany(moves, { ordered: false }).catch(() => {});
    console.log('Test data generated');
  }

  async comparePerformance() {
    console.log('\n=== Performance Comparison ===\n');
    
    for (const [queryName, stats] of Object.entries(this.results.withIndex)) {
      const improvement = this.calculateImprovement(stats);
      this.results.improvements[queryName] = improvement;
      
      console.log(`${queryName}:`);
      console.log(`  Execution time: ${stats.millis}ms`);
      console.log(`  Index used: ${stats.indexUsed ? 'Yes' : 'No'}`);
      console.log(`  Documents examined: ${stats.docsExamined}`);
      console.log(`  Efficiency: ${improvement.efficiency}%`);
      console.log();
    }
  }

  calculateImprovement(stats) {
    const efficiency = stats.docsReturned > 0 
      ? Math.round((stats.docsReturned / stats.docsExamined) * 100)
      : 0;
    
    return {
      efficiency,
      indexUsed: stats.indexUsed,
      scanType: stats.indexUsed ? 'Index Scan' : 'Collection Scan'
    };
  }

  async cleanup() {
    console.log('\nCleaning up test data...');
    // Only clean up test data, not production data
    await User.deleteMany({ email: { $regex: /^user\d+@example\.com$/ } });
    await Umzug.deleteMany({ 'kunde.email': { $regex: /^kunde\d+@example\.com$/ } });
  }

  async runAllTests() {
    await this.generateTestData(1000);
    await this.testUserQueries();
    await this.testUmzugQueries();
    await this.comparePerformance();
    
    // Print summary
    console.log('=== Test Summary ===\n');
    const totalTests = Object.keys(this.results.withIndex).length;
    const indexedQueries = Object.values(this.results.withIndex).filter(s => s.indexUsed).length;
    
    console.log(`Total queries tested: ${totalTests}`);
    console.log(`Queries using indexes: ${indexedQueries}`);
    console.log(`Index coverage: ${Math.round((indexedQueries / totalTests) * 100)}%`);
    
    // Performance metrics
    const avgTime = Object.values(this.results.withIndex)
      .reduce((sum, s) => sum + s.millis, 0) / totalTests;
    
    console.log(`Average query time: ${avgTime.toFixed(2)}ms`);
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// CLI interface
async function main() {
  const tester = new IndexPerformanceTest();
  const command = process.argv[2];
  
  if (!await tester.connect()) {
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'test':
        await tester.runAllTests();
        break;
        
      case 'generate':
        const count = parseInt(process.argv[3]) || 1000;
        await tester.generateTestData(count);
        break;
        
      case 'cleanup':
        await tester.cleanup();
        break;
        
      default:
        console.log('Usage:');
        console.log('  node tests/index-performance.test.js test     - Run all tests');
        console.log('  node tests/index-performance.test.js generate - Generate test data');
        console.log('  node tests/index-performance.test.js cleanup  - Clean up test data');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await tester.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = IndexPerformanceTest;