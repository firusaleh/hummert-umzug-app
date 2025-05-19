# LagerLogix Backend Controllers Documentation

## Overview

This document describes the backend controllers in the LagerLogix application. All controllers extend the `BaseController` class which provides common functionality for error handling, response formatting, and utility methods.

## Base Controller

The `BaseController` provides common functionality for all controllers:

### Features:
- Standardized response formats (success/error)
- Validation error handling
- Async error handling wrapper
- Pagination utilities
- Authorization checks
- MongoDB error handling
- Transaction support

### Methods:
- `success(res, data, message, statusCode)` - Send success response
- `error(res, message, statusCode, errors)` - Send error response
- `handleValidationErrors(req, res)` - Handle express-validator errors
- `asyncHandler(fn)` - Wrap async functions for error handling
- `createFilter(query, allowedFields)` - Create MongoDB filter from query params
- `createPagination(query)` - Create pagination object
- `authorize(req, res, requiredRoles)` - Check user authorization
- `withTransaction(callback)` - Execute operations in a transaction

## Auth Controller

Handles authentication and user management.

### Endpoints:

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "mitarbeiter" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "userId",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "mitarbeiter"
    },
    "token": "jwt.token.here"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

#### POST /api/auth/login
Login with credentials.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "userId",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "mitarbeiter"
    },
    "token": "jwt.token.here"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

#### GET /api/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "userId",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "mitarbeiter",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

#### PUT /api/auth/change-password
Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

#### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "resetToken",
  "newPassword": "newpassword456"
}
```

## Umzug Controller

Manages moving (Umzug) operations.

### Endpoints:

#### GET /api/umzuege
Get all Umzüge with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by status
- `startDatum` - Filter by start date
- `endDatum` - Filter by end date
- `search` - Search in customer number and name
- `sortBy` - Sort field (e.g., "startDatum:desc")

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

#### GET /api/umzuege/:id
Get Umzug by ID.

#### POST /api/umzuege
Create new Umzug.

**Request Body:**
```json
{
  "kundennummer": "K001",
  "auftraggeber": {
    "name": "John Doe",
    "telefon": "+49123456789",
    "email": "john@example.com"
  },
  "startDatum": "2024-01-20",
  "endDatum": "2024-01-21",
  "status": "geplant",
  "auszugsadresse": {...},
  "einzugsadresse": {...},
  "preis": {
    "netto": 1000,
    "brutto": 1190,
    "mwst": 19
  }
}
```

#### PUT /api/umzuege/:id
Update existing Umzug.

#### DELETE /api/umzuege/:id
Delete Umzug and associated notifications.

#### POST /api/umzuege/:id/tasks
Add task to Umzug.

**Request Body:**
```json
{
  "beschreibung": "Pack kitchen items",
  "faelligkeit": "2024-01-19",
  "prioritaet": "hoch",
  "zugewiesen": "userId"
}
```

#### PUT /api/umzuege/:id/tasks/:taskId
Update task in Umzug.

#### DELETE /api/umzuege/:id/tasks/:taskId
Delete task from Umzug.

#### POST /api/umzuege/:id/dokumente
Add document to Umzug.

#### POST /api/umzuege/:id/notizen
Add note to Umzug.

#### GET /api/umzuege/statistics
Get Umzug statistics.

## Mitarbeiter Controller

Manages employee (Mitarbeiter) operations.

### Endpoints:

#### GET /api/mitarbeiter
Get all employees with pagination.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `search` - Search by name or phone
- `position` - Filter by position
- `isActive` - Filter by active status

#### GET /api/mitarbeiter/:id
Get employee by ID.

#### POST /api/mitarbeiter
Create new employee.

**Request Body:**
```json
{
  "vorname": "John",
  "nachname": "Doe",
  "telefon": "+49123456789",
  "email": "john.doe@example.com",
  "position": "Fahrer",
  "einstellungsdatum": "2024-01-01",
  "faehigkeiten": ["LKW-Führerschein", "Staplerführerschein"],
  "fuehrerscheinklassen": ["B", "C", "CE"]
}
```

#### PUT /api/mitarbeiter/:id
Update employee.

#### POST /api/mitarbeiter/:id/arbeitszeiten
Add working hours.

#### POST /api/mitarbeiter/:id/dokumente
Add document to employee.

## Aufnahme Controller

Manages survey/assessment (Aufnahme) operations.

### Endpoints:

#### GET /api/aufnahmen
Get all assessments.

**Query Parameters:**
- `status` - Filter by status
- `aufnehmer` - Filter by assessor
- `startDatum` - Filter by start date
- `endDatum` - Filter by end date

#### GET /api/aufnahmen/:id
Get assessment by ID.

#### POST /api/aufnahmen
Create new assessment.

#### PUT /api/aufnahmen/:id
Update assessment.

#### POST /api/aufnahmen/:id/raeume
Add room to assessment.

#### POST /api/aufnahmen/:id/raeume/:raumId/moebel
Add furniture to room.

#### POST /api/aufnahmen/:id/bilder
Add image to assessment.

#### POST /api/aufnahmen/:id/angebot
Create offer from assessment.

## Error Handling

All controllers use a standardized error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ // Optional validation errors
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <jwt-token>
```

Tokens are obtained through the login endpoint and should be included in all authenticated requests.

## Pagination

Paginated endpoints support the following query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

Response format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Testing

### Unit Tests
Located in `/tests/controllers/`:
- Run with: `npm run test:unit`
- Tests controller logic in isolation
- Mocks database operations

### Integration Tests
Located in `/tests/integration/`:
- Run with: `npm run test:integration`
- Tests complete API flows
- Uses test database

### Test Coverage
- Run coverage report: `npm run test:coverage`
- Aim for >80% coverage

## Best Practices

1. **Always extend BaseController** for consistent error handling
2. **Use asyncHandler** wrapper for all async methods
3. **Validate input** using express-validator
4. **Return standardized responses** using success/error methods
5. **Handle all error cases** explicitly
6. **Use transactions** for operations affecting multiple collections
7. **Log errors** for debugging
8. **Document all endpoints** with request/response examples
9. **Write tests** for all controller methods
10. **Keep controllers thin** - business logic in services/models