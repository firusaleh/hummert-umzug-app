#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting API Test Suite${NC}"
echo "========================="

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
SERVER_STATUS=$(curl -s http://localhost:5000/api/health || echo "failed")

if [[ "$SERVER_STATUS" == "failed" ]]; then
    echo -e "${RED}Server is not running. Starting server...${NC}"
    npm start &
    SERVER_PID=$!
    sleep 5
else
    echo -e "${GREEN}Server is already running${NC}"
fi

# Install required packages if not present
if ! npm list axios &>/dev/null; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    npm install --save-dev axios colors
fi

# Run the tests
echo -e "${YELLOW}Running API tests...${NC}"
node test-api-endpoints.js

# Capture test exit code
TEST_EXIT_CODE=$?

# Kill server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo -e "${YELLOW}Stopping test server...${NC}"
    kill $SERVER_PID
fi

# Exit with the test exit code
exit $TEST_EXIT_CODE