#!/bin/bash

# Phase 1 & 2 Testing Script
# Testing Network Infrastructure and Normal Operations

echo "=========================================="
echo "PHASE 1 & 2 TEST EXECUTION"
echo "=========================================="
echo ""

# Phase 1 Test 1: Container Status
echo "📋 PHASE 1 TEST 1: Container Status"
echo "-----------------------------------"
docker-compose ps 2>&1 | grep -E "CONTAINER|voting" | head -20
echo ""

# Phase 1 Test 2: Database
echo "📋 PHASE 1 TEST 2: Database Connection"
echo "---------------------------------------"
docker-compose exec -T mysql mysql -u root -pvoting_root_pass -e "SELECT 'Database Connected' as Status;" 2>&1 | grep -v "Warning"
echo ""

# Phase 1 Test 3: Blockchain Node
echo "📋 PHASE 1 TEST 3: Blockchain Node"
echo "-----------------------------------"
curl -s http://localhost:3001/node 2>&1 | head -5
echo ""

# Phase 1 Test 4: Backend API
echo "📋 PHASE 1 TEST 4: Backend API"
echo "------------------------------"
curl -s http://localhost:3000/api/elections 2>&1 | head -5
echo ""

# Phase 2 Test 1: Create Election
echo "📋 PHASE 2 TEST 1: Create Election"
echo "----------------------------------"
curl -s -X POST http://localhost:3000/api/elections \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Election","description":"Phase 2 Test"}' 2>&1 | head -10
echo ""

# Phase 2 Test 2: Get Elections
echo "📋 PHASE 2 TEST 2: Get Elections"
echo "--------------------------------"
curl -s http://localhost:3000/api/elections 2>&1 | head -10
echo ""

# Phase 2 Test 3: Blockchain Status
echo "📋 PHASE 2 TEST 3: Blockchain Status"
echo "------------------------------------"
curl -s http://localhost:3001/blockchain 2>&1 | head -10
echo ""

echo "=========================================="
echo "TESTS COMPLETE"
echo "=========================================="
