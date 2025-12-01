#!/bin/bash

# Verification Script for Rejected Course Reconsider Button Fix
# This script checks if both frontend and backend fixes are in place

echo "=========================================="
echo "Reconsider Button Fix Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Frontend fix - status inference logic
echo "1. Checking Frontend Fix (status inference)..."
if grep -q "Set status to rejected based on endpoint" "js/admin-pages/manage-courses-standalone.js"; then
    echo -e "${GREEN}✅ PASS${NC} - Frontend status inference code found"
    FRONTEND_FIX=1
else
    echo -e "${RED}❌ FAIL${NC} - Frontend status inference code NOT found"
    echo "   Expected: 'Set status to rejected based on endpoint' in manage-courses-standalone.js"
    FRONTEND_FIX=0
fi

# Check 2: Frontend fix - Reconsider button logic
echo ""
echo "2. Checking Frontend Fix (Reconsider button)..."
if grep -q "Added rejected course Reconsider button" "js/admin-pages/manage-courses-standalone.js"; then
    echo -e "${GREEN}✅ PASS${NC} - Reconsider button logic found"
    FRONTEND_BUTTON=1
else
    echo -e "${RED}❌ FAIL${NC} - Reconsider button logic NOT found"
    FRONTEND_BUTTON=0
fi

# Check 3: Backend fix - status field in response
echo ""
echo "3. Checking Backend Fix (status field)..."
if grep -q '"status": "rejected"' "astegni-backend/course_management_endpoints.py"; then
    echo -e "${GREEN}✅ PASS${NC} - Backend status field found in rejected courses endpoint"
    BACKEND_FIX=1
else
    echo -e "${RED}❌ FAIL${NC} - Backend status field NOT found"
    echo "   Expected: '\"status\": \"rejected\"' in course_management_endpoints.py"
    BACKEND_FIX=0
fi

# Check 4: reconsiderCourseRequest function exists
echo ""
echo "4. Checking reconsiderCourseRequest function..."
if grep -q "window.reconsiderCourseRequest = async function" "js/admin-pages/manage-courses-standalone.js"; then
    echo -e "${GREEN}✅ PASS${NC} - reconsiderCourseRequest function exists"
    FUNCTION_EXISTS=1
else
    echo -e "${RED}❌ FAIL${NC} - reconsiderCourseRequest function NOT found"
    FUNCTION_EXISTS=0
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

TOTAL_CHECKS=$((FRONTEND_FIX + FRONTEND_BUTTON + BACKEND_FIX + FUNCTION_EXISTS))

if [ $TOTAL_CHECKS -eq 4 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED (4/4)${NC}"
    echo ""
    echo "The Reconsider button fix is complete and ready to test!"
    echo ""
    echo "Next steps:"
    echo "1. Restart backend: cd astegni-backend && python app.py"
    echo "2. Start frontend: python -m http.server 8080"
    echo "3. Navigate to: http://localhost:8080/admin-pages/manage-courses.html"
    echo "4. Go to 'Rejected Courses' panel and click 'View Details'"
    echo "5. Verify GREEN 'Reconsider' button appears in modal"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED ($TOTAL_CHECKS/4)${NC}"
    echo ""
    echo "Please review the failed checks above and ensure:"
    echo "1. js/admin-pages/manage-courses-standalone.js is updated (lines 440-449, 546-556)"
    echo "2. astegni-backend/course_management_endpoints.py is updated (line 428)"
    echo ""
    echo "See REJECTED-COURSES-RECONSIDER-FIX-COMPLETE.md for details"
    exit 1
fi
