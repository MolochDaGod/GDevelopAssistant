import Phaser from 'phaser';

export interface TileConfig {
  width: number;
  height: number;
  tileSize: number;
  seed?: number;
  palette?: string[];
  noiseScale?: number;
}

export interface ColliderConfig {
  type: 'rectangle' | 'circle' | 'polygon';
  width?: number;
  height?: number;
  radius?: number;
  vertices?: { x: number; y: number }[];
  isStatic?: boolean;
  friction?: number;
  bounce?: number;
}

export interface AnimationConfig {
  key: string;
  frames: number[];
  frameRate?: number;
  repeat?: number;
  yoyo?: boolean;
}

const DEFAULT_PALETTE = [
  '#2d5a27', '#3a7d32', '#4a9c3f', '#5db84a', 
  '#6b8e23', '#556b2f', '#8fbc8f', '#90ee90'
];

export function generateTileBackground(
  scene: Phaser.Scene,
  config: TileConfig
): Phaser.GameObjects.RenderTexture {
  const { width, height, tileSize, seed = Date.now(), palette = DEFAULT_PALETTE, noiseScale = 0.1 } = config;
  
  const cols = Math.ceil(width / tileSize);
  const rows = Math.ceil(height / tileSize);
  
  const renderTexture = scene.add.renderTexture(0, 0, width, height);
  const graphics = scene.add.graphics();
  
  const seededRandom = (x: number, y: number): number => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };
  
  const noise2D = (x: number, y: number): number => {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;
    
    const sx = x - x0;
    const sy = y - y0;
    
    const n00 = seededRandom(x0, y0);
    const n10 = seededRandom(x1, y0);
    const n01 = seededRandom(x0, y1);
    const n11 = seededRandom(x1, y1);
    
    const ix0 = n00 * (1 - sx) + n10 * sx;
    const ix1 = n01 * (1 - sx) + n11 * sx;
    
    return ix0 * (1 - sy) + ix1 * sy;
  };
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const noiseValue = noise2D(col * noiseScale, row * noiseScale);
      const colorIndex = Math.floor(noiseValue * palette.length) % palette.length;
      const color = Phaser.Display.Color.HexStringToColor(palette[colorIndex]).color;
      
      graphics.fillStyle(color, 1);
      graphics.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
  
  renderTexture.draw(graphics);
  graphics.destroy();
  
  return renderTexture;
}

export function createPhysicsCollider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ColliderConfig
): Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.StaticGroup {
  const { type, isStatic = false, friction = 0.1, bounce = 0.2 } = config;
  
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffffff, 0);
  
  let body: Phaser.Physics.Arcade.Sprite;
  
  if (type === 'rectangle') {
    const w = config.width || 32;
    const h = config.height || 32;
    graphics.fillRect(0, 0, w, h);
    graphics.generateTexture('collider_rect_' + Date.now(), w, h);
    body = scene.physics.add.sprite(x, y, 'collider_rect_' + Date.now());
    body.setSize(w, h);
  } else if (type === 'circle') {
    const r = config.radius || 16;
    graphics.fillCircle(r, r, r);
    graphics.generateTexture('collider_circle_' + Date.now(), r * 2, r * 2);
    body = scene.physics.add.sprite(x, y, 'collider_circle_' + Date.now());
    body.setCircle(r);
  } else {
    const w = config.width || 32;
    const h = config.height || 32;
    body = scene.physics.add.sprite(x, y, '');
    body.setSize(w, h);
  }
  
  graphics.destroy();
  
  if (isStatic) {
    body.setImmovable(true);
    (body.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }
  
  body.setBounce(bounce);
  (body.body as Phaser.Physics.Arcade.Body).setFriction(friction, friction);
  
  return body;
}

export function createSpriteAnimation(
  scene: Phaser.Scene,
  textureKey: string,
  config: AnimationConfig
): Phaser.Animations.Animation | false {
  const { key, frames, frameRate = 10, repeat = -1, yoyo = false } = config;
  
  const animFrames = frames.map(frame => ({ key: textureKey, frame }));
  
  return scene.anims.create({
    key,
    frames: animFrames,
    frameRate,
    repeat,
    yoyo
  });
}

