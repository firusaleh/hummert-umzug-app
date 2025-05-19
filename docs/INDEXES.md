# MongoDB Indexes Documentation - LagerLogix

## Overview

This document provides comprehensive documentation for all MongoDB indexes in the LagerLogix application. Indexes are crucial for query performance and data integrity.

## Index Categories

### 1. Primary Key Indexes
- Automatically created by MongoDB on `_id` fields
- Unique and cannot be dropped

### 2. Unique Indexes
- Enforce uniqueness constraints
- Prevent duplicate data
- Examples: `email`, `angebotNummer`, `rechnungNummer`

### 3. Compound Indexes
- Optimize queries with multiple fields
- Support sorting on multiple fields
- Order matters for query optimization

### 4. Text Indexes
- Enable full-text search
- Support natural language queries
- One text index per collection

### 5. TTL Indexes
- Automatically expire documents
- Used for temporary data
- Examples: password reset tokens, expired tokens

### 6. Sparse Indexes
- Only index documents where field exists
- Save space for optional fields
- Examples: `resetPasswordToken`, `aufnahmeId`

## Model-Specific Indexes

### User Model

```javascript
// Unique email index
{ email: 1 } - unique

// Role-based queries
{ role: 1 }

// Active user filtering
{ isActive: 1 }

// Login tracking
{ lastLogin: -1 }

// Password reset (sparse)
{ resetPasswordToken: 1 } - sparse

// Password reset TTL
{ resetPasswordExpire: 1 } - TTL

// Compound for login
{ email: 1, isActive: 1 }

// Text search
{ name: 'text', email: 'text' }
```

**Query Patterns:**
- User login: `find({ email, isActive: true })`
- Role filtering: `find({ role: 'admin' })`
- Active users: `find({ isActive: true })`
- Password reset: `find({ resetPasswordToken })`

### Umzug Model

```javascript
// Customer number (sparse)
{ kundennummer: 1 } - sparse

// Status filtering
{ status: 1 }

// Date range queries
{ startDatum: 1 }
{ endDatum: 1 }

// Compound status + dates
{ status: 1, startDatum: 1, endDatum: 1 }

// Foreign keys
{ aufnahmeId: 1 } - sparse
{ 'mitarbeiter.mitarbeiterId': 1 }

// Payment tracking
{ 'preis.bezahlt': 1 }

// Location queries
{ 'auszugsadresse.plz': 1 }
{ 'einzugsadresse.plz': 1 }

// Task management
{ 'tasks.erledigt': 1 }
{ 'tasks.faelligkeit': 1 }

// Text search
{ 'auftraggeber.name': 'text', 'notizen.text': 'text' }
```

**Query Patterns:**
- Date range: `find({ startDatum: { $gte }, endDatum: { $lte } })`
- Status filter: `find({ status: 'geplant' })`
- Location search: `find({ 'auszugsadresse.plz': '12345' })`
- Unpaid moves: `find({ 'preis.bezahlt': false })`

### Mitarbeiter Model

```javascript
// User reference (unique)
{ userId: 1 } - unique

// Name sorting
{ nachname: 1, vorname: 1 }

// Active status
{ isActive: 1 }

// Skills and licenses
{ faehigkeiten: 1 }
{ fuehrerscheinklassen: 1 }

// Work time tracking
{ 'arbeitszeiten.datum': 1 }

// Location
{ 'adresse.plz': 1 }

// Text search
{ vorname: 'text', nachname: 'text', notizen: 'text' }
```

**Query Patterns:**
- Active employees: `find({ isActive: true }).sort({ nachname: 1 })`
- Skill search: `find({ faehigkeiten: 'Möbelmontage' })`
- License search: `find({ fuehrerscheinklassen: 'C1' })`
- Work time lookup: `find({ 'arbeitszeiten.datum': date })`

### Aufnahme Model

