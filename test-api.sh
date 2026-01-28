#!/bin/bash

# User Management API Test Script
# Usage: ./test-api.sh

BASE_URL="http://localhost:3000/api"
ADMIN_EMAIL="admin@workforce.com"
ADMIN_PASSWORD="admin123"

echo "========================================="
echo "User Management API - Quick Test Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
HEALTH=$(curl -s "$BASE_URL/health")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "$HEALTH" | python3 -m json.tool
else
    echo -e "${RED}✗ Backend is not running${NC}"
    exit 1
fi
echo ""

# Test 2: Login
echo -e "${BLUE}Test 2: Login (GET Token)${NC}"
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:50}..."
fi
echo ""

# Test 3: Get All Users
echo -e "${BLUE}Test 3: GET /users (All Users)${NC}"
USERS=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN")
echo "$USERS" | python3 -m json.tool
echo ""

# Test 4: Get Current User
echo -e "${BLUE}Test 4: GET /users/me (Current User)${NC}"
curl -s -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""

# Test 5: Get User Stats
echo -e "${BLUE}Test 5: GET /users/stats (Statistics)${NC}"
curl -s -X GET "$BASE_URL/users/stats" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""

# Test 6: Search Users
echo -e "${BLUE}Test 6: GET /users?search=admin (Search)${NC}"
curl -s -X GET "$BASE_URL/users?search=admin" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""

# Test 7: Filter by Role
echo -e "${BLUE}Test 7: GET /users?role=MANAGER (Filter by Role)${NC}"
curl -s -X GET "$BASE_URL/users?role=MANAGER" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""

# Test 8: Filter by Status
echo -e "${BLUE}Test 8: GET /users?isActive=true (Filter by Status)${NC}"
curl -s -X GET "$BASE_URL/users?isActive=true" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
echo ""

echo "========================================="
echo -e "${GREEN}All tests completed!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Open browser: http://localhost:5173"
echo "3. Login with: $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo "4. Navigate to Users page: /users"
echo ""