export function createFrameAnimation(
  scene: Phaser.Scene,
  config: {
    key: string;
    texture: string;
    frameWidth: number;
    frameHeight: number;
    startFrame?: number;
    endFrame: number;
    frameRate?: number;
    repeat?: number;
    yoyo?: boolean;
  }
): Phaser.Animations.Animation | false {
  const { key, texture, startFrame = 0, endFrame, frameRate = 10, repeat = -1, yoyo = false } = config;
  
  return scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(texture, { start: startFrame, end: endFrame }),
    frameRate,
    repeat,
    yoyo
  });
}

export class TileMapGenerator {
  private scene: Phaser.Scene;
  private seed: number;
  
  constructor(scene: Phaser.Scene, seed?: number) {
    this.scene = scene;
    this.seed = seed || Date.now();
  }
  
  private seededRandom(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
    return n - Math.floor(n);
  }
  
  private perlinNoise(x: number, y: number, scale: number = 0.1): number {
    const scaledX = x * scale;
    const scaledY = y * scale;
    
    const x0 = Math.floor(scaledX);
    const y0 = Math.floor(scaledY);
    
    const fx = scaledX - x0;
    const fy = scaledY - y0;
    
    const smoothFx = fx * fx * (3 - 2 * fx);
    const smoothFy = fy * fy * (3 - 2 * fy);
    
    const n00 = this.seededRandom(x0, y0);
    const n10 = this.seededRandom(x0 + 1, y0);
    const n01 = this.seededRandom(x0, y0 + 1);
    const n11 = this.seededRandom(x0 + 1, y0 + 1);
    
    const nx0 = n00 + smoothFx * (n10 - n00);
    const nx1 = n01 + smoothFx * (n11 - n01);
    
    return nx0 + smoothFy * (nx1 - nx0);
  }
  
  generateHeightMap(width: number, height: number, octaves: number = 4): number[][] {
    const map: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let o = 0; o < octaves; o++) {
          value += this.perlinNoise(x * frequency, y * frequency, 0.05) * amplitude;
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        
        map[y][x] = value / maxValue;
      }
    }
    
    return map;
  }
  
  generateTileData(
    width: number,
    height: number,
    tileTypes: { threshold: number; tileIndex: number }[]
  ): number[][] {
    const heightMap = this.generateHeightMap(width, height);
    const tileData: number[][] = [];
    
    tileTypes.sort((a, b) => a.threshold - b.threshold);
    
    for (let y = 0; y < height; y++) {
      tileData[y] = [];
      for (let x = 0; x < width; x++) {
        const h = heightMap[y][x];
        let tileIndex = tileTypes[0].tileIndex;
        
        for (const type of tileTypes) {
          if (h >= type.threshold) {
            tileIndex = type.tileIndex;
          }
        }
        
        tileData[y][x] = tileIndex;
      }
    }
    
    return tileData;
  }
  
  createTilemap(
    tileData: number[][],
    tilesetKey: string,
    tileWidth: number,
    tileHeight: number
  ): Phaser.Tilemaps.Tilemap {
    const height = tileData.length;
    const width = tileData[0]?.length || 0;
    
    const map = this.scene.make.tilemap({
      data: tileData,
      tileWidth,
      tileHeight,
      width,
      height
    });
    
    const tileset = map.addTilesetImage(tilesetKey);
    if (tileset) {
      map.createLayer(0, tileset, 0, 0);
    }
    
    return map;
  }
}

