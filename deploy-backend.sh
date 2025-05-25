#!/bin/bash

# Backend-Only Deployment Script
# This script prepares the backend for standalone deployment

echo "🚀 Hummert Backend Deployment Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Parse command line arguments
DEPLOYMENT_TYPE=""
SKIP_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            DEPLOYMENT_TYPE="docker"
            shift
            ;;
        --pm2)
            DEPLOYMENT_TYPE="pm2"
            shift
            ;;
        --node)
            DEPLOYMENT_TYPE="node"
            shift
            ;;
        --skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./deploy-backend.sh [--docker|--pm2|--node] [--skip-install]"
            exit 1
            ;;
    esac
done

# Environment check
echo -e "\n📋 Checking environment..."

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | cut -dv -f2)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js $NODE_VERSION"
    else
        print_error "Node.js version must be 18 or higher. Found: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    exit 1
fi

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        print_warning "No .env file found. Copying from .env.production..."
        cp .env.production .env
        print_warning "Please edit .env file with your production values!"
        exit 1
    else
        print_error "No .env or .env.production file found!"
        exit 1
    fi
else
    print_success ".env file found"
fi

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
    echo -e "\n📦 Installing production dependencies..."
    npm ci --production
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_info "Skipping dependency installation"
fi

# Create necessary directories
echo -e "\n📁 Creating directories..."
mkdir -p uploads logs
print_success "Directories created"

# Deployment type selection
if [ -z "$DEPLOYMENT_TYPE" ]; then
    echo -e "\n🎯 Select deployment type:"
    echo "1) Node.js (direct)"
    echo "2) PM2 (process manager)"
    echo "3) Docker"
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1) DEPLOYMENT_TYPE="node" ;;
        2) DEPLOYMENT_TYPE="pm2" ;;
        3) DEPLOYMENT_TYPE="docker" ;;
        *) print_error "Invalid choice"; exit 1 ;;
    esac
fi

# Execute deployment
echo -e "\n🚀 Deploying with: $DEPLOYMENT_TYPE"

case $DEPLOYMENT_TYPE in
    "node")
        print_info "Starting with Node.js..."
        echo -e "\nRun: ${GREEN}npm start${NC}"
        echo "Or for background: ${GREEN}nohup npm start > logs/app.log 2>&1 &${NC}"
        ;;
        
    "pm2")
        if ! command -v pm2 >/dev/null 2>&1; then
            print_warning "PM2 not found. Installing..."
            npm install -g pm2
        fi
        
        print_info "Starting with PM2..."
        npm run start:pm2
        
        echo -e "\nUseful PM2 commands:"
        echo "  View logs: ${GREEN}pm2 logs${NC}"
        echo "  Monitor: ${GREEN}pm2 monit${NC}"
        echo "  Stop: ${GREEN}pm2 stop hummert-backend${NC}"
        echo "  Restart: ${GREEN}pm2 restart hummert-backend${NC}"
        ;;
        
    "docker")
        if ! command -v docker >/dev/null 2>&1; then
            print_error "Docker not installed!"
            exit 1
        fi
        
        print_info "Building Docker image..."
        npm run docker:build
        
        echo -e "\nRun with:"
        echo "  Docker: ${GREEN}npm run docker:run${NC}"
        echo "  Docker Compose: ${GREEN}npm run docker:compose${NC}"
        ;;
esac

# Post-deployment checks
echo -e "\n✅ Deployment preparation complete!"

# Health check
echo -e "\n🏥 Health check endpoint:"
echo "  ${GREEN}curl http://localhost:5000/api/health${NC}"

# Next steps
echo -e "\n📝 Next steps:"
echo "1. Verify environment variables in .env"
echo "2. Ensure MongoDB is accessible"
echo "3. Test the health endpoint"
echo "4. Set up reverse proxy (Nginx) for HTTPS"
echo "5. Configure firewall rules"
echo "6. Set up monitoring and backups"

# Security reminder
echo -e "\n🔒 Security reminders:"
echo "- Use strong JWT secrets"
echo "- Enable HTTPS in production"
echo "- Keep dependencies updated"
echo "- Monitor logs regularly"

print_success "Backend deployment setup complete!"