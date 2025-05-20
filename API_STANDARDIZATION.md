# API Standardization and Service Layer Implementation

This document outlines the standardization of API architecture, error handling, and service layer implementation for the Hummert Umzug application backend.

## Architecture Overview

The application now follows a layered architecture:

```
Client Request → Router → Controller → Service → Model → Database
```

### Key Components

1. **Routers**: Define API endpoints and route requests to controllers
2. **Controllers**: Handle HTTP requests/responses and use services for business logic
3. **Services**: Implement business logic and data operations
4. **Models**: Define data structure and validation rules
5. **Middleware**: Process requests before they reach controllers

## Service Layer Implementation

### BaseService Class

We've introduced a `BaseService` class that provides reusable CRUD operations for all entities:

- `findById`: Retrieve a document by ID with optional population
- `findAll`: Get all documents with filtering, pagination, and sorting
- `create`: Create a new document with validation
- `update`: Update a document by ID
- `delete`: Delete a document by ID
- `exists`: Check if a document exists based on criteria
- `aggregate`: Execute MongoDB aggregation pipelines

### Domain-Specific Services

Each domain has its own service class that inherits functionality from BaseService:

- `ClientService`: Operations related to clients
- `NotificationService`: Notification handling and creation
- `EmailService`: Email sending and templating
- (Other services to be implemented...)

## Standardized Error Handling

### Error Utilities

The `error.utils.js` module provides:

- `AppError`: Custom operational error class with status codes
- `catchAsync`: Wrapper for async functions to centralize error handling
- `createValidationError`: Generate errors for validation failures
- `createNotFoundError`: Generate 404 errors for missing resources
- `createUnauthorizedError`: Generate 401 errors for authentication issues
- `createForbiddenError`: Generate 403 errors for permission issues

### Global Error Handler

The `error.middleware.js` middleware:

- Formats different error types consistently
- Handles both operational and programming errors
- Provides detailed errors in development and sanitized errors in production
- Handles MongoDB-specific errors (validation, duplicate keys, etc.)
- Handles JWT-related errors

## Response Format Standardization

All API responses now follow a consistent format:

### Success Format
```json
{
  "success": true,
  "data": {...},
  "pagination": {
    "total": 100,
    "limit": 25,
    "currentPage": 1,
    "pages": 4
  }
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Validation

All data validation now occurs at three levels:

1. **Model Level**: Mongoose schema validation
2. **Service Level**: Business rule validation
3. **Controller Level**: Request data validation using express-validator

## Authentication and Authorization

- Token-based authentication using JWT
- Role-based access control
- Route-level and controller-level authorization checks

## API Documentation

Each controller method includes JSDoc comments that describe:

- Endpoint description
- Route path
- Access control requirements
- Request parameters
- Response format

## File Organization

```
backend/
├── config/            # Configuration files
├── controllers/       # HTTP request handlers
├── middleware/        # Express middleware
├── models/            # Mongoose models
├── routes/            # API routes
├── services/          # Business logic 
│   ├── base.service.js      # Base service with common operations
│   ├── client.service.js    # Client-specific operations
│   ├── notification.service.js # Notification operations
│   └── email.service.js     # Email functionality
├── utils/             # Utility functions
│   ├── error.utils.js      # Error handling utilities
└── server.js          # Application entry point
```

## Implementation Roadmap

### Phase 1: Foundation (Completed)
- ✅ Implement BaseService
- ✅ Create standardized error handling
- ✅ Update response formats
- ✅ Create ClientService and NotificationService
- ✅ Implement standardized controller pattern

### Phase 2: Service Layer (In Progress)
- ⬜ Implement remaining service classes (UmzugService, TaskService, etc.)
- ⬜ Update all controllers to use service layer
- ⬜ Standardize validation approach
- ⬜ Add transaction support for multi-document operations

### Phase 3: API Enhancements (Planned)
- ⬜ Add API versioning
- ⬜ Implement comprehensive API documentation
- ⬜ Add rate limiting
- ⬜ Implement caching for common requests

## Best Practices

1. **Error Handling**:
   - Always use `catchAsync` for async controller methods
   - Use the appropriate error creation function for each error type
   - Let the global error handler manage the error response

2. **Service Layer**:
   - Business logic should live in services, not controllers
   - Controllers should only handle HTTP concerns
   - Services should be testable in isolation

3. **Validation**:
   - Always validate input data
   - Return clear validation error messages
   - Sanitize inputs to prevent security issues

4. **Response Format**:
   - Always use the standard success/error format
   - Include pagination data when returning collections
   - Use consistent property naming

## Migration Guide

When updating existing controllers to use the service layer:

1. Create a corresponding service file if it doesn't exist
2. Move business logic from controller to service
3. Replace direct model operations with service method calls
4. Update error handling to use `catchAsync` and error utilities
5. Ensure consistent response formats