export class ColliderFactory {
  private scene: Phaser.Scene;
  private colliderGroup: Phaser.Physics.Arcade.Group;
  private staticGroup: Phaser.Physics.Arcade.StaticGroup;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.colliderGroup = scene.physics.add.group();
    this.staticGroup = scene.physics.add.staticGroup();
  }
  
  createRectCollider(
    x: number,
    y: number,
    width: number,
    height: number,
    isStatic: boolean = false
  ): Phaser.Physics.Arcade.Sprite {
    const key = `rect_${width}_${height}_${Date.now()}`;
    
    if (!this.scene.textures.exists(key)) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff, 0);
      graphics.fillRect(0, 0, width, height);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    }
    
    const sprite = isStatic
      ? this.staticGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite
      : this.colliderGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    
    sprite.setSize(width, height);
    sprite.setVisible(false);
    
    return sprite;
  }
  
  createCircleCollider(
    x: number,
    y: number,
    radius: number,
    isStatic: boolean = false
  ): Phaser.Physics.Arcade.Sprite {
    const key = `circle_${radius}_${Date.now()}`;
    
    if (!this.scene.textures.exists(key)) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff, 0);
      graphics.fillCircle(radius, radius, radius);
      graphics.generateTexture(key, radius * 2, radius * 2);
      graphics.destroy();
    }
    
    const sprite = isStatic
      ? this.staticGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite
      : this.colliderGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    
    sprite.setCircle(radius);
    sprite.setVisible(false);
    
    return sprite;
  }
  
  createFromAsset(
    x: number,
    y: number,
    textureKey: string,
    frame?: string | number,
    isStatic: boolean = false
  ): Phaser.Physics.Arcade.Sprite {
    const sprite = isStatic
      ? this.staticGroup.create(x, y, textureKey, frame) as Phaser.Physics.Arcade.Sprite
      : this.colliderGroup.create(x, y, textureKey, frame) as Phaser.Physics.Arcade.Sprite;
    
    return sprite;
  }
  
  getColliderGroup(): Phaser.Physics.Arcade.Group {
    return this.colliderGroup;
  }
  
  getStaticGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.staticGroup;
  }
  
  addCollision(
    group1: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup,
    group2?: Phaser.Physics.Arcade.Group | Phaser.Physics.Arcade.StaticGroup,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): Phaser.Physics.Arcade.Collider {
    return this.scene.physics.add.collider(group1, group2 || group1, callback);
  }
}

export class AnimationManager {
  private scene: Phaser.Scene;
  private animations: Map<string, Phaser.Animations.Animation> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  createFromSpritesheet(
    key: string,
    textureKey: string,
    startFrame: number,
    endFrame: number,
    options: {
      frameRate?: number;
      repeat?: number;
      yoyo?: boolean;
    } = {}
  ): Phaser.Animations.Animation | false {
    const { frameRate = 10, repeat = -1, yoyo = false } = options;
    
    const anim = this.scene.anims.create({
      key,
      frames: this.scene.anims.generateFrameNumbers(textureKey, { start: startFrame, end: endFrame }),
      frameRate,
      repeat,
      yoyo
    });
    
    if (anim) {
      this.animations.set(key, anim);
    }
    
    return anim;
  }
  
  createFromAtlas(
    key: string,
    textureKey: string,
    prefix: string,
    start: number,
    end: number,
    options: {
      frameRate?: number;
      repeat?: number;
      yoyo?: boolean;
      suffix?: string;
    } = {}
  ): Phaser.Animations.Animation | false {
    const { frameRate = 10, repeat = -1, yoyo = false, suffix = '' } = options;
    
    const anim = this.scene.anims.create({
      key,
      frames: this.scene.anims.generateFrameNames(textureKey, {
        prefix,
        start,
        end,
        suffix
      }),
      frameRate,
      repeat,
      yoyo
    });
    
    if (anim) {
      this.animations.set(key, anim);
    }
    
    return anim;
  }
  
  play(sprite: Phaser.GameObjects.Sprite, key: string, ignoreIfPlaying: boolean = true): void {
    sprite.play(key, ignoreIfPlaying);
  }
  
  stop(sprite: Phaser.GameObjects.Sprite): void {
    sprite.stop();
  }
  
  getAnimation(key: string): Phaser.Animations.Animation | undefined {
    return this.animations.get(key);
  }
  
  hasAnimation(key: string): boolean {
    return this.animations.has(key);
  }
}

export { Phaser };
