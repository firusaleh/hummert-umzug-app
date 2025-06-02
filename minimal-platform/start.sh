#!/bin/bash

echo "🚀 Starting Minimal Hummert Umzug Platform"
echo "========================================"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null
then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Linux: sudo systemctl start mongod"
    exit 1
fi

echo "✅ MongoDB is running"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Start backend in background
echo ""
echo "🔧 Starting backend server..."
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Start frontend
echo ""
echo "🎨 Starting frontend development server..."
echo ""
echo "========================================"
echo "✨ Platform is starting up!"
echo ""
echo "Backend: http://localhost:5001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Default credentials:"
echo "Email: admin@example.com"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"
echo ""

npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT