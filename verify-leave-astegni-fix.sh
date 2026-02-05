#!/bin/bash
# Verification script for Leave Astegni Modal fix
# Run this to confirm all changes were applied correctly

echo "==========================================="
echo "Leave Astegni Modal - Fix Verification"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if JS file exists in new location
echo -n "1. Checking if JS file moved to common-modals... "
if [ -f "js/common-modals/leave-astegni-modal.js" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   File not found at: js/common-modals/leave-astegni-modal.js"
fi

# Check if old file is gone
echo -n "2. Checking if old file removed from tutor-profile... "
if [ ! -f "js/tutor-profile/leave-astegni-modal.js" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Old file still exists at: js/tutor-profile/leave-astegni-modal.js"
fi

# Check indentation is fixed (first line should not start with spaces)
echo -n "3. Checking if indentation is fixed... "
first_line=$(head -n 1 "js/common-modals/leave-astegni-modal.js")
if [[ "$first_line" =~ ^[^\ ] ]]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   First line still has leading spaces"
fi

# Check all profile pages reference new path
echo ""
echo "Checking all profile pages reference new path:"

declare -a pages=("advertiser-profile" "parent-profile" "student-profile" "tutor-profile" "user-profile")
all_pages_ok=true

for page in "${pages[@]}"
do
    echo -n "   - ${page}.html... "
    if grep -q "js/common-modals/leave-astegni-modal.js?v=20260127" "profile-pages/${page}.html"; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
        all_pages_ok=false
    fi
done

# Check modal HTML exists
echo ""
echo -n "4. Checking if modal HTML exists... "
if [ -f "modals/common-modals/leave-astegni-modal.html" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   File not found at: modals/common-modals/leave-astegni-modal.html"
fi

# Final summary
echo ""
echo "==========================================="
echo "Verification Complete"
echo "==========================================="
echo ""

if [ "$all_pages_ok" = true ]; then
    echo -e "${GREEN}✅ All checks passed! The fix is properly applied.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Clear your browser cache (Ctrl+Shift+R)"
    echo "2. Open any profile page"
    echo "3. Click 'Leave Astegni' card"
    echo "4. Modal should open successfully!"
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
fi

echo ""