```javascript
// Date sorting
{ datum: -1 }

// Status filtering
{ status: 1 }

// Customer lookups
{ kundenName: 1 }
{ email: 1 } - sparse

// Type filtering
{ umzugstyp: 1 }

// Foreign keys
{ aufnehmer: 1 }
{ mitarbeiterId: 1 } - sparse

// Volume queries
{ gesamtvolumen: 1 }

// Rating queries
{ bewertung: -1 }

// Location
{ 'auszugsadresse.plz': 1 }
{ 'einzugsadresse.plz': 1 }

// Price range
{ 'angebotspreis.brutto': 1 }

// Compound status + date
{ status: 1, datum: -1 }

// Text search
{ kundenName: 'text', besonderheiten: 'text', notizen: 'text' }
```

**Query Patterns:**
- Recent recordings: `find().sort({ datum: -1 })`
- Status filter: `find({ status: 'abgeschlossen' })`
- Customer search: `find({ kundenName: /smith/i })`
- Volume range: `find({ gesamtvolumen: { $gte: 50 } })`

### Financial Models (Angebot, Rechnung, Projektkosten)

#### Angebot (Offer)

```javascript
// Unique offer number
{ angebotNummer: 1 } - unique

// Foreign keys
{ kunde: 1 }
{ umzug: 1 } - sparse

// Status and dates
{ status: 1 }
{ erstelltAm: -1 }
{ gueltigBis: 1 }

// Created by
{ erstelltVon: 1 }
```

#### Rechnung (Invoice)

```javascript
// Unique invoice number
{ rechnungNummer: 1 } - unique

// Foreign keys
{ kunde: 1 }
{ umzug: 1 } - sparse
{ angebot: 1 } - sparse

// Status and dates
{ status: 1 }
{ ausstellungsdatum: -1 }
{ faelligkeitsdatum: 1 }
{ bezahltAm: 1 } - sparse

// Overdue check
{ status: 1, faelligkeitsdatum: 1 }
```

#### Projektkosten (Project Costs)

```javascript
// Foreign key
{ umzug: 1 }

// Category and date
{ kategorie: 1 }
{ datum: -1 }

// Payment status
{ bezahlstatus: 1 }

// Created by
{ erstelltVon: 1 }

// Category reports
{ kategorie: 1, datum: -1 }
```

**Financial Query Patterns:**
- Open invoices: `find({ status: 'Gesendet' })`
- Overdue invoices: `find({ status: 'Gesendet', faelligkeitsdatum: { $lt: now } })`
- Category costs: `find({ kategorie: 'Personal' }).sort({ datum: -1 })`
- Customer invoices: `find({ kunde: customerId })`

### Benachrichtigung Model

```javascript
// User notifications
{ empfaenger: 1 }

// Unread notifications
{ empfaenger: 1, gelesen: 1 }

// Type filtering
{ typ: 1 }

// Reference tracking
{ 'bezug.typ': 1, 'bezug.id': 1 }

// Date sorting
{ createdAt: -1 }

// User notification list
{ empfaenger: 1, createdAt: -1 }

// Text search
{ titel: 'text', inhalt: 'text' }
```

**Query Patterns:**
- User notifications: `find({ empfaenger: userId }).sort({ createdAt: -1 })`
- Unread count: `countDocuments({ empfaenger: userId, gelesen: false })`
- Type filter: `find({ typ: 'warnung' })`
- Reference lookup: `find({ 'bezug.typ': 'umzug', 'bezug.id': umzugId })`

### Zeiterfassung Model

```javascript
// Employee time
{ mitarbeiterId: 1 }

// Project time
{ projektId: 1 }

// Date queries
{ datum: -1 }

// Employee daily entries
{ mitarbeiterId: 1, datum: -1 }

// Project time reports
{ projektId: 1, datum: -1 }

// Work hours analysis
{ arbeitsstunden: 1 }

// Activity tracking
{ taetigkeit: 1 }
```

