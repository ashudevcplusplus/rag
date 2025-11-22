#!/bin/bash

# Phase A Quick Verification Script
# Verifies that all Phase A components are ready

set -e

echo "🔍 Phase A Verification Script"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if API is running
echo ""
echo "1. Checking API health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API is not running${NC}"
    echo "  Start with: docker-compose up -d OR npm start"
    exit 1
fi

# Check if test data exists
echo ""
echo "2. Checking test data..."
if [ -f "api/test-data/1mb.txt" ]; then
    SIZE=$(ls -lh api/test-data/1mb.txt | awk '{print $5}')
    echo -e "${GREEN}✓ Test data exists (${SIZE})${NC}"
else
    echo -e "${RED}✗ Test data not found${NC}"
    echo "  Generate with: npm run generate:test-data"
    exit 1
fi

# Check lib files
echo ""
echo "3. Checking helper libraries..."
LIBS=("uploader.ts" "index-wait.ts" "metrics.ts")
for lib in "${LIBS[@]}"; do
    if [ -f "api/scripts/lib/${lib}" ]; then
        echo -e "   ${GREEN}✓ lib/${lib}${NC}"
    else
        echo -e "   ${RED}✗ lib/${lib} missing${NC}"
        exit 1
    fi
done

# Check main test runner
echo ""
echo "4. Checking test runner..."
if [ -f "api/scripts/test-large-data.ts" ]; then
    echo -e "${GREEN}✓ test-large-data.ts exists${NC}"
else
    echo -e "${RED}✗ test-large-data.ts missing${NC}"
    exit 1
fi

# Check npm scripts
echo ""
echo "5. Checking npm scripts..."
if grep -q "test:large" api/package.json; then
    echo -e "${GREEN}✓ npm run test:large configured${NC}"
else
    echo -e "${RED}✗ npm run test:large not configured${NC}"
    exit 1
fi

if grep -q "generate:test-data" api/package.json; then
    echo -e "${GREEN}✓ npm run generate:test-data configured${NC}"
else
    echo -e "${RED}✗ npm run generate:test-data not configured${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ All Phase A components verified!${NC}"
echo ""
echo "🚀 Ready to run:"
echo "   npm run test:large -- --mode=smoke"
echo ""

