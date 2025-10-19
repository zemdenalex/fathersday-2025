import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
// Import handlers
import { requireAuth, handleLogin, handleLogout } from './auth.js';
import { getSettings, getSettingValue, updateSettings, resetSettings, exportSettings, importSettings, } from './settings.js';
import { handleUpload, handleRebuildAtlas, handleReindexPhotos, getPhotos, getAtlas, } from './photos.js';
// Load environment variables
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATA_DIR = process.env.DATA_DIR || './data';
// Configure multer for file uploads
const upload = multer({
    dest: join(DATA_DIR, 'photos', 'original'),
    limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB
        files: 20,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp')
            .split(',');
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    },
});
// Security middleware
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    message: 'Too many requests, please try again later',
});
app.use('/api/', limiter);
// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parsing (simple implementation)
app.use((req, res, next) => {
    const cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = decodeURIComponent(value);
        });
    }
    req.cookies = cookies;
    next();
});
// Serve static files
app.use('/uploads', express.static(join(DATA_DIR, 'photos', 'variants')));
app.use('/atlas', express.static(join(DATA_DIR, 'atlas')));
// Public API routes (no auth required)
app.get('/api/settings', getSettings);
app.get('/api/settings/:key', getSettingValue);
app.get('/api/photos', getPhotos);
app.get('/api/atlas', getAtlas);
// Auth routes
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/logout', handleLogout);
// Admin API routes (auth required)
app.put('/api/admin/settings', requireAuth, updateSettings);
app.post('/api/admin/settings/reset', requireAuth, resetSettings);
app.get('/api/admin/settings/export', requireAuth, exportSettings);
app.post('/api/admin/settings/import', requireAuth, importSettings);
app.post('/api/admin/photos/upload', requireAuth, upload.array('photos', 20), handleUpload);
app.post('/api/admin/photos/reindex', requireAuth, handleReindexPhotos);
app.post('/api/admin/atlas/rebuild', requireAuth, handleRebuildAtlas);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
    });
});
// Serve frontend in production
if (NODE_ENV === 'production') {
    const distPath = join(__dirname, '..', 'dist');
    if (existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(join(distPath, 'index.html'));
        });
    }
}
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Father's Day Ticker Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: ${NODE_ENV}
Port:        ${PORT}
Data Dir:    ${DATA_DIR}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server ready at http://localhost:${PORT}
${NODE_ENV === 'development' ? 'Frontend dev server at http://localhost:5173' : ''}
  `);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
export default app;
