// config/indexes.js - Comprehensive MongoDB index definitions
const indexDefinitions = {
  // User model indexes
  users: [
    // Unique email for authentication
    { 
      fields: { email: 1 }, 
      options: { unique: true },
      purpose: 'Primary lookup for authentication'
    },
    // Role-based queries
    { 
      fields: { role: 1, isActive: 1 }, 
      options: {},
      purpose: 'Role-based access control queries'
    },
    // Last login tracking
    { 
      fields: { lastLogin: -1 }, 
      options: {},
      purpose: 'Sort users by last login'
    },
    // Text search on name and email
    { 
      fields: { name: 'text', email: 'text' }, 
      options: { weights: { name: 2, email: 1 } },
      purpose: 'Full-text search'
    }
  ],

  // Umzug (Move) model indexes
  umzuege: [
    // Status queries with date sorting
    { 
      fields: { status: 1, termin: -1 }, 
      options: {},
      purpose: 'Filter by status and sort by date'
    },
    // Date range queries
    { 
      fields: { termin: 1 }, 
      options: {},
      purpose: 'Date-based queries and sorting'
    },
    // User-based queries
    { 
      fields: { 'kunde.userId': 1, status: 1 }, 
      options: {},
      purpose: 'Customer moves lookup'
    },
    // Location-based queries
    { 
      fields: { 'vonAdresse.plz': 1, 'nachAdresse.plz': 1 }, 
      options: {},
      purpose: 'Location-based searches'
    },
    // Payment tracking
    { 
      fields: { 'bezahlung.status': 1, 'bezahlung.bezahltAm': -1 }, 
      options: {},
      purpose: 'Payment status queries'
    },
    // Reference number lookup
    { 
      fields: { referenzNummer: 1 }, 
      options: { unique: true, sparse: true },
      purpose: 'Unique reference number lookup'
    },
    // Text search on address and comments
    { 
      fields: { 
        'kunde.name': 'text', 
        'kunde.firma': 'text',
        'internaleBemerkungen': 'text' 
      }, 
      options: {},
      purpose: 'Full-text search across moves'
    }
  ],

  // Mitarbeiter (Employee) model indexes
  mitarbeiter: [
    // User reference
    { 
      fields: { userId: 1 }, 
      options: { unique: true },
      purpose: 'User-employee relationship'
    },
    // Name searches
    { 
      fields: { nachname: 1, vorname: 1 }, 
      options: {},
      purpose: 'Name-based sorting and searching'
    },
    // Position and status queries
    { 
      fields: { position: 1, status: 1 }, 
      options: {},
      purpose: 'Filter by position and active status'
    },
    // Skills search
    { 
      fields: { faehigkeiten: 1 }, 
      options: {},
      purpose: 'Find employees by skills'
    },
    // License search
    { 
      fields: { 'fuehrerschein.klasse': 1 }, 
      options: {},
      purpose: 'Find drivers by license class'
    },
    // Text search
    { 
      fields: { 
        vorname: 'text', 
        nachname: 'text', 
        faehigkeiten: 'text' 
      }, 
      options: {},
      purpose: 'Full-text employee search'
    }
  ],

  // Aufnahme (Assessment) model indexes
  aufnahmen: [
    // Date-based queries
    { 
      fields: { erstelltAm: -1 }, 
      options: {},
      purpose: 'Sort by creation date'
    },
    { 
      fields: { umzugsDatum: 1 }, 
      options: {},
      purpose: 'Upcoming moves'
    },
    // Status filtering
    { 
      fields: { status: 1, erstelltAm: -1 }, 
      options: {},
      purpose: 'Status-based queries with date sorting'
    },
    // Customer lookup
    { 
      fields: { 'kunde.email': 1 }, 
      options: {},
      purpose: 'Customer assessment lookup'
    },
    // Location-based queries
    { 
      fields: { 'auszugsadresse.plz': 1, 'einzugsadresse.plz': 1 }, 
      options: {},
      purpose: 'Location-based filtering'
    },
    // Text search
    { 
      fields: { 
        'kunde.name': 'text', 
        'kunde.firma': 'text',
        notizen: 'text' 
      }, 
      options: {},
      purpose: 'Full-text assessment search'
    }
  ],

  // Rechnung (Invoice) model indexes
  rechnungen: [
    // Unique invoice number
    { 
      fields: { rechnungNummer: 1 }, 
      options: { unique: true },
      purpose: 'Unique invoice number lookup'
    },
    // Customer invoices
    { 
      fields: { kunde: 1, ausstellungsdatum: -1 }, 
      options: {},
      purpose: 'Customer invoice history'
    },
    // Status and date queries
    { 
      fields: { status: 1, faelligkeitsdatum: 1 }, 
      options: {},
      purpose: 'Payment status tracking'
    },
    // Payment date tracking
    { 
      fields: { bezahltAm: -1 }, 
      options: { sparse: true },
      purpose: 'Payment history'
    },
    // Overdue invoices
    { 
      fields: { faelligkeitsdatum: 1, status: 1 }, 
      options: { 
        partialFilterExpression: { 
          status: { $in: ['Gesendet', 'Teilweise bezahlt'] } 
        } 
      },
      purpose: 'Find overdue invoices'
    }
  ],

  // Angebot (Quote) model indexes
  angebote: [
    // Unique quote number
    { 
      fields: { angebotNummer: 1 }, 
      options: { unique: true },
      purpose: 'Unique quote number lookup'
    },
    // Customer quotes
    { 
      fields: { kunde: 1, erstelltAm: -1 }, 
      options: {},
      purpose: 'Customer quote history'
    },
    // Status and validity
    { 
      fields: { status: 1, gueltigBis: 1 }, 
      options: {},
      purpose: 'Active/expired quotes'
    },
    // Move association
    { 
      fields: { umzug: 1 }, 
      options: { sparse: true },
      purpose: 'Find quotes for moves'
    }
  ],

  // Benachrichtigung (Notification) model indexes
  benachrichtigungen: [
    // User notifications
    { 
      fields: { empfaenger: 1, gelesen: 1, createdAt: -1 }, 
      options: {},
      purpose: 'User unread notifications'
    },
    // Type and date queries
    { 
      fields: { typ: 1, createdAt: -1 }, 
      options: {},
      purpose: 'Filter by notification type'
    },
    // Reference lookups
    { 
      fields: { 'bezug.typ': 1, 'bezug.id': 1 }, 
      options: {},
      purpose: 'Find notifications by reference'
    },
    // Auto-cleanup for old notifications
    { 
      fields: { createdAt: 1 }, 
      options: { 
        expireAfterSeconds: 2592000 // 30 days
      },
      purpose: 'Auto-delete old notifications'
    }
  ],

  // Zeiterfassung (Time tracking) model indexes
  zeiterfassungen: [
    // Employee time entries
    { 
      fields: { mitarbeiter: 1, datum: -1 }, 
      options: {},
      purpose: 'Employee time history'
    },
    // Project time tracking
    { 
      fields: { projekt: 1, datum: -1 }, 
      options: {},
      purpose: 'Project time tracking'
    },
    // Date range queries
    { 
      fields: { datum: 1 }, 
      options: {},
      purpose: 'Date-based time queries'
    },
    // Status tracking
    { 
      fields: { status: 1, datum: -1 }, 
      options: {},
      purpose: 'Pending/approved time entries'
    }
  ],

  // Token model indexes (for authentication)
  tokens: [
    // User tokens
    { 
      fields: { userId: 1, type: 1 }, 
      options: {},
      purpose: 'User token lookup'
    },
    // Token value lookup
    { 
      fields: { token: 1 }, 
      options: { unique: true },
      purpose: 'Token validation'
    },
    // Auto-cleanup for expired tokens
    { 
      fields: { expiresAt: 1 }, 
      options: { 
        expireAfterSeconds: 0 
      },
      purpose: 'Auto-delete expired tokens'
    },
    // Device tracking
    { 
      fields: { deviceId: 1, userId: 1 }, 
      options: {},
      purpose: 'Device-based token management'
    }
  ],

  // File/Upload model indexes
  uploads: [
    // Project files
    { 
      fields: { project: 1, uploadDate: -1 }, 
      options: {},
      purpose: 'Project file listing'
    },
    // File type queries
    { 
      fields: { mimeType: 1, size: 1 }, 
      options: {},
      purpose: 'File type and size filtering'
    },
    // Tag-based search
    { 
      fields: { tags: 1 }, 
      options: {},
      purpose: 'Find files by tags'
    },
    // Text search on filename and description
    { 
      fields: { filename: 'text', description: 'text' }, 
      options: {},
      purpose: 'File search'
    }
  ]
};

