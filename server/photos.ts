import sharp from 'sharp';
import { Request, Response } from 'express';
import { getDb } from './db.js';
import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const ORIGINAL_DIR = join(DATA_DIR, 'photos', 'original');
const VARIANTS_DIR = join(DATA_DIR, 'photos', 'variants');
const ATLAS_DIR = join(DATA_DIR, 'atlas');

const VARIANT_SIZES = [256, 512, 1024];
const ATLAS_TILE_SIZE = 128;
const ATLAS_MAX_SIZE = 4096;

interface PhotoMetadata {
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  avgColor: { r: number; g: number; b: number };
  luma: number;
  saturation: number;
}

/**
 * Calculate perceived brightness (luma) from RGB
 */
function calculateLuma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Calculate color saturation
 */
function calculateSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  if (max === 0) return 0;
  return delta / max;
}

/**
 * Analyze image and extract metadata
 */
async function analyzeImage(imagePath: string): Promise<PhotoMetadata> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const stats = await image.stats();
  
  // Calculate average color from dominant channel
  const avgR = Math.round(stats.channels[0].mean);
  const avgG = Math.round(stats.channels[1].mean);
  const avgB = Math.round(stats.channels[2].mean);
  
  const luma = calculateLuma(avgR, avgG, avgB);
  const saturation = calculateSaturation(avgR, avgG, avgB);
  
  const fileStat = await stat(imagePath);
  
  return {
    filename: basename(imagePath),
    width: metadata.width!,
    height: metadata.height!,
    fileSize: fileStat.size,
    mimeType: `image/${metadata.format}`,
    avgColor: { r: avgR, g: avgG, b: avgB },
    luma,
    saturation,
  };
}

/**
 * Generate image variants in different sizes and formats
 */
