# Email Utility Implementation

## Overview

This document explains the implementation of the email utility for the Hummert Umzug app backend.

## Issue Fixed

When trying to start the backend server, the following error occurred:
```
Error: Cannot find module '../utils/email'
```

This error occurred because the auth controller was trying to import a `sendEmail` function from a non-existent module.

## Solution

1. Created an email utility module at `/utils/email.js` with the following features:

   - **Basic Email Sending**: Implemented the `sendEmail` function that uses nodemailer to send emails
   - **Environment-Aware Configuration**: 
     - In production: Uses configured SMTP settings from environment variables
     - In development: Uses ethereal.email test accounts for easy testing
   - **HTML Templates**: Added a `createHtmlTemplate` function for consistent email styling
   - **Specialized Email Types**:
     - `sendPasswordResetEmail`: For password reset requests
     - `sendWelcomeEmail`: For new user registration

2. Usage in the Auth Controller:
   The email utility is currently used in the `resetPasswordRequest` function to send password reset emails.

## Configuration

The email utility looks for the following environment variables:

```
# Email configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@hummert-umzug.de
EMAIL_FROM_NAME=Hummert Umzug
```

## Development Testing

For development, the system automatically creates a test email account using ethereal.email. When an email is sent, a testing URL is printed to the console to view the email content.

## Example Usage

```javascript
// Import the email utility
const { sendEmail } = require('../utils/email');

// Send a basic email
await sendEmail({
  email: 'recipient@example.com',
  subject: 'Test Email',
  message: 'This is a test email',
  html: '<p>This is a <strong>HTML</strong> email</p>'
});

// Send a password reset email
const { sendPasswordResetEmail } = require('../utils/email');
await sendPasswordResetEmail({
  email: 'user@example.com',
  name: 'John Doe',
  resetUrl: 'https://example.com/reset-password/token123'
});
```

## Next Steps

Consider adding:
1. Email templates for notifications and other system communications
2. Email queue system for high-volume environments
3. Email verification system for new user registrations