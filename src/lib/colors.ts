/**
 * Parse hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  if (!result) {
    return { r: 255, g: 255, b: 255 };
  }
  
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
}

/**
 * Convert hex to number for Pixi.js
 */
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  
  return rgbToHex(
    Math.max(0, r * factor),
    Math.max(0, g * factor),
    Math.max(0, b * factor)
  );
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  
  return rgbToHex(
    Math.min(255, r + (255 - r) * factor),
    Math.min(255, g + (255 - g) * factor),
    Math.min(255, b + (255 - b) * factor)
  );
}

/**
 * Desaturate (grayscale) a color
 */
export function desaturate(hex: string, percent: number = 100): string {
  const { r, g, b } = hexToRgb(hex);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const factor = 1 - percent / 100;
  
  return rgbToHex(
    r * factor + gray * (1 - factor),
    g * factor + gray * (1 - factor),
    b * factor + gray * (1 - factor)
  );
}

/**
 * Check if color has sufficient contrast for accessibility
 */
export function hasGoodContrast(color1: string, color2: string): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const luminance1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const ratio = (Math.max(luminance1, luminance2) + 0.05) / 
                (Math.min(luminance1, luminance2) + 0.05);
  
  return ratio >= 4.5; // WCAG AA standard
}

/**
 * Calculate relative luminance
 */
function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get next color from palette (cycling)
 */
export function getNextColor(palette: string[], currentIndex: number): {
  color: string;
  nextIndex: number;
} {
  const nextIndex = (currentIndex + 1) % palette.length;
  return {
    color: palette[nextIndex],
    nextIndex,
  };
}

/**
 * Generate a rainbow palette with good contrast on dark backgrounds
 */
export function generateDefaultPalette(): string[] {
  return [
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
  ];
}

export default {
  hexToRgb,
  rgbToHex,
  hexToNumber,
  darkenColor,
  lightenColor,
  desaturate,
  hasGoodContrast,
  getNextColor,
  generateDefaultPalette,
};
