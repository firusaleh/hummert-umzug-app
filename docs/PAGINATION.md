# Pagination System Documentation

## Overview

The LagerLogix application implements a comprehensive pagination system supporting both offset-based pagination (traditional page numbers) and cursor-based pagination (for real-time data and infinite scroll).

## Backend Implementation

### 1. Pagination Middleware

Located in `/backend/middleware/pagination.js`

#### Offset-based Pagination

```javascript
exports.offsetPagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
  
  req.pagination = {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    type: 'offset'
  };
  
  next();
};
```

#### Cursor-based Pagination

```javascript
exports.cursorPagination = (req, res, next) => {
  const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
  const cursor = req.query.cursor;
  const direction = req.query.direction || 'next';
  
  req.pagination = {
    cursor,
    pageSize,
    direction,
    type: 'cursor'
  };
  
  next();
};
```

### 2. Controller Integration

Example: Umzug Controller

```javascript
const { createOffsetPaginationResponse, createCursorPaginationResponse } = require('../middleware/pagination');

// Offset-based endpoint
exports.getAllUmzuege = async (req, res) => {
  const query = Umzug.find(filter).populate('mitarbeiter').sort(req.sorting);
  const countQuery = Umzug.countDocuments(filter);
  
  const response = await createOffsetPaginationResponse(query, countQuery, req);
  res.json(response);
};

// Cursor-based endpoint
exports.getUmzuegeStream = async (req, res) => {
  const query = Umzug.find(filter).sort({ createdAt: -1 });
  const response = await createCursorPaginationResponse(query, req, 'createdAt');
  res.json(response);
};
```

### 3. Route Configuration

```javascript
// Offset pagination with sorting and filtering
router.get(
  '/',
  offsetPagination,
  addSortingAndFiltering(['startDatum', 'status', 'kundennummer']),
  umzugController.getAllUmzuege
);

// Cursor pagination for real-time data
router.get(
  '/stream',
  cursorPagination,
  umzugController.getUmzuegeStream
);
```

### 4. Response Format

#### Offset Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Cursor Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "pageSize": 10,
    "hasNextPage": true,
    "hasPreviousPage": true,
    "nextCursor": "60a7f9b9c1e2f3b4d5e6f7a8",
    "previousCursor": "60a7f9b9c1e2f3b4d5e6f7a6"
  }
}
```

## Frontend Implementation

### 1. Pagination Components

#### Pagination Component

Used for traditional page navigation:

```jsx
import Pagination from '../../components/common/Pagination';

<Pagination
  page={pagination.page}
  pageSize={pagination.pageSize}
  totalItems={pagination.totalItems}
  totalPages={pagination.totalPages}
  onPageChange={changePage}
  onPageSizeChange={changePageSize}
/>
```

#### PaginatedTable Component

Complete table with built-in pagination:

```jsx
import PaginatedTable from '../../components/common/PaginatedTable';

<PaginatedTable
  columns={columns}
  data={data}
  loading={loading}
  pagination={pagination}
  onPageChange={changePage}
  onPageSizeChange={changePageSize}
  onSortChange={changeSort}
  renderRow={renderRow}
/>
```

#### InfiniteScrollList Component

For continuous loading of data:

```jsx
import InfiniteScrollList from '../../components/common/InfiniteScrollList';

<InfiniteScrollList
  items={items}
  renderItem={renderItem}
  loadMore={loadMore}
  hasMore={hasMore}
  loading={loading}
  className="max-h-[600px]"
/>
```

#### LoadMoreButton Component

Manual load more functionality:

```jsx
import LoadMoreButton from '../../components/common/LoadMoreButton';

<LoadMoreButton
  onClick={loadMore}
  loading={loading}
  hasMore={hasMore}
  text="Load More"
