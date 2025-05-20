# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication.

Include the JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### Authentication

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Max Mustermann",
  "email": "max@example.com",
  "password": "SecurePass123!@#",
  "role": "mitarbeiter"
}

Response: 201 Created
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "role": "mitarbeiter"
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "max@example.com",
  "password": "SecurePass123!@#"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "role": "mitarbeiter"
  }
}
```

#### Get Profile
```http
GET /auth/me
Authorization: Bearer YOUR_JWT_TOKEN

Response: 200 OK
{
  "success": true,
  "user": {
    "id": "...",
    "name": "Max Mustermann",
    "email": "max@example.com",
    "role": "mitarbeiter",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Change Password
```http
POST /auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "OldPass123!@#",
  "newPassword": "NewPass456!@#",
  "confirmPassword": "NewPass456!@#"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Umzüge (Moves)

#### List Moves
```http
GET /umzuege?page=1&limit=10&status=geplant&sortBy=startDatum:desc
Authorization: Bearer YOUR_JWT_TOKEN

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Get Move by ID
```http
GET /umzuege/:id
Authorization: Bearer YOUR_JWT_TOKEN

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "...",
    "kunde": { ... },
    "startDatum": "2024-06-01T09:00:00.000Z",
    "status": "geplant",
    ...
  }
}
```

#### Create Move
```http
POST /umzuege
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "kunde": {
    "name": "Firma ABC",
    "email": "kontakt@firma-abc.de",
    "telefon": "+49 123 4567890"
  },
  "startDatum": "2024-06-01T09:00:00.000Z",
  "auszugsadresse": {
    "strasse": "Alte Straße",
    "hausnummer": "123",
    "plz": "12345",
    "ort": "Berlin"
  },
  "einzugsadresse": {
    "strasse": "Neue Straße",
    "hausnummer": "456",
    "plz": "54321",
    "ort": "Hamburg"
  },
  "typ": "Gewerbe",
  "umfang": "3-Zimmer"
}

Response: 201 Created
{
  "success": true,
  "data": { ... }
}
```

#### Update Move
```http
PUT /umzuege/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "status": "abgeschlossen",
  "endzeit": "2024-06-01T17:00:00.000Z"
}

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

### Mitarbeiter (Employees)

#### List Employees
```http
GET /mitarbeiter?role=fahrer&isActive=true
Authorization: Bearer YOUR_JWT_TOKEN

Response: 200 OK
{
  "success": true,
  "data": [...],
  "pagination": { ... }
}
```

#### Create Employee
```http
POST /mitarbeiter
Authorization: Bearer YOUR_JWT_TOKEN (Admin only)
Content-Type: application/json

{
  "personalNummer": "EMP001",
  "vorname": "Hans",
  "nachname": "Schmidt",
  "email": "hans.schmidt@company.de",
  "telefon": "+49 123 4567890",
  "rolle": "fahrer",
  "fuehrerschein": ["B", "C1"]
}

Response: 201 Created
{
  "success": true,
  "data": { ... }
}
```

### Zeiterfassung (Time Tracking)

#### Add Time Entry
```http
POST /zeiterfassung
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "mitarbeiterId": "...",
  "projektId": "...",
  "datum": "2024-05-19",
  "startzeit": "08:00",
  "endzeit": "17:00",
  "pause": 30,
  "taetigkeit": "Umzug durchgeführt"
}

Response: 201 Created
{
  "success": true,
  "data": { ... }
}
```

### File Upload

#### Upload File
```http
POST /uploads
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data

file: [binary data]
category: "dokumente"
relatedId: "umzug_id"

Response: 201 Created
{
  "success": true,
  "data": {
    "filename": "uploaded_file.pdf",
    "url": "/uploads/dokumente/uploaded_file.pdf",
    "size": 1234567
  }
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "E-Mail ist erforderlich"
    }
  ]
}
```

### Authentication Error
```json
{
  "success": false,
  "message": "Nicht authentifiziert"
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Ressource nicht gefunden"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Ein Fehler ist aufgetreten!"
}
```

## Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Sorting
- `sortBy`: Field to sort by with order (e.g., `createdAt:desc`)

### Filtering
- `status`: Filter by status
- `role`: Filter by role
- `search`: Search in multiple fields
- `startDate`: Filter by start date
- `endDate`: Filter by end date

## Rate Limits

- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## CORS

Allowed origins:
- `http://localhost:3000`
- `https://www.lagerlogix.de`

## Data Formats

### Dates
ISO 8601 format: `2024-05-19T15:30:00.000Z`

### Phone Numbers
German format: `+49 123 4567890`

### Postal Codes
5-digit German format: `12345`

### Currency
Amounts in cents: `1099` (€10.99)