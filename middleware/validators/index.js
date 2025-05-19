// Export all validators from a single entry point
const authValidation = require('./auth.validators');
const umzugValidation = require('./umzug.validators');
const mitarbeiterValidation = require('./mitarbeiter.validators');
const finanzenValidation = require('./finanzen.validators');
const fileValidation = require('./file.validators');
const { validators, schemas, formatValidationErrors, createValidationMiddleware } = require('./common.validators');

module.exports = {
  // Auth validators
  auth: authValidation,
  
  // Umzug validators
  umzug: umzugValidation,
  
  // Mitarbeiter validators
  mitarbeiter: mitarbeiterValidation,
  
  // Finanzen validators
  finanzen: finanzenValidation,
  
  // File validators
  file: fileValidation,
  
  // Common validators and utilities
  common: {
    validators,
    schemas,
    formatValidationErrors,
    createValidationMiddleware
  }
};