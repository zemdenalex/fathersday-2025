import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { initializeDb, getDb, setSetting } from './db.js';
const DATA_DIR = process.env.DATA_DIR || './data';
/**
 * Create necessary directories
 */
function createDirectories() {
    const dirs = [
        DATA_DIR,
        join(DATA_DIR, 'photos'),
        join(DATA_DIR, 'photos', 'original'),
        join(DATA_DIR, 'photos', 'variants'),
        join(DATA_DIR, 'atlas'),
        join(DATA_DIR, 'logs'),
    ];
    for (const dir of dirs) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    }
}
/**
 * Seed default settings
 */
function seedSettings() {
    const db = getDb();
    try {
        // Ticker settings
        setSetting(db, 'ticker_text', process.env.PUBLIC_TICKER_TEXT || 'ПАПА СПАСИБО', 'string', 'Main ticker text to display');
        setSetting(db, 'scroll_speed', parseFloat(process.env.PUBLIC_SCROLL_SPEED || '120'), 'number', 'Scroll speed in pixels per second');
        setSetting(db, 'scroll_direction', 'right', 'string', 'Scroll direction: "left" or "right"');
        setSetting(db, 'tile_base_vw', parseFloat(process.env.PUBLIC_TILE_BASE_VW || '2'), 'number', 'Base tile size in viewport width percentage');
        setSetting(db, 'glyph_scale', parseFloat(process.env.PUBLIC_GLYPH_SCALE || '1.5'), 'number', 'Glyph mask resolution multiplier');
        setSetting(db, 'fps_target', parseInt(process.env.PUBLIC_FPS_TARGET || '60'), 'number', 'Target frames per second');
        // ZA rotator settings
        setSetting(db, 'za_words', [
            'ЛЮБОВЬ',
            'ЗАБОТУ',
            'МУДРОСТЬ',
            'ПОДДЕРЖКУ',
            'СИЛУ',
            'ТЕРПЕНИЕ',
            'ПРИМЕР',
            'ВДОХНОВЕНИЕ',
        ], 'json', 'Words to rotate in "ЗА {...}" line');
        setSetting(db, 'rotate_in_ms', parseInt(process.env.PUBLIC_ROTATE_IN_MS || '800'), 'number', 'Transition duration for word rotation in milliseconds');
        setSetting(db, 'dwell_ms', parseInt(process.env.PUBLIC_DWELL_MS || '1500'), 'number', 'Dwell time for each word in milliseconds');
        // Color palette (accessible colors for dark theme)
        setSetting(db, 'color_palette', [
            '#FF6B6B', // Red
            '#FFA94D', // Orange
            '#FFD93D', // Yellow
            '#6BCF7F', // Green
            '#4ECDC4', // Teal
            '#45B7D1', // Cyan
            '#6C5CE7', // Purple
            '#FF6FD8', // Pink
            '#FF8B94', // Coral
            '#95E1D3', // Mint
        ], 'json', 'Color palette for rotating words');
        // Performance settings
        setSetting(db, 'auto_quality', true, 'boolean', 'Automatically adjust quality based on device performance');
        setSetting(db, 'min_fps', 24, 'number', 'Minimum acceptable FPS before quality reduction');
        console.log('Default settings seeded successfully');
    }
    finally {
        db.close();
    }
}
/**
 * Main seed function
 */
async function seed() {
    try {
        console.log('Starting database setup...');
        // Create directories
        createDirectories();
        // Initialize database schema
        initializeDb();
        // Seed default data
        seedSettings();
        console.log('\n✅ Database setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Add photos to data/photos/original/');
        console.log('2. Start the app: npm run dev');
        console.log('3. Visit /admin to upload photos and rebuild atlas');
    }
    catch (error) {
        console.error('Error during database setup:', error);
        process.exit(1);
    }
}
// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seed();
}
export { seed, createDirectories, seedSettings };
