import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = join(DATA_DIR, 'db.sqlite');

/**
 * Initialize and return a SQLite database connection
 */
export function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

/**
 * Initialize database schema
 */
export function initializeDb(): void {
  const db = getDb();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  
  // Execute schema
  db.exec(schema);
  
  console.log('Database initialized successfully');
  db.close();
}

/**
 * Get a setting value from the database
 */
export function getSetting(db: Database.Database, key: string): any {
  const row = db.prepare('SELECT value, type FROM settings WHERE key = ?').get(key) as 
    { value: string; type: string } | undefined;
  
  if (!row) return null;
  
  switch (row.type) {
    case 'number':
      return parseFloat(row.value);
    case 'boolean':
      return row.value === 'true';
    case 'json':
      return JSON.parse(row.value);
    default:
      return row.value;
  }
}

/**
 * Set a setting value in the database
 */
export function setSetting(
  db: Database.Database,
  key: string,
  value: any,
  type: 'string' | 'number' | 'boolean' | 'json' = 'string',
  description?: string
): void {
  const stringValue = type === 'json' ? JSON.stringify(value) : String(value);
  
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, type, description, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      type = excluded.type,
      description = COALESCE(excluded.description, description),
      updated_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(key, stringValue, type, description || null);
}

/**
 * Get all settings as an object
 */
export function getAllSettings(db: Database.Database): Record<string, any> {
  const rows = db.prepare('SELECT key, value, type FROM settings').all() as 
    Array<{ key: string; value: string; type: string }>;
  
  const settings: Record<string, any> = {};
  
  for (const row of rows) {
    switch (row.type) {
      case 'number':
        settings[row.key] = parseFloat(row.value);
        break;
      case 'boolean':
        settings[row.key] = row.value === 'true';
        break;
      case 'json':
        settings[row.key] = JSON.parse(row.value);
        break;
      default:
        settings[row.key] = row.value;
    }
  }
  
  return settings;
}

export default { getDb, initializeDb, getSetting, setSetting, getAllSettings };