**Query Patterns:**
- Employee time: `find({ mitarbeiterId, datum: { $gte, $lte } })`
- Project time: `find({ projektId }).sort({ datum: -1 })`
- Daily entries: `find({ mitarbeiterId, datum })`
- Overtime check: `find({ arbeitsstunden: { $gt: 8 } })`

### Token Model

```javascript
// Unique token
{ token: 1 } - unique

// User tokens
{ userId: 1 }

// TTL expiration
{ expiresAt: 1 } - TTL

// Status check
{ userId: 1, type: 1, revoked: 1 }
```

**Query Patterns:**
- Token validation: `find({ token, type, revoked: false })`
- User tokens: `find({ userId, type: 'refresh' })`
- Expired cleanup: Automatic via TTL

## Index Management

### Creating Indexes

```bash
# Create all indexes
node migrations/create-indexes.js up

# Drop all indexes
node migrations/create-indexes.js down

# View index statistics
node migrations/create-indexes.js stats
```

### Monitoring Indexes

```bash
# Generate performance report
node utils/index-monitor.js report

# Start continuous monitoring
node utils/index-monitor.js monitor 60

# View index usage
node utils/index-monitor.js usage

# Find slow queries
node utils/index-monitor.js slow

# Get recommendations
node utils/index-monitor.js recommendations
```

## Best Practices

### 1. Index Selection
- Create indexes for frequent queries
- Consider query patterns before creating
- Use compound indexes for multi-field queries
- Order matters in compound indexes

### 2. Index Maintenance
- Monitor index usage regularly
- Remove unused indexes
- Check for redundant indexes
- Balance read vs. write performance

### 3. Performance Considerations
- Too many indexes slow down writes
- Large indexes consume memory
- Use sparse indexes for optional fields
- Consider partial indexes for subsets

### 4. Query Optimization
- Use `explain()` to analyze queries
- Check if queries use indexes
- Look for collection scans
- Optimize sort operations

## Monitoring Metrics

### Key Metrics to Track

1. **Index Hit Ratio**
   - Percentage of queries using indexes
   - Target: > 95%

2. **Index Size**
   - Memory usage per index
   - Compare to collection size

3. **Query Performance**
   - Average query time
   - Slow query count
   - Collection scan frequency

4. **Index Usage**
   - Operations per index
   - Unused index identification
   - Hot index identification

### Alert Thresholds

- Slow queries > 100ms
- Collection scans > 10/minute
- Index size > 50% of collection
- Unused indexes after 7 days

## Troubleshooting

### Common Issues

1. **Slow Queries**
   - Check if query uses index
   - Verify index covers query fields
   - Consider compound index

2. **High Memory Usage**
   - Review index sizes
   - Remove unused indexes
   - Consider sparse indexes

3. **Write Performance**
   - Too many indexes
   - Remove redundant indexes
   - Balance read/write needs

4. **Index Not Used**
   - Check query patterns
   - Verify index definition
   - Use hint() if needed

## Migration Strategy

### Adding New Indexes

1. Analyze query patterns
2. Test in development
3. Create index with background: true
4. Monitor performance impact
5. Update documentation

### Removing Indexes

1. Check usage statistics
2. Verify no critical queries affected
3. Have rollback plan
4. Monitor after removal
5. Update documentation

## Security Considerations

1. **Index Information Exposure**
   - Indexes can reveal schema structure
   - Limit index information access
   - Use role-based permissions

2. **Performance Attacks**
   - Complex queries without indexes
   - Implement query timeouts
   - Monitor resource usage

## Future Improvements

1. **Geographic Indexes**
   - Add if location-based features needed
   - Use 2dsphere for coordinates

2. **Wildcard Indexes**
   - Consider for dynamic schemas
   - Useful for flexible document structure

3. **Hidden Indexes**
   - Test index removal impact
   - MongoDB 4.4+ feature

4. **Clustered Collections**
   - Consider for time-series data
   - MongoDB 5.3+ feature