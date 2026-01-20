/**
 * Sprite Loading and Animation System for Swarm RTS
 * Handles loading, caching, and animating sprite sheets for all faction units
 */

export interface SpriteAnimation {
  frames: HTMLImageElement[];
  frameDuration: number;
  loop: boolean;
}

export interface UnitSprite {
  id: string;
  animations: Map<string, SpriteAnimation>;
  currentAnimation: string;
  currentFrame: number;
  animationTime: number;
}

export interface SpriteLoadResult {
  success: boolean;
  error?: string;
  sprite?: UnitSprite;
}

class SpriteLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private basePath: string = '/';

  setBasePath(path: string) {
    this.basePath = path.endsWith('/') ? path : `${path}/`;
  }

  /**
   * Load a single image and cache it
   */
  async loadImage(path: string): Promise<HTMLImageElement> {
    const fullPath = `${this.basePath}${path}`;
    
    // Return cached image if available
    if (this.cache.has(fullPath)) {
      return this.cache.get(fullPath)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(fullPath)) {
      return this.loadingPromises.get(fullPath)!;
    }

    // Create new load promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(fullPath, img);
        this.loadingPromises.delete(fullPath);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(fullPath);
        reject(new Error(`Failed to load image: ${fullPath}`));
      };
      // Encode URI to safely handle spaces and special characters
      img.src = encodeURI(fullPath);
    });

    this.loadingPromises.set(fullPath, loadPromise);
    return loadPromise;
  }

  /**
   * Load all animation frames for a unit
   */
  async loadUnitSprite(unitId: string, spritePath: string, animations: string[]): Promise<SpriteLoadResult> {
    try {
      const unitSprite: UnitSprite = {
        id: unitId,
        animations: new Map(),
        currentAnimation: animations[0] || 'Idle',
        currentFrame: 0,
        animationTime: 0,
      };

      // Normalize path from historical locations to current /assets layout
      // Examples input: 'docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Archer'
      // Target primary:  'sprites/default/Archer-<Anim>.png' (fast path given current sync)
      // Target fallback: 'sprites/Characters/Heros/GrudgeRPGAssets2d/Archer-<Anim>.png'
      const leafName = spritePath.split(/[\\/]/).pop() || spritePath;
      let stripped = spritePath.replace(/^docs\//i, '');
      stripped = stripped.replace(/^MiniWorldSprites\//i, '');
      const structuredBase = `sprites/${stripped}`; // e.g., sprites/Characters/Heros/.../Archer
      const defaultBase = `sprites/default/${leafName}`; // e.g., sprites/default/Archer

      // Load each animation's image with fallback resolution
      for (const animName of animations) {
        const candidates = [
          `${defaultBase}-${animName}.png`,
          `${structuredBase}-${animName}.png`,
        ];

        let loadedImg: HTMLImageElement | null = null;
        let lastErr: unknown = null;
        for (const candidate of candidates) {
          try {
            loadedImg = await this.loadImage(candidate);
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        
        if (loadedImg) {
          unitSprite.animations.set(animName, {
            frames: [loadedImg],
            frameDuration: 0.1,
            loop: animName !== 'Death' && animName !== 'Hurt',
          });
        } else {
          console.warn(`Could not load animation ${animName} for ${unitId}. Tried:`, candidates, lastErr);
        }
      }

      // Ensure at least one animation loaded
      if (unitSprite.animations.size === 0) {
        return {
          success: false,
          error: `No animations loaded for unit ${unitId}`,
        };
      }

      return {
        success: true,
        sprite: unitSprite,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update animation state
   */
  updateAnimation(sprite: UnitSprite, deltaTime: number) {
    const anim = sprite.animations.get(sprite.currentAnimation);
    if (!anim) return;

    sprite.animationTime += deltaTime;
    if (sprite.animationTime >= anim.frameDuration) {
      sprite.animationTime = 0;
      sprite.currentFrame++;
      
      if (sprite.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          sprite.currentFrame = 0;
        } else {
          sprite.currentFrame = anim.frames.length - 1;
        }
      }
    }
  }

  /**
   * Change current animation
   */
  setAnimation(sprite: UnitSprite, animationName: string) {
    if (sprite.currentAnimation === animationName) return;
    
    if (sprite.animations.has(animationName)) {
      sprite.currentAnimation = animationName;
      sprite.currentFrame = 0;
      sprite.animationTime = 0;
    }
  }

  /**
   * Get current frame image
   */
  getCurrentFrame(sprite: UnitSprite): HTMLImageElement | null {
    const anim = sprite.animations.get(sprite.currentAnimation);
    if (!anim || anim.frames.length === 0) return null;
    
    const frameIndex = Math.min(sprite.currentFrame, anim.frames.length - 1);
    return anim.frames[frameIndex];
  }

  /**
   * Clear all cached sprites
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedImages: this.cache.size,
      loading: this.loadingPromises.size,
    };
  }
}

// Singleton instance
export const spriteLoader = new SpriteLoader();

/**
 * Render a unit sprite on canvas
 */
export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  sprite: UnitSprite,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  const frame = spriteLoader.getCurrentFrame(sprite);
  if (!frame) return;

  ctx.save();
  ctx.translate(x, y);
  
  if (flipX) {
    ctx.scale(-1, 1);
  }

  // Draw centered
  ctx.drawImage(
    frame,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

/**
 * Determine animation state based on unit state
 */
export function getUnitAnimationState(unit: {
  isMoving: boolean;
  isAttacking: boolean;
  isDead: boolean;
  isHurt: boolean;
}): string {
  if (unit.isDead) return 'Death';
  if (unit.isHurt) return 'Hurt';
  if (unit.isAttacking) return 'Attack01'; // or randomly choose attack animation
  if (unit.isMoving) return 'Walk';
  return 'Idle';
}
