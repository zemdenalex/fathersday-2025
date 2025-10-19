import { AtlasData } from './api';

export interface GlyphMask {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export interface TileMapping {
  x: number;
  y: number;
  tileIndex: number;
  isForeground: boolean;
}

/**
 * Generate a binary mask from text using canvas
 */
export function generateTextMask(
  text: string,
  scale: number = 1.5,
  fontFamily: string = 'Rubik Black, Manrope ExtraBold, Montserrat ExtraBold'
): GlyphMask {
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Set font and measure text
  const fontSize = Math.floor(100 * scale);
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  
  // Calculate canvas size
  const padding = Math.floor(20 * scale);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize * 1.5 + padding * 2);
  
  canvas.width = width;
  canvas.height = height;
  
  // Clear and set font again (canvas reset on resize)
  ctx.clearRect(0, 0, width, height);
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'white';
  ctx.fillText(text, padding, padding);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Convert to binary mask (alpha channel)
  const pixels = new Uint8Array(width * height);
  
  for (let i = 0; i < pixels.length; i++) {
    // Check alpha channel (every 4th value)
    pixels[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }
  
  return {
    width,
    height,
    pixels,
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Map tiles to glyph mask positions
 */
export function mapTilesToGlyph(
  mask: GlyphMask,
  atlasData: AtlasData,
  tileSize: number
): TileMapping[] {
  const mappings: TileMapping[] = [];
  
  // Calculate how many tiles we need
  const tilesX = Math.ceil(mask.width / tileSize);
  const tilesY = Math.ceil(mask.height / tileSize);
  
  // Sort tiles by brightness and saturation
  const foregroundTiles = [...atlasData.tiles]
    .sort((a, b) => {
      // Prefer brighter, more saturated tiles for foreground
      const scoreA = a.luma * 0.7 + a.saturation * 100 * 0.3;
      const scoreB = b.luma * 0.7 + b.saturation * 100 * 0.3;
      return scoreB - scoreA;
    });
  
  const backgroundTiles = [...atlasData.tiles]
    .sort((a, b) => {
      // Prefer darker, less saturated tiles for background
      const scoreA = a.luma * 0.5 + (1 - a.saturation) * 100 * 0.5;
      const scoreB = b.luma * 0.5 + (1 - b.saturation) * 100 * 0.5;
      return scoreA - scoreB;
    });
  
  // Shuffle to avoid patterns
  const shuffledForeground = shuffleArray(foregroundTiles);
  const shuffledBackground = shuffleArray(backgroundTiles);
  
  let foregroundIndex = 0;
  let backgroundIndex = 0;
  
  // Map each tile position
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x = tx * tileSize;
      const y = ty * tileSize;
      
      // Sample the mask at this tile's center
      const sampleX = Math.min(
        Math.floor(x + tileSize / 2),
        mask.width - 1
      );
      const sampleY = Math.min(
        Math.floor(y + tileSize / 2),
        mask.height - 1
      );
      
      const maskValue = mask.pixels[sampleY * mask.width + sampleX];
      const isForeground = maskValue === 1;
      
      // Select appropriate tile
      let tileIndex: number;
      
      if (isForeground) {
        tileIndex = foregroundIndex % shuffledForeground.length;
        foregroundIndex++;
      } else {
        tileIndex = backgroundIndex % shuffledBackground.length;
        backgroundIndex++;
      }
      
      mappings.push({
        x,
        y,
        tileIndex,
        isForeground,
      });
    }
  }
  
  return mappings;
}

/**
 * Calculate optimal tile size based on viewport
 */
export function calculateTileSize(
  viewportWidth: number,
  baseVw: number = 2
): number {
  return Math.floor((viewportWidth * baseVw) / 100);
}

/**
 * Calculate container dimensions to fit mask
 */
export function calculateContainerSize(
  mask: GlyphMask,
  tileSize: number
): { width: number; height: number } {
  return {
    width: Math.ceil(mask.width / tileSize) * tileSize,
    height: Math.ceil(mask.height / tileSize) * tileSize,
  };
}

/**
 * Test if font is loaded and ready
 */
export async function waitForFont(fontFamily: string): Promise<void> {
  if (!('fonts' in document)) return;
  
  try {
    await (document as any).fonts.load(`900 100px ${fontFamily}`);
  } catch (error) {
    console.warn('Font loading check failed:', error);
  }
}

export default {
  generateTextMask,
  mapTilesToGlyph,
  calculateTileSize,
  calculateContainerSize,
  waitForFont,
};
