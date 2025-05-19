#!/bin/bash

# Deployment Script for Hummert Umzug Application
# This script helps prepare the application for deployment

echo "🚀 Hummert Umzug Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
echo -e "\n📋 Checking prerequisites..."

if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    exit 1
fi

if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

if command_exists git; then
    GIT_VERSION=$(git --version)
    print_success "Git installed: $GIT_VERSION"
else
    print_error "Git is not installed"
    exit 1
fi

# Check Node version
NODE_MAJOR_VERSION=$(node -v | cut -d. -f1 | cut -dv -f2)
if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current version: $NODE_VERSION"
    exit 1
fi

# Environment setup
echo -e "\n🔧 Setting up environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    cat > .env.example << EOL
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
PORT=5000
NODE_ENV=production

# Security
ALLOWED_ORIGINS=https://www.lagerlogix.de
SESSION_SECRET=your-session-secret-here

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/uploads

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
EOL
    print_success "Created .env.example file"
    print_warning "Please copy .env.example to .env and fill in your values"
    exit 1
else
    print_success ".env file found"
fi

# Install dependencies
echo -e "\n📦 Installing dependencies..."
npm install --production
if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Create necessary directories
echo -e "\n📁 Creating directories..."
mkdir -p uploads
mkdir -p logs
print_success "Directories created"

# Build frontend (if in monorepo)
if [ -d "../frontend" ]; then
    echo -e "\n🏗️  Building frontend..."
    cd ../frontend
    npm install
    npm run build
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    cd ../backend
else
    print_warning "Frontend directory not found. Skipping frontend build."
fi

# Database setup
echo -e "\n🗄️  Database setup..."
print_warning "Make sure your MongoDB instance is running and accessible"
print_warning "Run 'npm run migrate' if you have migration scripts"

# Security checks
echo -e "\n🔒 Security checks..."

# Check for sensitive data in git
if git grep -q "JWT_SECRET\|MONGODB_URI\|SMTP_PASS" --cached; then
    print_error "Sensitive data found in git repository!"
    print_warning "Please remove sensitive data from tracked files"
else
    print_success "No sensitive data in git repository"
fi

# Create deployment info
echo -e "\n📄 Creating deployment info..."
cat > deployment-info.json << EOL
{
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "nodeVersion": "$NODE_VERSION",
  "npmVersion": "$NPM_VERSION",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOL
print_success "Deployment info created"

# Final checks
echo -e "\n✅ Deployment preparation complete!"
echo -e "\n📝 Next steps:"
echo "1. Configure environment variables in your hosting platform"
echo "2. Set up MongoDB connection"
echo "3. Configure SSL/TLS certificates"
echo "4. Set up monitoring and logging"
echo "5. Deploy the application"

echo -e "\n🚀 Deployment commands:"
echo "   Heroku: git push heroku main"
echo "   Railway: railway up"
echo "   PM2: pm2 start server.js --name hummert-umzug"

echo -e "\n📖 For detailed deployment instructions, see DEPLOYMENT_CONFIG_REPORT.md"