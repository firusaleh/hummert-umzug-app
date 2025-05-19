# Pagination Implementation Guide

## Quick Start

### Step 1: Update Backend Route

```javascript
// routes/your-entity.routes.js
const { offsetPagination, addSortingAndFiltering } = require('../middleware/pagination');

router.get(
  '/',
  offsetPagination,
  addSortingAndFiltering(['field1', 'field2', 'field3']),
  yourController.getAll
);
```

### Step 2: Update Controller

```javascript
// controllers/your-entity.controller.js
const { createOffsetPaginationResponse } = require('../middleware/pagination');

exports.getAll = async (req, res) => {
  try {
    // Build filter
    const filter = { ...req.filters };
    
    // Add custom filters
    if (req.query.customFilter) {
      filter.customField = req.query.customFilter;
    }
    
    // Build query
    const query = YourModel.find(filter)
      .populate('relatedField')
      .sort(req.sorting);
    
    // Count query
    const countQuery = YourModel.countDocuments(filter);
    
    // Get paginated response
    const response = await createOffsetPaginationResponse(query, countQuery, req);
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### Step 3: Update Frontend Component

```jsx
// pages/YourEntityList.jsx
import React from 'react';
import PaginatedTable from '../../components/common/PaginatedTable';
import usePagination from '../../hooks/usePagination';

const YourEntityList = () => {
  const {
    data,
    loading,
    error,
    pagination,
    sort,
    changePage,
    changePageSize,
    changeSort
  } = usePagination('/your-entities');

  const columns = [
    { key: 'field1', label: 'Field 1', sortable: true },
    { key: 'field2', label: 'Field 2', sortable: true },
    { key: 'field3', label: 'Field 3', sortable: false }
  ];

  const renderRow = (item) => (
    <tr key={item._id}>
      <td>{item.field1}</td>
      <td>{item.field2}</td>
      <td>{item.field3}</td>
    </tr>
  );

  return (
    <PaginatedTable
      columns={columns}
      data={data}
      loading={loading}
      error={error}
      pagination={pagination}
      onPageChange={changePage}
      onPageSizeChange={changePageSize}
      onSortChange={changeSort}
      currentSort={sort}
      renderRow={renderRow}
    />
  );
};

export default YourEntityList;
```

## Complete Examples

### Example 1: Employee List with Filters

Backend:
```javascript
// routes/mitarbeiter.routes.js
router.get(
  '/',
  offsetPagination,
  addSortingAndFiltering(['nachname', 'vorname', 'position', 'isActive']),
  mitarbeiterController.getAllMitarbeiter
);

// controllers/mitarbeiter.controller.js
exports.getAllMitarbeiter = async (req, res) => {
  const { search, position, isActive } = req.query;
  
  const filter = { ...req.filters };
  
  if (position) filter.position = position;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  
  if (search) {
    const searchFilter = createSearchFilter(search, ['vorname', 'nachname', 'telefon']);
    Object.assign(filter, searchFilter);
  }
  
  const query = Mitarbeiter.find(filter)
    .populate('userId', 'name email role')
    .sort(req.sorting);
    
  const countQuery = Mitarbeiter.countDocuments(filter);
  
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  res.json(response);
};
```

Frontend:
```jsx
const MitarbeiterList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  
  const {
    data: mitarbeiter,
    pagination,
    changePage,
    changePageSize,
    changeSort,
    changeFilters,
    changeSearch
  } = usePagination('/mitarbeiter');
  
  useEffect(() => {
    changeSearch(searchTerm);
  }, [searchTerm]);
  
  useEffect(() => {
    const filters = {};
    if (positionFilter) filters.position = positionFilter;
    changeFilters(filters);
  }, [positionFilter]);
  
  // ... rest of component
};
```

### Example 2: Notifications with Infinite Scroll

Backend:
```javascript
// routes/benachrichtigung.routes.js
router.get(
  '/',
  cursorPagination,
  benachrichtigungController.getMeineBenachrichtigungen
);

