// tests/index-tests.js - Automated Index Testing

const mongoose = require('mongoose');
const config = require('../config/database');
const IndexManager = require('../models/indexes');

// Import all models
require('../models/user');
require('../models/umzug.model');
require('../models/mitarbeiter.model');
require('../models/aufnahme.model');
require('../models/angebot.model');
require('../models/rechnung.model');
require('../models/projektkosten.model');
require('../models/benachrichtigung.model');
require('../models/zeiterfassung.model');
require('../models/token.model');

/**
 * Test suite for verifying MongoDB indexes
 */
class IndexTests {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * Connect to database
   */
  async connect() {
    try {
      await mongoose.connect(config.MONGODB_URI, config.options);
      console.log('Connected to MongoDB for testing');
      return true;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      return false;
    }
  }

  /**
   * Test if all expected indexes exist
   */
  async testIndexExistence() {
    console.log('\n--- Testing Index Existence ---');
    
    const expectedIndexes = {
      users: [
        'email_unique',
        'role_index',
        'active_users',
        'last_login_desc',
        'reset_token',
        'email_active_compound',
        'user_text_search'
      ],
      umzugs: [
        'kundennummer_index',
        'status_index',
        'start_date_asc',
        'end_date_asc',
        'status_date_range',
        'aufnahme_ref',
        'mitarbeiter_refs',
        'payment_status',
        'umzug_text_search'
      ],
      mitarbeiters: [
        'user_ref_unique',
        'name_sort',
        'active_status',
        'skills_index',
        'license_index',
        'mitarbeiter_text_search'
      ],
      aufnahmes: [
        'date_desc',
        'status_index',
        'customer_name',
        'customer_email',
        'move_type',
        'recorder_ref',
        'employee_ref',
        'aufnahme_text_search'
      ],
      angebots: [
        'offer_number_unique',
        'customer_ref',
        'move_ref',
        'offer_status',
        'created_date_desc'
      ],
      rechnungs: [
        'invoice_number_unique',
        'customer_ref',
        'move_ref',
        'invoice_status',
        'overdue_check'
      ],
      projektkostens: [
        'move_ref',
        'cost_category',
        'cost_date_desc',
        'payment_status'
      ],
      benachrichtigungs: [
        'recipient_ref',
        'user_unread',
        'notification_type',
        'user_notifications_recent'
      ],
      zeiterfassungs: [
        'employee_ref',
        'project_ref',
        'date_desc',
        'employee_date_compound'
      ],
      tokens: [
        'token_unique',
        'user_tokens',
        'token_ttl',
        'user_token_status'
      ]
    };

    for (const [collection, expectedNames] of Object.entries(expectedIndexes)) {
      try {
        const db = mongoose.connection.db;
        const indexes = await db.collection(collection).indexes();
        const indexNames = indexes.map(idx => idx.name);
        
        for (const expectedName of expectedNames) {
          if (indexNames.includes(expectedName)) {
            this.results.passed.push(`✓ ${collection}.${expectedName} exists`);
          } else {
            this.results.failed.push(`✗ ${collection}.${expectedName} missing`);
          }
        }
      } catch (error) {
        this.results.failed.push(`✗ Error checking ${collection}: ${error.message}`);
      }
    }
  }

  /**
   * Test query performance with indexes
   */
  async testQueryPerformance() {
    console.log('\n--- Testing Query Performance ---');
    
    const queries = [
      {
        model: 'User',
        query: { email: 'test@example.com' },
        expectedIndex: 'email_unique'
      },
      {
        model: 'Umzug',
        query: { status: 'geplant' },
        expectedIndex: 'status_index'
      },
      {
        model: 'Mitarbeiter',
        query: { isActive: true },
        sort: { nachname: 1 },
        expectedIndex: 'active_status'
      },
      {
        model: 'Aufnahme',
        query: { status: 'abgeschlossen' },
        sort: { datum: -1 },
        expectedIndex: 'status_date_compound'
      }
    ];

    for (const test of queries) {
      try {
        const Model = mongoose.model(test.model);
        let query = Model.find(test.query);
        
        if (test.sort) {
          query = query.sort(test.sort);
        }
        
        const explain = await query.explain('executionStats');
        const indexUsed = explain.executionStats.executionStages.indexName;
        const docsExamined = explain.executionStats.totalDocsExamined;
        const docsReturned = explain.executionStats.nReturned;
        const executionTime = explain.executionStats.executionTimeMillis;
        
        if (indexUsed) {
          this.results.passed.push(
            `✓ ${test.model} query uses index: ${indexUsed} (${executionTime}ms)`
          );
        } else {
          this.results.failed.push(
            `✗ ${test.model} query doesn't use index (${executionTime}ms)`
          );
        }
        
        // Check efficiency
        if (docsExamined > 0 && docsReturned > 0) {
          const efficiency = docsReturned / docsExamined;
          if (efficiency < 0.5) {
            this.results.warnings.push(
              `⚠ ${test.model} query inefficient: examined ${docsExamined} to return ${docsReturned}`
            );
          }
        }
      } catch (error) {
        this.results.failed.push(`✗ Error testing ${test.model}: ${error.message}`);
      }
    }
  }

