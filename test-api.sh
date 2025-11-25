#!/bin/bash

# Haas Machine Simulator Test Script
# This script tests all API endpoints

echo "🏭 Testing Haas Machine Simulator API"
echo "======================================="
echo ""

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -e "${BLUE}Testing:${NC} $description"
    echo -e "${BLUE}Endpoint:${NC} $endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Success${NC} (HTTP $http_code)"
    else
        echo -e "${RED}✗ Failed${NC} (HTTP $http_code)"
    fi
    
    echo "Response preview:"
    echo "$body" | python3 -m json.tool 2>/dev/null | head -20 || echo "$body" | head -20
    echo ""
    echo "---"
    echo ""
}

# Test POST endpoint
test_post_endpoint() {
    local endpoint=$1
    local description=$2
    local data=$3
    
    echo -e "${BLUE}Testing:${NC} $description"
    echo -e "${BLUE}Endpoint:${NC} POST $endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Success${NC} (HTTP $http_code)"
    else
        echo -e "${RED}✗ Failed${NC} (HTTP $http_code)"
    fi
    
    echo "Response:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    echo "---"
    echo ""
}

# Check if server is running
echo "Checking if server is running..."
if curl -s "$BASE_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo "Please start the server with: npm start"
    exit 1
fi
echo ""
echo "---"
echo ""

# Test all GET endpoints
test_endpoint "/api/status" "Get complete machine status"
test_endpoint "/api/info" "Get machine information"
test_endpoint "/api/spindle" "Get spindle data"
test_endpoint "/api/axes" "Get axes data"
test_endpoint "/api/tools" "Get tools data"
test_endpoint "/api/alarms" "Get alarms"
test_endpoint "/api/maintenance" "Get maintenance info"
test_endpoint "/api/health" "Health check"

# Test POST endpoints
test_post_endpoint "/api/control/start" "Start program" '{"programName":"O1234"}'
sleep 2
test_post_endpoint "/api/control/stop" "Stop program" '{}'
test_post_endpoint "/api/control/clear-alarms" "Clear alarms" '{}'

echo ""
echo "======================================="
echo "🎉 Testing Complete!"
echo "======================================="
echo ""
echo "Next steps:"
echo "1. Start the mobile app: cd ../mobile-app && npm run ios"
echo "2. Or test WebSocket: Use a WebSocket client to connect to ws://localhost:3000"
echo ""