/>
```

### 2. Custom Hooks

#### usePagination Hook

For offset-based pagination:

```javascript
const {
  data,
  loading,
  error,
  pagination,
  sort,
  changePage,
  changePageSize,
  changeSort,
  changeFilters,
  changeSearch,
  refresh
} = usePagination('/umzuege', {
  initialPageSize: 10,
  initialSort: { sortBy: 'startDatum', sortOrder: 'desc' }
});
```

#### useCursorPagination Hook

For cursor-based pagination:

```javascript
const {
  items,
  loading,
  error,
  hasMore,
  loadMore,
  refresh,
  changeFilters
} = useCursorPagination('/benachrichtigungen', {
  initialPageSize: 20
});
```

## Usage Examples

### 1. Traditional Table with Pagination

```jsx
const UmzuegeList = () => {
  const { data, pagination, changePage, changePageSize, changeSort } = usePagination('/umzuege');
  
  return (
    <PaginatedTable
      columns={columns}
      data={data}
      pagination={pagination}
      onPageChange={changePage}
      onPageSizeChange={changePageSize}
      onSortChange={changeSort}
      renderRow={(umzug) => (
        <tr key={umzug._id}>
          <td>{umzug.kundennummer}</td>
          <td>{umzug.status}</td>
        </tr>
      )}
    />
  );
};
```

### 2. Infinite Scroll List

```jsx
const Benachrichtigungen = () => {
  const { items, hasMore, loadMore } = useCursorPagination('/benachrichtigungen');
  
  return (
    <InfiniteScrollList
      items={items}
      renderItem={(notification) => (
        <div key={notification._id}>
          <h3>{notification.titel}</h3>
          <p>{notification.inhalt}</p>
        </div>
      )}
      loadMore={loadMore}
      hasMore={hasMore}
    />
  );
};
```

### 3. Manual Load More

```jsx
const TaskList = () => {
  const { items, hasMore, loadMore, loading } = useCursorPagination('/tasks');
  
  return (
    <div>
      {items.map(task => (
        <TaskItem key={task._id} task={task} />
      ))}
      
      <LoadMoreButton
        onClick={loadMore}
        loading={loading}
        hasMore={hasMore}
      />
    </div>
  );
};
```

## Performance Optimization

### 1. Database Indexes

Ensure indexes on commonly sorted fields:

```javascript
// In model files
umzugSchema.index({ startDatum: -1 });
umzugSchema.index({ status: 1, startDatum: -1 });
umzugSchema.index({ kundennummer: 1 });
```

### 2. Efficient Count Queries

Use `countDocuments()` instead of `count()`:

```javascript
const totalItems = await Model.countDocuments(filter);
```

### 3. Caching Strategies

Implement client-side caching for pagination results:

```javascript
const cache = new Map();

const fetchWithCache = async (key, fetchFn) => {
  if (cache.has(key)) return cache.get(key);
  const result = await fetchFn();
  cache.set(key, result);
  return result;
};
```

### 4. Lazy Loading

Load only necessary data:

```javascript
const query = Model.find(filter)
  .select('_id kundennummer status startDatum') // Only needed fields
  .lean(); // Plain objects for better performance
```

## API Query Parameters

### Offset Pagination

- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 10, max: 100)
- `sortBy`: Field to sort by
- `sortOrder`: Sort direction ('asc' or 'desc')
- `search`: Search query
- Additional filters as query parameters

Example: `/api/umzuege?page=2&pageSize=20&sortBy=startDatum&sortOrder=desc&status=geplant`

### Cursor Pagination

- `cursor`: Cursor for next/previous page
- `pageSize`: Items per page (default: 10, max: 100)
- `direction`: Pagination direction ('next' or 'previous')
- Filters as query parameters

Example: `/api/benachrichtigungen?cursor=60a7f9b9c1e2f3b4d5e6f7a8&pageSize=20&typ=info`

## Best Practices

1. **Choose the Right Type**: Use offset pagination for traditional tables, cursor pagination for real-time data
2. **Limit Page Size**: Always enforce maximum page size to prevent performance issues
3. **Use Indexes**: Create database indexes on sorted and filtered fields
4. **Cache Results**: Implement caching for frequently accessed pages
5. **Handle Errors**: Always provide error handling and fallback UI
6. **Optimize Queries**: Select only necessary fields and use lean() for read operations
7. **Debounce Search**: Implement debouncing for search inputs to avoid excessive API calls

## Security Considerations

1. **Validate Input**: Always validate page numbers and sizes
2. **Rate Limiting**: Apply rate limiting to pagination endpoints
3. **Access Control**: Ensure proper authentication and authorization
4. **Query Injection**: Sanitize filter parameters to prevent injection attacks

## Future Enhancements

1. **GraphQL Support**: Add pagination support for GraphQL endpoints
2. **Virtualization**: Implement virtual scrolling for large datasets
3. **Persistent State**: Save pagination state in URL or localStorage
4. **Bulk Operations**: Support bulk operations on paginated data
5. **Export Features**: Enable export of filtered/sorted results