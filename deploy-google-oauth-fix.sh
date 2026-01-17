#!/bin/bash
# Google OAuth Production Deployment Script
# Run this on the production server (128.140.122.215)

set -e  # Exit on error

echo "================================================"
echo "Google OAuth Production Fix Deployment"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Backup current .env file${NC}"
cd /var/www/astegni/astegni-backend
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Update .env file for production${NC}"
echo "Current GOOGLE_REDIRECT_URI setting:"
grep "GOOGLE_REDIRECT_URI" .env || echo "Not found"
echo ""

# Update or add GOOGLE_REDIRECT_URI
if grep -q "^GOOGLE_REDIRECT_URI=" .env; then
    # Update existing
    sed -i 's|^GOOGLE_REDIRECT_URI=.*|GOOGLE_REDIRECT_URI=https://astegni.com|' .env
    echo -e "${GREEN}✓ Updated GOOGLE_REDIRECT_URI to https://astegni.com${NC}"
else
    # Add new
    echo "GOOGLE_REDIRECT_URI=https://astegni.com" >> .env
    echo -e "${GREEN}✓ Added GOOGLE_REDIRECT_URI=https://astegni.com${NC}"
fi

# Update or add ENVIRONMENT
if grep -q "^ENVIRONMENT=" .env; then
    sed -i 's|^ENVIRONMENT=.*|ENVIRONMENT=production|' .env
    echo -e "${GREEN}✓ Updated ENVIRONMENT to production${NC}"
else
    echo "ENVIRONMENT=production" >> .env
    echo -e "${GREEN}✓ Added ENVIRONMENT=production${NC}"
fi
echo ""

echo -e "${YELLOW}Step 3: Verify updated configuration${NC}"
echo "New settings:"
grep "GOOGLE_REDIRECT_URI" .env
grep "ENVIRONMENT" .env
grep "GOOGLE_CLIENT_ID" .env | head -c 80
echo "..."
echo ""

echo -e "${YELLOW}Step 4: Restart backend service${NC}"
systemctl restart astegni-backend
sleep 3
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

echo -e "${YELLOW}Step 5: Check service status${NC}"
if systemctl is-active --quiet astegni-backend; then
    echo -e "${GREEN}✓ Backend service is running${NC}"
    systemctl status astegni-backend --no-pager | head -n 10
else
    echo -e "${RED}✗ Backend service is not running!${NC}"
    echo "Check logs:"
    journalctl -u astegni-backend -n 50 --no-pager
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 6: Test OAuth configuration endpoint${NC}"
sleep 2
RESPONSE=$(curl -s https://api.astegni.com/api/oauth/google/config)
echo "Response from /api/oauth/google/config:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Verify redirect URI in response
if echo "$RESPONSE" | grep -q "https://astegni.com"; then
    echo -e "${GREEN}✓ Redirect URI is correctly set to https://astegni.com${NC}"
else
    echo -e "${RED}✗ Warning: Redirect URI might not be correct${NC}"
    echo "Expected: https://astegni.com"
fi
echo ""

echo -e "${YELLOW}Step 7: Test OAuth status endpoint${NC}"
STATUS_RESPONSE=$(curl -s https://api.astegni.com/api/oauth/google/status)
echo "Response from /api/oauth/google/status:"
echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Go to https://console.cloud.google.com/apis/credentials"
echo "2. Select your OAuth 2.0 Client ID"
echo "3. Add these Authorized JavaScript origins:"
echo "   - https://astegni.com"
echo "   - https://www.astegni.com"
echo "4. Add these Authorized redirect URIs:"
echo "   - https://astegni.com"
echo "   - https://www.astegni.com"
echo "5. Click SAVE"
echo ""
echo "Then test on: https://astegni.com"
echo ""
echo "To view logs: journalctl -u astegni-backend -f"
echo "To rollback: cp .env.backup.* .env && systemctl restart astegni-backend"
