# LagerLogix Backend Validation System Documentation

## Overview

The LagerLogix backend implements a comprehensive validation system using Joi for schema validation and custom middleware for security. This documentation covers all validation layers, security measures, and usage examples.

## Architecture

### 1. Validation Layers

- **Schema Validation**: Using Joi for request body, query, and parameter validation
- **File Validation**: Custom middleware for file uploads
- **Data Sanitization**: Automatic XSS and injection prevention
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Protection against common web vulnerabilities

### 2. Directory Structure

```
backend/
├── middleware/
│   ├── validators/
│   │   ├── common.validators.js     # Common validation schemas
│   │   ├── auth.validators.js       # Authentication validation
│   │   ├── umzug.validators.js      # Move/relocation validation
│   │   ├── mitarbeiter.validators.js # Employee validation
│   │   ├── finanzen.validators.js   # Financial validation
│   │   ├── file.validators.js       # File upload validation
│   │   └── index.js                 # Main export file
│   └── error.middleware.js          # Error handling
├── utils/
│   └── validators/
│       ├── sanitizer.js             # Data sanitization
│       └── security.js              # Security utilities
└── config/
    └── security.js                  # Security configuration
```

## Common Validators

### Basic Validators

```javascript
// Email validation
validators.email // Valid email with TLD check

// Phone number (German format)
validators.phoneNumber // Supports international format

// German postal code
validators.germanPostalCode // Exactly 5 digits

// Time format
validators.timeFormat // HH:MM format

// Safe string (prevents XSS)
validators.safeString // No HTML/script tags

// MongoDB ObjectId
validators.objectId // 24-character hex string

// Positive number
validators.positiveNumber // Must be > 0

// ISO date
validators.isoDate // YYYY-MM-DD format

// IBAN
validators.iban // International bank account number

// Strong password
validators.strongPassword // Min 8 chars, uppercase, lowercase, number, special char

// Simple password
validators.simplePassword // Min 6 chars
```

### Complex Schemas

```javascript
// Address schema
schemas.address = {
  strasse: required,
  hausnummer: required,
  plz: required (5 digits),
  ort: required,
  land: optional (default: 'Deutschland')
}

// Contact person
schemas.contact = {
  name: required,
  telefon: optional,
  email: optional,
  position: optional
}

// Price schema
schemas.price = {
  netto: required positive number,
  brutto: required positive number,
  mwst: optional (default: 19),
  bezahlt: boolean (default: false),
  zahlungsart: enum ['rechnung', 'bar', 'ueberweisung', 'paypal', 'kreditkarte']
}

// Date range
schemas.dateRange = {
  start: required ISO date,
  end: required ISO date,
  // Custom validation: start must be before end
}

// Pagination
schemas.pagination = {
  page: integer min 1 (default: 1),
  limit: integer 1-100 (default: 10),
  sort: string,
  order: 'asc' or 'desc' (default: 'desc')
}
```

## Module-Specific Validators

### Authentication

```javascript
// Registration
{
  name: required, 2-50 chars,
  email: required valid email,
  password: required, min 6 chars,
  role: optional enum ['admin', 'mitarbeiter', 'fahrer', 'praktikant']
}

// Login
{
  email: required valid email,
  password: required
}

// Password change
{
  currentPassword: required,
  newPassword: required strong password,
  confirmPassword: must match newPassword
}
```

### Umzug (Moves)

```javascript
// Create move
{
  kundennummer: optional,
  aufnahmeId: optional ObjectId,
  auftraggeber: required {
    name: required,
    telefon: required,
    email: optional,
    firma: optional
  },
  auszugsadresse: required address schema,
  einzugsadresse: required address schema,
  startDatum: required ISO date,
  endDatum: required ISO date,
  status: enum ['geplant', 'bestaetigt', 'in_bearbeitung', 'abgeschlossen', 'storniert'],
  preis: optional price schema,
  fahrzeuge: array of vehicle objects,
  mitarbeiter: array of employee assignments,
  tasks: array of task objects,
  inventar: optional inventory object
}

// Query parameters
{
  status: optional enum,
  startDatum: optional ISO date,
  endDatum: optional ISO date,
  page: pagination,
  limit: pagination,
  sort: enum ['startDatum', 'endDatum', 'status', 'createdAt'],
  order: 'asc' or 'desc'
}
```

### Mitarbeiter (Employees)

```javascript
// Create employee
{
  vorname: required 2-50 chars,
  nachname: required 2-50 chars,
  userId: optional ObjectId,
  telefon: optional phone number,
  email: optional email,
  adresse: optional address schema,
  position: enum ['Geschäftsführer', 'Teamleiter', 'Träger', 'Fahrer', ...],
  abteilung: enum ['Umzüge', 'Verwaltung', 'Verkauf', 'Lager', 'Fuhrpark'],
  einstellungsdatum: optional ISO date,
  fuehrerscheinklassen: array of license classes,
  bankverbindung: optional {
    iban: IBAN format,
    bic: string,
    bank: string
  }
}

// Working time
{
  datum: required ISO date,
  startzeit: required HH:MM,
  endzeit: required HH:MM,
  pausen: array of pause objects,
  notizen: optional string
}
```

### Finanzen (Finance)