async function generateVariants(originalPath: string, photoId: number): Promise<void> {
  const db = getDb();
  
  try {
    const filename = basename(originalPath, extname(originalPath));
    
    for (const size of VARIANT_SIZES) {
      // Create AVIF variant
      const avifPath = join(VARIANTS_DIR, `${filename}_${size}.avif`);
      const avifBuffer = await sharp(originalPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .avif({ quality: 80 })
        .toBuffer();
      await writeFile(avifPath, avifBuffer);
      
      // Create WebP variant
      const webpPath = join(VARIANTS_DIR, `${filename}_${size}.webp`);
      const webpBuffer = await sharp(originalPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();
      await writeFile(webpPath, webpBuffer);
      
      // Create JPEG fallback
      const jpegPath = join(VARIANTS_DIR, `${filename}_${size}.jpg`);
      const jpegBuffer = await sharp(originalPath)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toBuffer();
      await writeFile(jpegPath, jpegBuffer);
      
      // Store variant metadata
      db.prepare(`
        INSERT INTO photo_variants (photo_id, size, format, path, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).run(photoId, size, 'avif', avifPath, avifBuffer.length);
      
      db.prepare(`
        INSERT INTO photo_variants (photo_id, size, format, path, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).run(photoId, size, 'webp', webpPath, webpBuffer.length);
      
      db.prepare(`
        INSERT INTO photo_variants (photo_id, size, format, path, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).run(photoId, size, 'jpeg', jpegPath, jpegBuffer.length);
    }
  } finally {
    db.close();
  }
}

/**
 * Process uploaded photo
 */
export async function processPhoto(originalPath: string): Promise<number> {
  const db = getDb();
  
  try {
    // Analyze image
    const metadata = await analyzeImage(originalPath);
    
    // Store photo metadata
    const result = db.prepare(`
      INSERT INTO photos (
        filename, original_path, width, height, file_size, mime_type,
        avg_color_r, avg_color_g, avg_color_b, luma, saturation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      metadata.filename,
      originalPath,
      metadata.width,
      metadata.height,
      metadata.fileSize,
      metadata.mimeType,
      metadata.avgColor.r,
      metadata.avgColor.g,
      metadata.avgColor.b,
      metadata.luma,
      metadata.saturation
    );
    
    const photoId = result.lastInsertRowid as number;
    
    // Generate variants
    await generateVariants(originalPath, photoId);
    
    return photoId;
  } finally {
    db.close();
  }
}

/**
 * Reindex all photos in the directory
 */
export async function reindexPhotos(): Promise<number> {
  const db = getDb();
  let count = 0;
  
  try {
    const files = await readdir(ORIGINAL_DIR);
    
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
      
      const filePath = join(ORIGINAL_DIR, file);
      
      // Check if already indexed
      const existing = db.prepare('SELECT id FROM photos WHERE filename = ?').get(file);
      
      if (!existing) {
        await processPhoto(filePath);
        count++;
      }
    }
  } finally {
    db.close();
  }
  
  return count;
}

/**
 * Build texture atlas from photo variants
 */
export async function buildAtlas(): Promise<void> {
  const db = getDb();
  
  try {
    // Get all photos sorted by brightness (foreground vs background)
    const photos = db.prepare(`
      SELECT id, filename, avg_color_r, avg_color_g, avg_color_b, luma, saturation
      FROM photos
      ORDER BY luma DESC, saturation DESC
    `).all() as Array<{
      id: number;
      filename: string;
      avg_color_r: number;
      avg_color_g: number;
      avg_color_b: number;
      luma: number;
      saturation: number;
    }>;
    
    if (photos.length === 0) {
      throw new Error('No photos available to build atlas');
    }
    
    // Calculate atlas dimensions
    const tilesPerRow = Math.ceil(Math.sqrt(photos.length));
    const atlasWidth = Math.min(tilesPerRow * ATLAS_TILE_SIZE, ATLAS_MAX_SIZE);
    const atlasHeight = Math.ceil(photos.length / tilesPerRow) * ATLAS_TILE_SIZE;
    
    // Create composite image
    const compositeInputs = [];
    const atlasData = {
      tiles: [] as Array<{
        id: number;
        filename: string;
        x: number;
        y: number;
        width: number;
        height: number;
        avgColor: { r: number; g: number; b: number };
        luma: number;
        saturation: number;
      }>,
      width: atlasWidth,
      height: atlasHeight,
      tileSize: ATLAS_TILE_SIZE,
    };
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const row = Math.floor(i / tilesPerRow);
      const col = i % tilesPerRow;
      const x = col * ATLAS_TILE_SIZE;
      const y = row * ATLAS_TILE_SIZE;
      
      // Use 512px variant for atlas
      const variantFilename = photo.filename.replace(extname(photo.filename), '_512.webp');
      const variantPath = join(VARIANTS_DIR, variantFilename);
      
      if (existsSync(variantPath)) {
        const tileBuffer = await sharp(variantPath)
          .resize(ATLAS_TILE_SIZE, ATLAS_TILE_SIZE, { fit: 'cover' })
          .toBuffer();
        
        compositeInputs.push({
          input: tileBuffer,
          top: y,
          left: x,
        });
        
        atlasData.tiles.push({
          id: photo.id,
          filename: photo.filename,
          x,
          y,
          width: ATLAS_TILE_SIZE,
          height: ATLAS_TILE_SIZE,
          avgColor: {
            r: photo.avg_color_r,
            g: photo.avg_color_g,
            b: photo.avg_color_b,
          },
          luma: photo.luma,
          saturation: photo.saturation,
        });
      }
    }
    
    // Create atlas image
    const atlasImagePath = join(ATLAS_DIR, 'atlas.webp');
    await sharp({
      create: {
        width: atlasWidth,
        height: atlasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite(compositeInputs)
      .webp({ quality: 90 })
      .toFile(atlasImagePath);
    
    // Save atlas metadata as JSON
    const atlasJsonPath = join(ATLAS_DIR, 'atlas.json');
    await writeFile(atlasJsonPath, JSON.stringify(atlasData, null, 2));
    
    // Update atlas table
    db.prepare('DELETE FROM atlas').run();
    db.prepare(`
      INSERT INTO atlas (id, json_path, image_path, tile_count, atlas_width, atlas_height)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(atlasJsonPath, atlasImagePath, photos.length, atlasWidth, atlasHeight);
    
    console.log(`Atlas built: ${photos.length} tiles, ${atlasWidth}x${atlasHeight}px`);
  } finally {
    db.close();
  }
}

/**
 * Handle photo upload endpoint
 */
export async function handleUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }
    
    const files = req.files as Express.Multer.File[];
    const results = [];
    
    for (const file of files) {
      try {
        const photoId = await processPhoto(file.path);
        results.push({
          filename: file.originalname,
          photoId,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          success: false,
          error: (error as Error).message,
        });
      }
    }
    
    res.json({
      success: true,
      message: `Processed ${results.filter(r => r.success).length} of ${files.length} files`,
      results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}

/**
 * Handle atlas rebuild endpoint
 */
export async function handleRebuildAtlas(req: Request, res: Response): Promise<void> {
  try {
    await buildAtlas();
    res.json({ success: true, message: 'Atlas rebuilt successfully' });
  } catch (error) {
    console.error('Atlas rebuild error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * Handle reindex photos endpoint
 */
export async function handleReindexPhotos(req: Request, res: Response): Promise<void> {
  try {
    const count = await reindexPhotos();
    res.json({ success: true, message: `Indexed ${count} new photos` });
  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}

/**
 * Get all photos
 */
export function getPhotos(req: Request, res: Response): void {
  const db = getDb();
  
  try {
    const photos = db.prepare(`
      SELECT id, filename, width, height, avg_color_r, avg_color_g, avg_color_b,
             luma, saturation, created_at
      FROM photos
      ORDER BY created_at DESC
    `).all();
    
    res.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  } finally {
    db.close();
  }
}

/**
 * Get atlas data
 */
export function getAtlas(req: Request, res: Response): void {
  const db = getDb();
  
  try {
    const atlas = db.prepare('SELECT * FROM atlas WHERE id = 1').get();
    
    if (!atlas) {
      res.status(404).json({ error: 'Atlas not found. Build it first.' });
      return;
    }
    
    res.json({ atlas });
  } catch (error) {
    console.error('Error fetching atlas:', error);
    res.status(500).json({ error: 'Failed to fetch atlas' });
  } finally {
    db.close();
  }
}

// Ensure directories exist
[ORIGINAL_DIR, VARIANTS_DIR, ATLAS_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

export default {
  processPhoto,
  reindexPhotos,
  buildAtlas,
  handleUpload,
  handleRebuildAtlas,
  handleReindexPhotos,
  getPhotos,
  getAtlas,
};
