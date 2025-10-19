import * as PIXI from 'pixi.js';
import { AtlasTextures, loadAtlas } from './atlas';
import { generateTextMask, mapTilesToGlyph, calculateTileSize, calculateContainerSize, waitForFont } from './glyphMap';

export interface PixiTickerConfig {
  text: string;
  scrollSpeed: number;
  scrollDirection: 'left' | 'right';
  tileBaseVw: number;
  glyphScale: number;
  fpsTarget: number;
  autoQuality: boolean;
  minFps: number;
  onFpsUpdate?: (fps: number) => void;
  onReady?: () => void;
}

export class PixiTicker {
  private app: PIXI.Application | null = null;
  private container: PIXI.Container | null = null;
  private atlas: AtlasTextures | null = null;
  private sprites: PIXI.Sprite[] = [];
  private config: PixiTickerConfig;
  private isScrolling = true;
  private scrollOffset = 0;
  private hoveredSprite: PIXI.Sprite | null = null;
  private lastTime = performance.now();
  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;
  private overlay: PIXI.Graphics | null = null;
  private originalSpriteData: Map<PIXI.Sprite, {
    x: number;
    y: number;
    scale: number;
    zIndex: number;
  }> = new Map();

  constructor(config: PixiTickerConfig) {
    this.config = config;
  }

  /**
   * Initialize Pixi application and scene
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    try {
      // Wait for font to load
      await waitForFont('Rubik Black, Manrope ExtraBold, Montserrat ExtraBold');

      // Create Pixi application
      this.app = new PIXI.Application();
      
      await this.app.init({
        canvas,
        backgroundColor: 0x0B0B0F,
        resizeTo: canvas.parentElement || undefined,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Load atlas
      this.atlas = await loadAtlas('/atlas/atlas.webp', '/atlas/atlas.json');

      // Create scene
      this.createScene();

      // Setup interaction
      this.setupInteraction();

      // Start animation loop
      this.app.ticker.add(this.animate.bind(this));

      // Handle resize
      window.addEventListener('resize', this.handleResize.bind(this));

      if (this.config.onReady) {
        this.config.onReady();
      }

      console.log('Pixi ticker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pixi ticker:', error);
      throw error;
    }
  }

  /**
   * Create the ticker scene with sprites
   */
  private createScene(): void {
    if (!this.app || !this.atlas) return;

    // Create main container for scrolling
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.app.stage.addChild(this.container);

    // Generate text mask
    const mask = generateTextMask(this.config.text, this.config.glyphScale);

    // Calculate tile size based on viewport
    const tileSize = calculateTileSize(this.app.screen.width, this.config.tileBaseVw);

    // Map tiles to glyph
    const mappings = mapTilesToGlyph(mask, this.atlas.data, tileSize);

    // Calculate container size
    const containerSize = calculateContainerSize(mask, tileSize);

    // Center container vertically
    const offsetY = (this.app.screen.height - containerSize.height) / 2;

    // Create sprites for each mapping
    for (const mapping of mappings) {
      const texture = this.atlas.tiles[mapping.tileIndex];

      const sprite = new PIXI.Sprite(texture);

      // Calculate scale to fit tile size
      const scale = tileSize / this.atlas.data.tileSize;
      sprite.scale.set(scale);

      // Position sprite
      sprite.x = mapping.x;
      sprite.y = mapping.y + offsetY;

      // Apply grayscale and darkening for background tiles
      if (!mapping.isForeground) {
        const colorMatrix = new PIXI.ColorMatrixFilter();
        colorMatrix.desaturate();
        colorMatrix.brightness(0.3, false);
        sprite.filters = [colorMatrix];
      }

      // Make interactive
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';

      // Store original data for zoom
      this.originalSpriteData.set(sprite, {
        x: sprite.x,
        y: sprite.y,
        scale: sprite.scale.x,
        zIndex: 0,
      });

      this.sprites.push(sprite);
      this.container.addChild(sprite);
    }

    // Create overlay for dimming
    this.overlay = new PIXI.Graphics();
    this.overlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
    this.overlay.fill({ color: 0x000000, alpha: 0 });
    this.overlay.zIndex = 1000;
    this.overlay.visible = false;
    this.app.stage.addChild(this.overlay);

    // Duplicate container for seamless loop
    this.duplicateContainerForLoop(containerSize.width);
  }

  /**
   * Duplicate sprites for seamless scrolling loop
   */
  private duplicateContainerForLoop(width: number): void {
    if (!this.container) return;

    const originalSprites = [...this.sprites];

    for (const sprite of originalSprites) {
      const duplicate = new PIXI.Sprite(sprite.texture);
      duplicate.scale.copyFrom(sprite.scale);
      duplicate.x = sprite.x + width + 100; // Gap between loops
      duplicate.y = sprite.y;
      duplicate.filters = sprite.filters ? [...sprite.filters] : null;
      duplicate.eventMode = 'static';
      duplicate.cursor = 'pointer';

      this.originalSpriteData.set(duplicate, {
        x: duplicate.x,
        y: duplicate.y,
        scale: duplicate.scale.x,
        zIndex: 0,
      });

      this.sprites.push(duplicate);
      this.container.addChild(duplicate);
    }
  }

