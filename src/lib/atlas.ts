import * as PIXI from 'pixi.js';
import { AtlasData } from './api';

export interface AtlasTextures {
  baseTexture: PIXI.Texture;
  tiles: PIXI.Texture[];
  data: AtlasData;
}

/**
 * Load atlas texture and create tile textures
 */
export async function loadAtlas(imagePath: string, jsonPath: string): Promise<AtlasTextures> {
  try {
    // Load atlas data
    const response = await fetch(jsonPath);
    
    if (!response.ok) {
      throw new Error('Failed to load atlas JSON');
    }
    
    const data: AtlasData = await response.json();
    
    // Load atlas texture
    const baseTexture = await PIXI.Assets.load(imagePath);
    
    if (!baseTexture) {
      throw new Error('Failed to load atlas texture');
    }
    
    // Create tile textures from atlas
    const tiles: PIXI.Texture[] = [];
    
    for (const tile of data.tiles) {
      const texture = new PIXI.Texture({
        source: baseTexture.source,
        frame: new PIXI.Rectangle(tile.x, tile.y, tile.width, tile.height),
      });
      
      tiles.push(texture);
    }
    
    return {
      baseTexture,
      tiles,
      data,
    };
  } catch (error) {
    console.error('Error loading atlas:', error);
    throw error;
  }
}

/**
 * Create a grayscale version of a texture
 */
export function createGrayscaleTexture(
  source: PIXI.Texture,
  darkenPercent: number = 50
): PIXI.Texture {
  // Create a sprite with the source texture
  const sprite = new PIXI.Sprite(source);
  
  // Apply color matrix filter for grayscale and darkening
  const colorMatrix = new PIXI.ColorMatrixFilter();
  
  // Grayscale
  colorMatrix.desaturate();
  
  // Darken
  const darkenFactor = 1 - darkenPercent / 100;
  colorMatrix.brightness(darkenFactor, false);
  
  sprite.filters = [colorMatrix];
  
  return source; // Note: In production, you'd render this to a texture
}

/**
 * Preload font for better text rendering
 */
export async function preloadFont(fontFamily: string): Promise<void> {
  if ('fonts' in document) {
    try {
      await (document as any).fonts.load(`900 100px ${fontFamily}`);
      console.log(`Font loaded: ${fontFamily}`);
    } catch (error) {
      console.warn(`Font loading failed: ${fontFamily}`, error);
    }
  }
}

/**
 * Create a texture from a color (useful for debugging)
 */
export function createColorTexture(
  color: number,
  width: number = 1,
  height: number = 1
): PIXI.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, width, height);
  }
  
  return PIXI.Texture.from(canvas);
}

/**
 * Dispose of atlas resources
 */
export function disposeAtlas(atlas: AtlasTextures): void {
  // Destroy tile textures
  for (const texture of atlas.tiles) {
    texture.destroy(false); // Don't destroy the base texture yet
  }
  
  // Destroy base texture
  atlas.baseTexture.destroy(true);
  
  console.log('Atlas resources disposed');
}

/**
 * Check if texture is valid
 */
export function isTextureValid(texture: PIXI.Texture): boolean {
  return texture && !texture.destroyed && texture.width > 0 && texture.height > 0;
}

/**
 * Get texture info for debugging
 */
export function getTextureInfo(texture: PIXI.Texture): string {
  if (!texture) return 'null';
  if (texture.destroyed) return 'destroyed';
  
  return `${texture.width}x${texture.height}`;
}

export default {
  loadAtlas,
  createGrayscaleTexture,
  preloadFont,
  createColorTexture,
  disposeAtlas,
  isTextureValid,
  getTextureInfo,
};
