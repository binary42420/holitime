#!/bin/bash

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "📋 Node.js version: $(node --version)"
echo "📋 npm version: $(npm --version)"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm ci --legacy-peer-deps

echo "🔧 Verifying the dateFilter fix..."
if grep -q "const dateFilter = searchParams.get('filter')" src/app/api/shifts/by-date/route.ts; then
    echo "✅ dateFilter fix is in place"
else
    echo "❌ dateFilter fix missing, applying it now..."
    # Apply the fix manually
    sed -i "/const searchTerm = searchParams.get('search') || '';/a\\    const dateFilter = searchParams.get('filter') || 'today';" src/app/api/shifts/by-date/route.ts
fi

echo "🔍 Checking for other potential issues..."

# Check if client services exist
echo "📋 Checking client services..."
if [ -f "src/lib/services/clients.ts" ]; then
    echo "✅ Client services file exists"
    # Check if getClientById function exists
    if grep -q "getClientById" src/lib/services/clients.ts; then
        echo "✅ getClientById function exists"
    else
        echo "⚠️  getClientById function might be missing"
    fi
else
    echo "❌ Client services file missing"
fi

# Check middleware for authentication issues
echo "📋 Checking authentication middleware..."
if [ -f "src/lib/middleware.ts" ]; then
    echo "✅ Middleware file exists"
    if grep -q "getCurrentUser" src/lib/middleware.ts; then
        echo "✅ getCurrentUser function exists"
    else
        echo "⚠️  getCurrentUser function might be missing"
    fi
else
    echo "❌ Middleware file missing"
fi

echo "🎯 All checks completed!"