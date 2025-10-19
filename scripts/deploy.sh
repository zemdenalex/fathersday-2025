#!/bin/bash

# Father's Day Ticker - Deployment Script
# Run as app user: bash deploy.sh

set -e

APP_DIR="/var/www/fathersday/app"
DATA_DIR="/var/www/fathersday/data"

echo "=========================================="
echo "Deploying Father's Day Ticker"
echo "=========================================="
echo ""

# Change to app directory
cd "$APP_DIR"

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "Pulling latest code..."
    git pull origin main
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build frontend
echo "Building frontend..."
npm run build

# Build backend
echo "Building backend..."
npm run build:backend

# Ensure data directories exist
mkdir -p "$DATA_DIR"/{photos/{original,variants},atlas,logs}

# Copy/link data directory if needed
if [ ! -L "$APP_DIR/data" ]; then
    ln -sf "$DATA_DIR" "$APP_DIR/data"
fi

# Check if .env exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Warning: .env file not found!"
    echo "Please create .env from .env.example"
    exit 1
fi

# Initialize database if needed
if [ ! -f "$DATA_DIR/db.sqlite" ]; then
    echo "Initializing database..."
    npm run db:setup
fi

# Restart PM2 process
echo "Restarting application..."
if pm2 list | grep -q "fathersday"; then
    pm2 reload ecosystem.config.js
else
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Application status:"
pm2 list
echo ""
echo "View logs with: pm2 logs fathersday"
echo "Monitor with: pm2 monit"
echo ""