```javascript
// Invoice/Quote position
{
  beschreibung: required,
  menge: required positive,
  einheit: enum ['Stück', 'Stunden', 'Pauschale', 'm²', 'm³', 'km', 'kg'],
  einzelpreis: required positive,
  rabatt: 0-100%
}

// Create invoice
{
  kunde: required ObjectId,
  umzug: optional ObjectId,
  faelligkeitsdatum: required ISO date,
  status: enum ['Entwurf', 'Gesendet', 'Überfällig', 'Bezahlt', ...],
  zahlungsmethode: enum ['Überweisung', 'Bar', 'PayPal', ...],
  mehrwertsteuer: 0-100 (default: 19),
  positionsliste: array of positions (min 1),
  notizen: optional max 2000 chars
}

// Project costs
{
  bezeichnung: required,
  umzug: required ObjectId,
  kategorie: enum ['Personal', 'Fahrzeuge', 'Material', ...],
  betrag: required positive,
  datum: optional ISO date,
  bezahlstatus: enum ['Offen', 'Genehmigt', 'Bezahlt', 'Abgelehnt']
}
```

### File Upload

```javascript
// Single file upload
{
  kategorie: enum ['dokument', 'bild', 'vertrag', ...],
  bezugId: optional ObjectId,
  bezugModell: enum ['Umzug', 'Mitarbeiter', ...],
  beschreibung: optional max 500 chars,
  tags: array of strings max 10
}

// File validation
- Max size: 10MB
- Allowed MIME types: images, documents, archives
- Filename sanitization
- Path traversal prevention
```

## Security Features

### 1. Data Sanitization

- **XSS Prevention**: All string inputs are sanitized
- **SQL Injection Prevention**: Special characters escaped
- **MongoDB Injection Prevention**: Operators sanitized
- **Path Traversal Prevention**: File paths validated

### 2. Rate Limiting

```javascript
// General API: 100 requests per 15 minutes
// Auth endpoints: 5 requests per 15 minutes
// File uploads: 20 uploads per 15 minutes
// Financial operations: 30 requests per 15 minutes
```

### 3. Security Headers

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: restrictive policy
- CORS: Configured for specific origins

### 4. Error Handling

```javascript
// Development: Full error details
{
  success: false,
  status: 'fail' or 'error',
  message: 'Error message',
  errors: ['Validation errors'],
  stack: 'Stack trace'
}

// Production: Sanitized errors
{
  success: false,
  message: 'Error message',
  errors: ['User-friendly errors']
}
```

## Usage Examples

### Route Implementation

```javascript
// Import validators
const { umzug: umzugValidation } = require('../middleware/validators');

// Apply to routes
router.post(
  '/umzuege',
  umzugValidation.create,  // Validates request body
  umzugController.createUmzug
);

router.get(
  '/umzuege',
  umzugValidation.list,    // Validates query parameters
  umzugController.getAllUmzuege
);

router.put(
  '/umzuege/:id',
  umzugValidation.validateId,  // Validates URL params
  umzugValidation.update,      // Validates request body
  umzugController.updateUmzug
);
```

### Custom Validation

```javascript
// Create custom validator
const customSchema = Joi.object({
  customField: Joi.string()
    .pattern(/^[A-Z]{3}[0-9]{3}$/)
    .messages({
      'string.pattern.base': 'Format must be XXX000'
    })
});

// Use with middleware
const customValidation = createValidationMiddleware(customSchema);

router.post('/custom', customValidation, controller.method);
```

### Error Response Examples

```javascript
// Validation error
{
  "success": false,
  "message": "Validierungsfehler",
  "errors": [
    {
      "field": "email",
      "message": "Ungültige E-Mail-Adresse",
      "type": "string.email"
    },
    {
      "field": "telefon",
      "message": "Bitte geben Sie eine gültige Telefonnummer an",
      "type": "string.pattern.base"
    }
  ]
}

// Rate limit error
{
  "success": false,
  "message": "Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut."
}

// File validation error
{
  "success": false,
  "message": "Dateityp nicht erlaubt",
  "allowedTypes": ["image/jpeg", "image/png", "application/pdf", ...]
}
```

## Best Practices

### 1. Always Validate Input

```javascript
// Bad
router.post('/api/resource', controller.create);

// Good
router.post('/api/resource', validation.create, controller.create);
```

### 2. Use Appropriate Validators

```javascript
// Bad - too permissive
schema = Joi.object({
  email: Joi.string()
});

// Good - specific validation
schema = Joi.object({
  email: validators.email.required()
});
```

### 3. Sanitize Output

```javascript
// Log with sanitized data
console.log('User created:', security.maskSensitiveData(userData));
```

### 4. Custom Error Messages

```javascript
// Provide German error messages
.messages({
  'any.required': 'Dieses Feld ist erforderlich',
  'string.email': 'Bitte geben Sie eine gültige E-Mail-Adresse an'
})
```

### 5. Validate Business Logic

```javascript
// Custom validation for business rules
.custom((value, helpers) => {
  if (value.startDate > value.endDate) {
    return helpers.error('dateRange.invalid');
  }
  return value;
})
```

## Testing Validation

```javascript
// Test validation in unit tests
const { error, value } = schema.validate(testData);
expect(error).toBeUndefined();
expect(value).toEqual(expectedData);

// Test validation errors
const { error } = schema.validate(invalidData);
expect(error.details[0].message).toBe('Expected error message');
```

## Maintenance

### Adding New Validators

1. Create schema in appropriate validator file
2. Export from index.js
3. Apply to routes
4. Update documentation
5. Add tests

### Updating Security Rules

1. Update security.js configuration
2. Test rate limits
3. Verify CORS settings
4. Update documentation

### Monitoring

- Log validation errors for analysis
- Monitor rate limit hits
- Track security events
- Review error patterns

## Support

For questions or issues with the validation system:

1. Check this documentation
2. Review error messages
3. Check server logs
4. Contact development team

Remember: Security is everyone's responsibility. Always validate input and never trust user data!