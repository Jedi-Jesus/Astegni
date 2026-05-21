#!/bin/bash
# ============================================
# Astegni Cache Buster
# Run this after every production deployment:
#   ssh root@128.140.122.215 "cd /var/www/astegni && bash cache-bust.sh"
# ============================================

cd /var/www/astegni
VERSION="v$(date +%Y%m%d%H%M)"
echo "Busting cache with version: $VERSION"

# 1. Update already-versioned HTML refs (?v...)
find . -name "*.html" -exec sed -i "s|?v[^\"' >]*|?$VERSION|g" {} +
echo "✓ Updated existing versioned HTML refs"

# 2. Add version to unversioned local CSS refs in HTML
find . -name "*.html" -exec sed -i "s|href=\"\(\.\./\)*css/\([^\"?]*\)\.css\"|href=\"\1css/\2.css?$VERSION\"|g" {} +
echo "✓ Added version to unversioned CSS refs in HTML"

# 3. Add version to unversioned local JS refs in HTML
find . -name "*.html" -exec sed -i "s|src=\"\(\.\./\)*js/\([^\"?]*\)\.js\"|src=\"\1js/\2.js?$VERSION\"|g" {} +
echo "✓ Added version to unversioned JS refs in HTML"

# 4. Update already-versioned @import refs in CSS files
find ./css -name "*.css" -exec sed -i "s|\.css?v[^\"' )]*|.css?$VERSION|g" {} +
echo "✓ Updated existing versioned @import refs in CSS"

# 5. Add version to unversioned @import refs in CSS files
find ./css -name "*.css" -exec sed -i "s|@import url('\([^'?]*\)\.css')|@import url('\1.css?$VERSION')|g" {} +
echo "✓ Added version to unversioned @import refs in CSS"

# 6. Update already-versioned ?v... refs inside .js files
#    (catches dynamic script.src = '.../foo.js?vXXX' injections so they
#    don't regress to a stale URL the way kyc-verification-manager-v2.js did)
find ./js -name "*.js" -exec sed -i "s|\.js?v[0-9]*|.js?$VERSION|g" {} +
echo "✓ Updated existing versioned refs inside JS files"

echo ""
echo "Done! All assets cache-busted with: $VERSION"
