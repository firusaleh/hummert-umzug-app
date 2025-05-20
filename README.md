# Hummert Umzug App - Backend

This is the backend API for the Hummert Umzug (Moving Services) application. It provides endpoints for managing clients, employees, moving jobs, surveys, and financial data.

## Architecture

The application follows a layered architecture:

```
Client Request → Router → Controller → Service → Model → Database
```

Key components:
- **Routes**: Define API endpoints
- **Controllers**: Handle HTTP requests/responses
- **Services**: Implement business logic
- **Models**: Define data structure and validation
- **Middleware**: Process requests (auth, validation, etc.)

## API Documentation

See the [API documentation](API_STANDARDIZATION.md) for details on endpoints, request/response formats, and authentication.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration.

4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-reloading:
   ```
   npm run dev
   ```

### Database Setup

The application will automatically set up the database structure when it first runs. See `models/index.js` for details.

For development, you can use the reset script to clear the database and create test data:
```
npm run reset-db
```

## Project Structure

```
backend/
├── config/            # Configuration files
│   ├── config.js      # Main app configuration
│   └── database.js    # Database connection settings
├── controllers/       # HTTP request handlers
├── middleware/        # Express middleware
│   ├── auth.js        # Authentication middleware
│   └── error.middleware.js # Global error handler
├── models/            # Mongoose models
├── routes/            # API routes
├── services/          # Business logic layer
│   ├── base.service.js      # Base service with common operations
│   ├── client.service.js    # Client-specific operations
│   ├── notification.service.js # Notification operations
│   ├── email.service.js     # Email functionality
│   └── task.service.js      # Task management operations
├── utils/             # Utility functions
│   ├── error.utils.js      # Error handling utilities
│   └── email.js            # Email sending functions
└── server.js          # Application entry point
```

## Features

- **Authentication**: JWT-based authentication with role-based access control
- **Client Management**: Create, read, update, and delete client records
- **Project Management**: Track moving projects and associated tasks
- **Employee Management**: Manage employee information and assignments
- **Survey System**: Create and manage moving surveys
- **Task System**: Assign and track tasks for employees
- **Notification System**: Send notifications to users
- **File Management**: Upload and manage documents
- **Financial Management**: Track job costs, invoices, and quotes

## Error Handling

The application uses a standardized error handling approach:

- Custom `AppError` class for operational errors
- Global error handler middleware
- Consistent error response format

## Data Models

Key data models include:

- **User**: System users with authentication
- **Client**: Customer information
- **Project**: Moving projects
- **Task**: Work tasks assigned to employees
- **Umzug (Move)**: Moving job details
- **Aufnahme (Survey)**: Pre-move survey information
- **Mitarbeiter (Employee)**: Employee details
- **Finanzuebersicht**: Financial overview
- **Benachrichtigung**: Notification system

## Development

### Code Style

The project follows a consistent code style:

- ES6+ syntax
- Async/await for asynchronous operations
- Service-oriented architecture
- Consistent error handling
- Descriptive variable and function names

### Adding New Features

1. Create or update models as needed
2. Create a service class with business logic
3. Create controller methods that use the service
4. Add routes in the appropriate router file
5. Update documentation

### Testing

Run tests:
```
npm test
```

## Deployment

For production deployment:

1. Set appropriate environment variables
2. Run database migrations if needed
3. Start the server:
   ```
   NODE_ENV=production npm start
   ```

## License

This project is proprietary. All rights reserved.