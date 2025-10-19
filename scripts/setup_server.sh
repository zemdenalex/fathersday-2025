#!/bin/bash

# Father's Day Ticker - Server Setup Script for Ubuntu 22.04
# Run with: sudo bash setup_server.sh

set -e

echo "=========================================="
echo "Father's Day Ticker - Server Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install basic utilities
echo "Installing utilities..."
apt-get install -y curl wget git build-essential ufw

# Create app user
echo "Creating app user..."
if id "app" &>/dev/null; then
    echo "User 'app' already exists"
else
    useradd -m -s /bin/bash app
    echo "User 'app' created"
fi

# Setup UFW firewall
echo "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "Firewall configured"

# Install Node.js 20.x
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

node --version
npm --version

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
apt-get install -y nginx

# Create directory structure
echo "Creating directory structure..."
mkdir -p /var/www/fathersday/{app,data/{photos/{original,variants},atlas,logs}}
chown -R app:app /var/www/fathersday
chmod -R 755 /var/www/fathersday

# Create Nginx configuration
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/fathersday << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain

    client_max_body_size 20M;

    # Serve static files
    location /uploads/ {
        alias /var/www/fathersday/data/photos/variants/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /atlas/ {
        alias /var/www/fathersday/data/atlas/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve frontend
    location / {
        root /var/www/fathersday/app/dist;
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/fathersday /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update domain in /etc/nginx/sites-available/fathersday"
echo "2. Deploy your application to /var/www/fathersday/app"
echo "3. Install SSL certificate:"
echo "   apt-get install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d yourdomain.com"
echo "4. Setup PM2 startup:"
echo "   su - app"
echo "   pm2 startup"
echo "   (follow the command it outputs)"
echo ""
echo "Directories:"
echo "  App:    /var/www/fathersday/app"
echo "  Data:   /var/www/fathersday/data"
echo "  Logs:   /var/www/fathersday/data/logs"
echo ""
