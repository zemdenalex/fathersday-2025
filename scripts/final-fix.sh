#!/bin/bash

# Final Build & Deployment Fix
# Fixes TypeScript unused parameters and PM2 config issues

set -e

echo "=========================================="
echo "Applying Final Fixes"
echo "=========================================="
echo ""

cd /var/www/fathersday/app

# Fix 1: Update tsconfig.server.json to allow unused parameters
echo "1. Fixing backend TypeScript config..."
cat > tsconfig.server.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist-server",
    "rootDir": "./server",
    "noEmit": false,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "noUnusedParameters": false,
    "noUnusedLocals": false
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules", "dist", "dist-server"]
}
EOF
echo "  ✓ Fixed"

# Fix 2: Rename PM2 config to .cjs for CommonJS compatibility
echo ""
echo "2. Fixing PM2 config..."
if [ -f "ecosystem.config.js" ]; then
    mv ecosystem.config.js ecosystem.config.cjs
    echo "  ✓ Renamed ecosystem.config.js → ecosystem.config.cjs"
else
    echo "  ✓ Already renamed"
fi

# Fix 3: Initialize database if needed
echo ""
echo "3. Checking database..."
if [ ! -f "data/db.sqlite" ]; then
    echo "  Database not found, initializing..."
    npm run db:setup
    echo "  ✓ Database initialized"
else
    echo "  ✓ Database exists"
fi

# Rebuild application
echo ""
echo "4. Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "  ✓ Build successful!"
else
    echo "  ✗ Build failed"
    exit 1
fi

# Start/restart PM2
echo ""
echo "5. Starting application with PM2..."
if pm2 list | grep -q "fathersday"; then
    echo "  Reloading existing process..."
    pm2 reload ecosystem.config.cjs
else
    echo "  Starting new process..."
    pm2 start ecosystem.config.cjs
fi

pm2 save

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Application Status:"
pm2 list
echo ""
echo "View logs: pm2 logs fathersday"
echo "Monitor: pm2 monit"
echo ""
