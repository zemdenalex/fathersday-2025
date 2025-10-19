-- Settings table for configurable values
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'json', 'boolean'
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photos table for image metadata
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  original_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  avg_color_r INTEGER NOT NULL,
  avg_color_g INTEGER NOT NULL,
  avg_color_b INTEGER NOT NULL,
  luma REAL NOT NULL, -- perceived brightness 0-255
  saturation REAL NOT NULL, -- color saturation 0-1
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photo variants (different sizes and formats)
CREATE TABLE IF NOT EXISTS photo_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  size INTEGER NOT NULL, -- 256, 512, 1024
  format TEXT NOT NULL, -- 'avif', 'webp', 'jpeg'
  path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  UNIQUE(photo_id, size, format)
);

-- Atlas metadata
CREATE TABLE IF NOT EXISTS atlas (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row
  json_path TEXT NOT NULL,
  image_path TEXT NOT NULL,
  tile_count INTEGER NOT NULL,
  atlas_width INTEGER NOT NULL,
  atlas_height INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions (simple session tracking)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photos_luma ON photos(luma);
CREATE INDEX IF NOT EXISTS idx_photos_saturation ON photos(saturation);
CREATE INDEX IF NOT EXISTS idx_photo_variants_photo_id ON photo_variants(photo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
