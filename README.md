# Father's Day Photo Ticker Website

A production-ready one-page website featuring an animated photo-tile ticker that spells "ПАПА СПАСИБО" with smooth 60fps WebGL rendering, rotating gratitude messages, and an interactive gallery.

## Features

- **Photo Mosaic Ticker**: Animated horizontal scroll with 60fps performance using Pixi.js
- **Interactive Tiles**: Hover/tap to enlarge individual photos with smooth transitions
- **Rotating Messages**: "ЗА {…}" line with colorful cycling words
- **Gallery**: Infinite scroll lightbox with zoom, keyboard navigation, and download
- **Admin Panel**: Upload photos, edit text, configure animations, rebuild atlas

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Pixi.js
- **Backend**: Node.js + Express + SQLite (better-sqlite3) + Sharp
- **Deploy**: PM2 + Nginx + Certbot (Let's Encrypt)
- **CI/CD**: GitHub Actions

---

## Quick Start (Development)

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Local Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd fathersday
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Initialize database**:
   ```bash
   npm run db:setup
   ```

4. **Add sample photos** (optional for development):
   ```bash
   mkdir -p data/photos/original
   # Copy your JPG/PNG files to data/photos/original/
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend dev server: `http://localhost:5173`
   - Backend API server: `http://localhost:3001`

6. **Build atlas** (after adding photos):
   - Navigate to `http://localhost:5173/admin`
   - Login with password from `.env` (`ADMIN_PASSWORD`)
   - Click "Rebuild Atlas" button

---

## Production Deployment

### Server Requirements

- Ubuntu 22.04 LTS
- 2GB+ RAM recommended
- Domain name pointed to server IP

### Initial Server Setup

1. **Run setup script** (as root or sudo):
   ```bash
   chmod +x scripts/setup_server.sh
   sudo ./scripts/setup_server.sh
   ```

   This script:
   - Creates `app` user
   - Installs Node.js 20.x, Nginx, Certbot, PM2
   - Sets up UFW firewall (ports 22, 80, 443)
   - Creates directory structure in `/var/www/fathersday/`

2. **Configure domain in Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/fathersday
   # Replace 'yourdomain.com' with your actual domain
   ```

3. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

4. **Deploy application**:
   ```bash
   # As 'app' user
   su - app
   cd /var/www/fathersday/app
   
   # Clone repository
   git clone <your-repo-url> .
   
   # Copy environment file
   cp .env.example .env
   nano .env  # Configure production settings
   
   # Run deployment script
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

5. **Setup PM2 to start on boot**:
   ```bash
   pm2 startup
   # Follow the command it outputs
   pm2 save
   ```

6. **Setup automated backups**:
   ```bash
   sudo chmod +x scripts/backup.sh
   sudo crontab -e
   # Add line:
   # 0 2 * * * /var/www/fathersday/app/scripts/backup.sh
   ```

### GitHub Actions Deployment

1. **Add secrets to GitHub repository**:
   - `VPS_HOST`: Your server IP or domain
   - `VPS_USER`: `app`
   - `VPS_SSH_KEY`: Private SSH key for the app user

2. **Push to main branch**:
   ```bash
   git push origin main
   ```

   The workflow will automatically:
   - SSH into server
   - Pull latest code
   - Build application
   - Reload PM2 process

---

## Admin Panel Usage

### Access

Navigate to: `https://yourdomain.com/admin`

Default password is set in `.env` as `ADMIN_PASSWORD`.

### Features

**1. Photo Management**
- Drag & drop multiple photos (JPG, PNG)
- Batch upload with progress indicator
- Automatic variant generation (AVIF, WebP, JPEG at 256, 512, 1024px)
- Color and brightness analysis for optimal tile placement

**2. Ticker Configuration**
- **Ticker Text**: Change the main text (default: "ПАПА СПАСИБО")
- **Scroll Speed**: Adjust pixels per second (default: 120)
- **Tile Base Size**: Base tile width in viewport width % (default: 2)
- **Glyph Scale**: Text mask resolution multiplier (default: 1.5)

**3. "ЗА {…}" Rotator**
- Edit the list of rotating words
- Add/remove/reorder items
- Configure transition timing (rotate-in, dwell)
- Customize color palette

**4. Atlas Management**
- **Rebuild Atlas**: Regenerate texture atlas after uploading photos
- **Reindex Photos**: Rescan photo directory and update database
- Status indicators for build progress

### Workflow

1. Upload photos via drag-drop
2. Wait for processing (variants + metadata)
3. Click "Rebuild Atlas" to generate spritesheet
4. Preview changes on main page
5. Adjust settings as needed

---

## Performance Tuning

### Ticker Performance Knobs

Exposed via Admin panel or `.env`:

- `PUBLIC_SCROLL_SPEED` (default: 120): Lower for slower scroll
- `PUBLIC_TILE_BASE_VW` (default: 2): Larger tiles = fewer sprites = better FPS
- `PUBLIC_GLYPH_SCALE` (default: 1.5): Lower for less detail but better performance
- `PUBLIC_FPS_TARGET` (default: 60): Reduce to 30 on slower devices

### Automatic Optimizations

The app automatically:
- Detects viewport size and adjusts tile density
- Uses GPU-accelerated sprite batching
- Implements texture atlasing to reduce draw calls
- Throttles updates if FPS drops below 24
- Lazy-loads gallery images with prefetching

### Manual Optimizations

If experiencing performance issues:

1. **Reduce photo count**: Keep under 50 photos for best results
2. **Increase tile size**: Admin → `tile_base_vw` to 2.5 or 3
3. **Simplify text**: Shorter text = fewer tiles
4. **Lower glyph scale**: Admin → `glyph_scale` to 1.0
5. **Check browser**: Use Chrome/Edge for best WebGL support

---

## Troubleshooting

### Ticker Not Loading

1. **Check atlas exists**:
   ```bash
   ls -la data/atlas/
   # Should contain atlas.json and atlas.webp
   ```

2. **Rebuild atlas**:
   - Admin panel → "Rebuild Atlas"
   - Or via CLI: `npm run atlas:rebuild`

3. **Check browser console** for errors

### Photos Not Appearing

1. **Verify photo upload**:
   ```bash
   ls -la data/photos/original/
   ```

2. **Check variants generated**:
   ```bash
   ls -la data/photos/variants/
   ```

3. **Reindex photos**: Admin panel → "Reindex"

### Performance Issues

1. **Check FPS monitor** (development mode):
   - Press `F` key to toggle FPS display

2. **Review PM2 logs**:
   ```bash
   pm2 logs fathersday
   ```

3. **Check memory usage**:
   ```bash
   pm2 monit
   ```

4. **Restart application**:
   ```bash
   pm2 restart fathersday
   ```

### Nginx Issues

1. **Check Nginx status**:
   ```bash
   sudo systemctl status nginx
   ```

2. **Test configuration**:
   ```bash
   sudo nginx -t
   ```

3. **View error logs**:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Restart Nginx**:
   ```bash
   sudo systemctl restart nginx
   ```

### SSL Certificate Issues

1. **Renew certificate manually**:
   ```bash
   sudo certbot renew
   ```

2. **Test auto-renewal**:
   ```bash
   sudo certbot renew --dry-run
   ```

### Reset Admin Password

1. **Edit `.env`**:
   ```bash
   nano .env
   # Change ADMIN_PASSWORD value
   ```

2. **Restart application**:
   ```bash
   pm2 restart fathersday
   ```

### Database Corruption

1. **Restore from backup**:
   ```bash
   cp /var/backups/fathersday/db-YYYY-MM-DD.sqlite data/db.sqlite
   ```

2. **Reinitialize database**:
   ```bash
   npm run db:reset
   npm run db:setup
   ```

---

## Project Structure

```
/
├── src/                      # Frontend React application
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── components/          # React components
│   ├── lib/                 # Utilities and Pixi.js logic
│   └── pages/               # Page components
├── server/                   # Backend Node.js application
│   ├── server.ts            # Express server
│   ├── db.ts                # Database connection
│   ├── schema.sql           # Database schema
│   ├── photos.ts            # Photo processing
│   ├── settings.ts          # Settings API
│   └── auth.ts              # Authentication middleware
├── scripts/                  # Deployment and maintenance scripts
├── data/                     # Runtime data (gitignored)
│   ├── photos/              # Original and variant images
│   ├── atlas/               # Generated texture atlas
│   └── db.sqlite            # SQLite database
└── dist/                     # Production build (gitignored)
```

---

## Environment Variables

See `.env.example` for all available options.

Key variables:

- `NODE_ENV`: `development` or `production`
- `PORT`: Backend server port (default: 3001)
- `ADMIN_PASSWORD`: Admin panel password
- `DATA_DIR`: Path to data directory (default: `./data`)
- `PUBLIC_TICKER_TEXT`: Default ticker text
- `PUBLIC_SCROLL_SPEED`: Scroll speed in pixels/second
- `PUBLIC_TILE_BASE_VW`: Tile base size in viewport width %

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npm run db:setup      # Initialize database
npm run db:seed       # Seed default data
npm run db:reset      # Reset database

# Atlas operations
npm run atlas:rebuild # Rebuild texture atlas
```

---

## License

Private project - All rights reserved

---

## Support

For issues or questions, check the troubleshooting section above or review logs:

- PM2 logs: `pm2 logs fathersday`
- Nginx logs: `/var/log/nginx/error.log`
- Application logs: `data/logs/app.log`