// controllers/benachrichtigung.controller.js
exports.getMeineBenachrichtigungen = async (req, res) => {
  const { gelesen, typ } = req.query;
  
  const filter = { empfaenger: req.user.id };
  
  if (gelesen !== undefined) filter.gelesen = gelesen === 'true';
  if (typ) filter.typ = typ;
  
  const query = Benachrichtigung.find(filter)
    .populate('erstelltVon', 'name')
    .sort({ createdAt: -1 });
  
  const response = await createCursorPaginationResponse(query, req, 'createdAt');
  res.json(response);
};
```

Frontend:
```jsx
const Benachrichtigungen = () => {
  const [filterType, setFilterType] = useState('');
  
  const {
    items: notifications,
    hasMore,
    loadMore,
    changeFilters
  } = useCursorPagination('/benachrichtigungen');
  
  useEffect(() => {
    const filters = {};
    if (filterType) filters.typ = filterType;
    changeFilters(filters);
  }, [filterType]);
  
  return (
    <InfiniteScrollList
      items={notifications}
      renderItem={(notification) => (
        <NotificationItem key={notification._id} notification={notification} />
      )}
      loadMore={loadMore}
      hasMore={hasMore}
    />
  );
};
```

## Advanced Features

### Custom Sort Functions

```javascript
// In controller
const customSort = (sortBy, sortOrder) => {
  if (sortBy === 'fullName') {
    return { vorname: sortOrder, nachname: sortOrder };
  }
  return { [sortBy]: sortOrder };
};

const query = Model.find(filter).sort(customSort(req.sort.sortBy, req.sort.sortOrder));
```

### Complex Filters

```javascript
// Date range filter
const dateFilter = createDateRangeFilter(req.query.startDate, req.query.endDate, 'createdAt');

// Multi-field search
const searchFilter = createSearchFilter(req.query.search, ['field1', 'field2', 'field3']);

// Combine filters
const filter = {
  ...req.filters,
  ...dateFilter,
  ...searchFilter,
  status: { $in: ['active', 'pending'] }
};
```

### Performance Optimization

```javascript
// Select only needed fields
const query = Model.find(filter)
  .select('_id name status createdAt')
  .lean()
  .populate('user', 'name email');

// Use indexes
modelSchema.index({ status: 1, createdAt: -1 });
modelSchema.index({ 'user.name': 'text' });
```

### Error Handling

```javascript
// Frontend
const { data, error, refresh } = usePagination('/entities');

if (error) {
  return (
    <ErrorDisplay
      message={error}
      onRetry={refresh}
    />
  );
}

// Backend
try {
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  res.json(response);
} catch (error) {
  console.error('Pagination error:', error);
  res.status(500).json({
    message: 'Failed to fetch data',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

## Testing Pagination

```javascript
// Jest test example
describe('Pagination', () => {
  it('should return paginated results', async () => {
    const response = await request(app)
      .get('/api/entities?page=2&pageSize=10&sortBy=name&sortOrder=asc')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.pageSize).toBe(10);
    expect(response.body.data).toHaveLength(10);
  });
  
  it('should handle invalid page numbers', async () => {
    const response = await request(app)
      .get('/api/entities?page=-1')
      .expect(400);
  });
});
```

## Common Issues and Solutions

### Issue 1: Count Query Performance
**Solution**: Use estimated counts for large collections
```javascript
const estimatedCount = await Model.estimatedDocumentCount();
```

### Issue 2: Cursor Pagination with Sorting
**Solution**: Use compound cursor
```javascript
const cursor = `${item.sortField}:${item._id}`;
```

### Issue 3: Empty Results on Filter Change
**Solution**: Reset to page 1 on filter change
```javascript
useEffect(() => {
  changePage(1);
}, [filters]);
```

### Issue 4: Race Conditions
**Solution**: Cancel previous requests
```javascript
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// On new request:
controller.abort();
```