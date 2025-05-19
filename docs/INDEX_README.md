# MongoDB Index Implementation Guide

## Overview

This guide provides instructions for implementing and managing MongoDB indexes in the LagerLogix application. The index system is designed to optimize query performance, ensure data integrity, and provide monitoring capabilities.

## Quick Start

### 1. Create All Indexes

```bash
# Navigate to backend directory
cd backend

# Run the migration script
node migrations/create-indexes.js up
```

### 2. Verify Indexes

```bash
# Run the test suite
node tests/index-tests.js

# Check index statistics
node migrations/create-indexes.js stats
```

### 3. Monitor Performance

```bash
# Generate a performance report
node utils/index-monitor.js report

# Start continuous monitoring
node utils/index-monitor.js monitor 60
```

## File Structure

```
backend/
├── models/
│   └── indexes.js              # Index definitions and manager
├── migrations/
│   └── create-indexes.js       # Migration script
├── utils/
│   └── index-monitor.js        # Monitoring utilities
├── tests/
│   └── index-tests.js          # Automated tests
└── docs/
    ├── INDEXES.md              # Detailed documentation
    └── INDEX_README.md         # This file
```

## Index Categories

### 1. Primary Indexes
- Email lookup for users
- Status filtering for moves
- Date range queries

### 2. Unique Constraints
- User emails
- Invoice numbers
- Offer numbers

### 3. Compound Indexes
- Multi-field queries
- Sort optimizations
- Complex filters

### 4. Special Indexes
- Text search
- TTL for expiration
- Sparse for optional fields

## Key Features

### Automatic Index Creation
- Comprehensive index definitions
- Background creation
- Error handling

### Performance Monitoring
- Query analysis
- Usage statistics
- Slow query detection

### Testing Suite
- Existence verification
- Performance testing
- Constraint validation

## Common Operations

### Adding a New Index

1. Define in `models/indexes.js`:
```javascript
await Collection.createIndex(
  { fieldName: 1 },
  { 
    name: 'descriptive_name',
    background: true 
  }
);
```

2. Run migration:
```bash
node migrations/create-indexes.js up
```

3. Test the index:
```bash
node tests/index-tests.js
```

### Removing an Index

1. Check usage first:
```bash
node utils/index-monitor.js usage
```

2. Drop specific index:
```javascript
await Collection.dropIndex('index_name');
```

### Monitoring Queries

1. Find slow queries:
```bash
node utils/index-monitor.js slow
```

2. Get recommendations:
```bash
node utils/index-monitor.js recommendations
```

## Performance Tips

### Query Optimization
1. Use compound indexes for multi-field queries
2. Order matters in compound indexes
3. Use covered queries when possible
4. Avoid collection scans

### Index Management
1. Remove unused indexes
2. Monitor index sizes
3. Balance read/write performance
4. Use sparse indexes for optional fields

## Troubleshooting

### Common Issues

1. **Slow Queries**
   - Check if index exists
   - Verify query uses index
   - Consider compound index

2. **High Memory Usage**
   - Review index sizes
   - Remove redundant indexes
   - Use sparse indexes

3. **Creation Failures**
   - Check for duplicate names
   - Verify field exists
   - Check permissions

### Debug Commands

```bash
# Check index usage
node utils/index-monitor.js usage

# Analyze specific collection
mongo mydb --eval "db.collection.getIndexes()"

# Explain query
mongo mydb --eval "db.collection.find({...}).explain('executionStats')"
```

## Best Practices

### 1. Planning
- Analyze query patterns first
- Consider write impact
- Plan for data growth

### 2. Implementation
- Create indexes in background
- Test in development first
- Monitor after deployment

### 3. Maintenance
- Regular performance reviews
- Remove unused indexes
- Update as patterns change

## Migration Strategy

### Development to Production

1. Test indexes in development
2. Measure performance impact
3. Create with background: true
4. Monitor after deployment

### Rollback Plan

1. Keep index creation logs
2. Document removed indexes
3. Have restore scripts ready
4. Monitor after changes

## Security Considerations

1. Limit index information access
2. Monitor for query attacks
3. Set query timeouts
4. Use role-based permissions

## Monitoring Checklist

### Daily
- [ ] Check slow query count
- [ ] Monitor index hit ratio
- [ ] Review error logs

### Weekly
- [ ] Analyze query patterns
- [ ] Check index sizes
- [ ] Review recommendations

### Monthly
- [ ] Full performance audit
- [ ] Update documentation
- [ ] Plan optimizations

## Support

For issues or questions:
1. Check the detailed documentation in `INDEXES.md`
2. Review test results
3. Analyze monitoring reports
4. Contact the development team

## Future Enhancements

1. **Automated Optimization**
   - ML-based index recommendations
   - Automatic index creation
   - Dynamic index management

2. **Advanced Features**
   - Geographic indexes
   - Wildcard indexes
   - Clustered collections

3. **Monitoring Improvements**
   - Real-time dashboards
   - Alert automation
   - Predictive analysis