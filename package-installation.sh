#!/bin/bash
# Install required dependencies for secure JWT implementation

echo "Installing required dependencies for secure JWT authentication..."

# Install rate limiting
npm install express-rate-limit

# Install session management
npm install express-session connect-mongo

# The following are already installed based on package.json:
# - jsonwebtoken
# - bcrypt
# - helmet
# - cors
# - express-validator
# - dotenv

echo "Dependencies installed successfully!"
echo "Please update your .env file with the secure configuration values."