  /**
   * Test index uniqueness constraints
   */
  async testUniqueConstraints() {
    console.log('\n--- Testing Unique Constraints ---');
    
    const uniqueTests = [
      {
        model: 'User',
        field: 'email',
        value: 'unique@test.com'
      },
      {
        model: 'Angebot',
        field: 'angebotNummer',
        value: 'ANG-TEST-001'
      },
      {
        model: 'Rechnung',
        field: 'rechnungNummer',
        value: 'RE-TEST-001'
      }
    ];

    for (const test of uniqueTests) {
      try {
        const Model = mongoose.model(test.model);
        
        // Try to create duplicate documents
        const doc1 = new Model({ [test.field]: test.value, ...this.getRequiredFields(test.model) });
        await doc1.save();
        
        const doc2 = new Model({ [test.field]: test.value, ...this.getRequiredFields(test.model) });
        
        try {
          await doc2.save();
          this.results.failed.push(`✗ ${test.model}.${test.field} allows duplicates`);
        } catch (dupError) {
          if (dupError.code === 11000) {
            this.results.passed.push(`✓ ${test.model}.${test.field} enforces uniqueness`);
          } else {
            this.results.failed.push(`✗ ${test.model}.${test.field} unexpected error: ${dupError.message}`);
          }
        }
        
        // Cleanup
        await Model.deleteOne({ [test.field]: test.value });
      } catch (error) {
        this.results.failed.push(`✗ Error testing ${test.model}.${test.field}: ${error.message}`);
      }
    }
  }

  /**
   * Test TTL indexes
   */
  async testTTLIndexes() {
    console.log('\n--- Testing TTL Indexes ---');
    
    const ttlTests = [
      {
        model: 'User',
        field: 'resetPasswordExpire',
        collection: 'users'
      },
      {
        model: 'Token',
        field: 'expiresAt',
        collection: 'tokens'
      }
    ];

    for (const test of ttlTests) {
      try {
        const db = mongoose.connection.db;
        const indexes = await db.collection(test.collection).indexes();
        
        const ttlIndex = indexes.find(idx => 
          Object.keys(idx.key).includes(test.field) && 
          idx.expireAfterSeconds !== undefined
        );
        
        if (ttlIndex) {
          this.results.passed.push(
            `✓ ${test.model}.${test.field} has TTL index (${ttlIndex.expireAfterSeconds}s)`
          );
        } else {
          this.results.failed.push(`✗ ${test.model}.${test.field} missing TTL index`);
        }
      } catch (error) {
        this.results.failed.push(`✗ Error testing ${test.model}.${test.field}: ${error.message}`);
      }
    }
  }

  /**
   * Test text search indexes
   */
  async testTextSearchIndexes() {
    console.log('\n--- Testing Text Search Indexes ---');
    
    const textTests = [
      {
        model: 'User',
        searchText: 'admin',
        expectedField: 'name'
      },
      {
        model: 'Umzug',
        searchText: 'umzug',
        expectedField: 'auftraggeber.name'
      },
      {
        model: 'Aufnahme',
        searchText: 'besonderheit',
        expectedField: 'besonderheiten'
      }
    ];

    for (const test of textTests) {
      try {
        const Model = mongoose.model(test.model);
        const results = await Model.find(
          { $text: { $search: test.searchText } }
        ).limit(5);
        
        this.results.passed.push(
          `✓ ${test.model} text search works (found ${results.length} results)`
        );
      } catch (error) {
        if (error.message.includes('text index required')) {
          this.results.failed.push(`✗ ${test.model} missing text index`);
        } else {
          this.results.failed.push(`✗ Error testing ${test.model} text search: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get required fields for model testing
   */
  getRequiredFields(modelName) {
    const requiredFields = {
      User: {
        name: 'Test User',
        password: 'password123',
        role: 'mitarbeiter'
      },
      Angebot: {
        kunde: new mongoose.Types.ObjectId(),
        gueltigBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gesamtbetrag: 1000,
        erstelltVon: new mongoose.Types.ObjectId()
      },
      Rechnung: {
        kunde: new mongoose.Types.ObjectId(),
        ausstellungsdatum: new Date(),
        faelligkeitsdatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gesamtbetrag: 1000,
        erstelltVon: new mongoose.Types.ObjectId()
      }
    };
    
    return requiredFields[modelName] || {};
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('Starting Index Tests...\n');
    
    await this.testIndexExistence();
    await this.testQueryPerformance();
    await this.testUniqueConstraints();
    await this.testTTLIndexes();
    await this.testTextSearchIndexes();
    
    this.displayResults();
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('\n=== Index Test Results ===\n');
    
    console.log(`Passed: ${this.results.passed.length}`);
    this.results.passed.forEach(result => console.log(result));
    
    if (this.results.warnings.length > 0) {
      console.log(`\nWarnings: ${this.results.warnings.length}`);
      this.results.warnings.forEach(warning => console.log(warning));
    }
    
    if (this.results.failed.length > 0) {
      console.log(`\nFailed: ${this.results.failed.length}`);
      this.results.failed.forEach(failure => console.log(failure));
    }
    
    const totalTests = this.results.passed.length + this.results.failed.length;
    const successRate = ((this.results.passed.length / totalTests) * 100).toFixed(2);
    
    console.log(`\nSuccess Rate: ${successRate}%`);
    
    return this.results.failed.length === 0;
  }
}

// CLI handling
if (require.main === module) {
  const tester = new IndexTests();
  
  (async () => {
    const connected = await tester.connect();
    if (!connected) {
      process.exit(1);
    }
    
    const success = await tester.runAllTests();
    await mongoose.connection.close();
    
    process.exit(success ? 0 : 1);
  })();
}

module.exports = IndexTests;