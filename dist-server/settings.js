import { getDb, getSetting, setSetting, getAllSettings } from './db.js';
import { z } from 'zod';
/**
 * Schema for settings update
 */
const UpdateSettingsSchema = z.object({
    ticker_text: z.string().optional(),
    scroll_speed: z.number().min(10).max(500).optional(),
    scroll_direction: z.enum(['left', 'right']).optional(),
    tile_base_vw: z.number().min(0.5).max(10).optional(),
    glyph_scale: z.number().min(0.5).max(3).optional(),
    fps_target: z.number().min(24).max(120).optional(),
    za_words: z.array(z.string()).min(1).optional(),
    rotate_in_ms: z.number().min(100).max(3000).optional(),
    dwell_ms: z.number().min(500).max(5000).optional(),
    color_palette: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).min(3).optional(),
    auto_quality: z.boolean().optional(),
    min_fps: z.number().min(15).max(60).optional(),
});
/**
 * Get all settings
 */
export function getSettings(req, res) {
    try {
        const db = getDb();
        const settings = getAllSettings(db);
        db.close();
        res.json({ settings });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
}
/**
 * Get a specific setting
 */
export function getSettingValue(req, res) {
    try {
        const { key } = req.params;
        const db = getDb();
        const value = getSetting(db, key);
        db.close();
        if (value === null) {
            res.status(404).json({ error: 'Setting not found' });
            return;
        }
        res.json({ key, value });
    }
    catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
}
/**
 * Update settings
 */
export function updateSettings(req, res) {
    try {
        // Validate request body
        const validation = UpdateSettingsSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Invalid settings data',
                details: validation.error.flatten()
            });
            return;
        }
        const updates = validation.data;
        const db = getDb();
        try {
            // Update each setting
            for (const [key, value] of Object.entries(updates)) {
                let type = 'string';
                if (typeof value === 'number') {
                    type = 'number';
                }
                else if (typeof value === 'boolean') {
                    type = 'boolean';
                }
                else if (Array.isArray(value)) {
                    type = 'json';
                }
                setSetting(db, key, value, type);
            }
            const settings = getAllSettings(db);
            res.json({
                success: true,
                message: 'Settings updated successfully',
                settings
            });
        }
        finally {
            db.close();
        }
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
}
/**
 * Reset settings to defaults
 */
export function resetSettings(req, res) {
    try {
        const db = getDb();
        try {
            // Delete all settings
            db.prepare('DELETE FROM settings').run();
            // Re-seed default settings (import from seed.ts)
            import('./seed.js').then(({ seedSettings }) => {
                seedSettings();
                const settings = getAllSettings(db);
                res.json({
                    success: true,
                    message: 'Settings reset to defaults',
                    settings
                });
            });
        }
        finally {
            db.close();
        }
    }
    catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ error: 'Failed to reset settings' });
    }
}
/**
 * Export settings as JSON
 */
export function exportSettings(req, res) {
    try {
        const db = getDb();
        const settings = getAllSettings(db);
        db.close();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="settings.json"');
        res.send(JSON.stringify(settings, null, 2));
    }
    catch (error) {
        console.error('Error exporting settings:', error);
        res.status(500).json({ error: 'Failed to export settings' });
    }
}
/**
 * Import settings from JSON
 */
export function importSettings(req, res) {
    try {
        const validation = UpdateSettingsSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Invalid settings format',
                details: validation.error.flatten()
            });
            return;
        }
        const settings = validation.data;
        const db = getDb();
        try {
            for (const [key, value] of Object.entries(settings)) {
                let type = 'string';
                if (typeof value === 'number') {
                    type = 'number';
                }
                else if (typeof value === 'boolean') {
                    type = 'boolean';
                }
                else if (Array.isArray(value)) {
                    type = 'json';
                }
                setSetting(db, key, value, type);
            }
            const updatedSettings = getAllSettings(db);
            res.json({
                success: true,
                message: 'Settings imported successfully',
                settings: updatedSettings
            });
        }
        finally {
            db.close();
        }
    }
    catch (error) {
        console.error('Error importing settings:', error);
        res.status(500).json({ error: 'Failed to import settings' });
    }
}
export default {
    getSettings,
    getSettingValue,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
};