  /**
   * Setup mouse/touch interaction
   */
  private setupInteraction(): void {
    if (!this.app) return;

    for (const sprite of this.sprites) {
      sprite.on('pointerover', () => this.handleHoverStart(sprite));
      sprite.on('pointerout', () => this.handleHoverEnd());
      sprite.on('pointerdown', () => this.handleHoverStart(sprite));
    }

    // Click outside to close
    this.app.stage.eventMode = 'static';
    this.app.stage.on('pointerdown', (e) => {
      if (!this.hoveredSprite) return;
      
      // Check if click is outside the zoomed sprite
      const bounds = this.hoveredSprite.getBounds();
      const { x, y } = e.global;
      
      if (x < bounds.x || x > bounds.x + bounds.width ||
          y < bounds.y || y > bounds.y + bounds.height) {
        this.handleHoverEnd();
      }
    });
  }

  /**
   * Handle hover start - pause and zoom
   */
  private handleHoverStart(sprite: PIXI.Sprite): void {
    if (this.hoveredSprite === sprite) return;

    // Pause scrolling
    this.isScrolling = false;

    // Dim other sprites
    if (this.overlay) {
      this.overlay.visible = true;
      this.overlay.clear();
      this.overlay.rect(0, 0, this.app!.screen.width, this.app!.screen.height);
      this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    }

    // Bring sprite to front
    sprite.zIndex = 2000;
    this.hoveredSprite = sprite;

    // Calculate zoom
    const targetWidth = this.app!.screen.width * 0.6;
    const targetScale = targetWidth / sprite.texture.width;

    // Animate zoom
    this.animateSprite(sprite, {
      scale: targetScale,
      x: (this.app!.screen.width - targetWidth) / 2,
      y: (this.app!.screen.height - sprite.texture.height * targetScale) / 2,
      duration: 300,
    });
  }

  /**
   * Handle hover end - resume and restore
   */
  private handleHoverEnd(): void {
    if (!this.hoveredSprite) return;

    const sprite = this.hoveredSprite;
    const original = this.originalSpriteData.get(sprite);

    if (original) {
      // Animate back to original position
      this.animateSprite(sprite, {
        scale: original.scale,
        x: original.x - this.scrollOffset,
        y: original.y,
        duration: 300,
      });
    }

    sprite.zIndex = 0;
    this.hoveredSprite = null;

    // Hide overlay
    if (this.overlay) {
      this.overlay.visible = false;
    }

    // Resume scrolling
    setTimeout(() => {
      this.isScrolling = true;
    }, 300);
  }

  /**
   * Animate sprite properties with easing
   */
  private animateSprite(
    sprite: PIXI.Sprite,
    props: { scale?: number; x?: number; y?: number; duration: number }
  ): void {
    const start = performance.now();
    const startScale = sprite.scale.x;
    const startX = sprite.x;
    const startY = sprite.y;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / props.duration, 1);

      // Cubic ease in-out
      const t = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (props.scale !== undefined) {
        const scale = startScale + (props.scale - startScale) * t;
        sprite.scale.set(scale);
      }

      if (props.x !== undefined) {
        sprite.x = startX + (props.x - startX) * t;
      }

      if (props.y !== undefined) {
        sprite.y = startY + (props.y - startY) * t;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animation loop
   */
  private animate(): void {
    if (!this.app || !this.container) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = now;

    // Calculate FPS
    this.frameCount++;
    this.fpsTimer += delta;

    if (this.fpsTimer >= 1) {
      this.currentFps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      if (this.config.onFpsUpdate) {
        this.config.onFpsUpdate(Math.round(this.currentFps));
      }

      // Auto quality adjustment
      if (this.config.autoQuality && this.currentFps < this.config.minFps) {
        console.warn(`Low FPS detected: ${this.currentFps.toFixed(1)}`);
      }
    }

    // Scroll animation
    if (this.isScrolling) {
      const scrollDelta = this.config.scrollSpeed * delta;
      const direction = this.config.scrollDirection === 'right' ? 1 : -1;

      this.scrollOffset += scrollDelta * direction;
      this.container.x = -this.scrollOffset;

      // Reset scroll for seamless loop
      const loopWidth = this.getLoopWidth();
      if (Math.abs(this.scrollOffset) > loopWidth) {
        this.scrollOffset = 0;
      }
    }
  }

  /**
   * Get the width of one loop cycle
   */
  private getLoopWidth(): number {
    if (this.sprites.length === 0) return 0;

    const halfPoint = Math.floor(this.sprites.length / 2);
    return Math.abs(this.sprites[halfPoint].x - this.sprites[0].x);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.app) return;

    // Recreate scene with new dimensions
    this.cleanup();
    this.createScene();
    this.setupInteraction();
  }

  /**
   * Update configuration and rebuild
   */
  async updateConfig(config: Partial<PixiTickerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Rebuild scene
    this.cleanup();
    this.createScene();
    this.setupInteraction();
  }

  /**
   * Cleanup sprites
   */
  private cleanup(): void {
    if (this.container) {
      this.container.removeChildren();
    }

    this.sprites = [];
    this.originalSpriteData.clear();
    this.hoveredSprite = null;
  }

  /**
   * Destroy and cleanup all resources
   */
  destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));

    if (this.app) {
      this.app.destroy(true, { children: true, texture: false });
      this.app = null;
    }

    if (this.atlas) {
      // Don't destroy atlas textures as they may be reused
      this.atlas = null;
    }

    this.sprites = [];
    this.originalSpriteData.clear();
  }
}

export default PixiTicker;