// Helper function to get indexes for a specific collection
const getIndexesForCollection = (collectionName) => {
  return indexDefinitions[collectionName] || [];
};

// Helper function to create index commands
const createIndexCommands = (collectionName) => {
  const indexes = getIndexesForCollection(collectionName);
  return indexes.map(index => ({
    collection: collectionName,
    fields: index.fields,
    options: index.options,
    purpose: index.purpose
  }));
};

// Export index definitions and helpers
module.exports = {
  indexDefinitions,
  getIndexesForCollection,
  createIndexCommands,
  
  // Convenience methods for each collection
  getUserIndexes: () => getIndexesForCollection('users'),
  getUmzugIndexes: () => getIndexesForCollection('umzuege'),
  getMitarbeiterIndexes: () => getIndexesForCollection('mitarbeiter'),
  getAufnahmeIndexes: () => getIndexesForCollection('aufnahmen'),
  getRechnungIndexes: () => getIndexesForCollection('rechnungen'),
  getAngebotIndexes: () => getIndexesForCollection('angebote'),
  getBenachrichtigungIndexes: () => getIndexesForCollection('benachrichtigungen'),
  getZeiterfassungIndexes: () => getIndexesForCollection('zeiterfassungen'),
  getTokenIndexes: () => getIndexesForCollection('tokens'),
  getUploadIndexes: () => getIndexesForCollection('uploads')
};