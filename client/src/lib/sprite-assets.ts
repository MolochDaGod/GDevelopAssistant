/**
 * Sprite Asset Manager
 * Central location for all game sprite assets
 * 
 * BEST PRACTICES:
 * 1. Always use relative paths from the docs/ folder
 * 2. Organize sprites by category (characters, environment, effects, ui)
 * 3. Include sprite dimensions and frame counts for animations
 * 4. Use consistent naming conventions: category_name_variant
 * 5. Document sprite sheet layouts for animated sprites
 */

export interface SpriteAsset {
  id: string;
  name: string;
  path: string;
  category: 'character' | 'environment' | 'effect' | 'ui' | 'projectile' | 'building';
  dimensions?: {
    width: number;
    height: number;
  };
  animations?: {
    [key: string]: {
      frames: number;
      frameWidth: number;
      frameHeight: number;
      fps?: number;
    };
  };
  description?: string;
}

/**
 * Hero/Character Sprites from MiniWorldSprites
 * Located in: docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/
 */
export const HERO_SPRITES: SpriteAsset[] = [
  {
    id: 'hero_archer',
    name: 'Archer',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Archer',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Ranged archer hero with bow attacks',
  },
  {
    id: 'hero_assassin',
    name: 'Assassin',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Assassin',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Fast melee assassin with dual daggers',
  },
  {
    id: 'hero_barbarian',
    name: 'Barbarian',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Barbarian',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Powerful melee warrior with high strength',
  },
  {
    id: 'hero_bard',
    name: 'Bard',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Bard',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Support hero with buffs and healing',
  },
  {
    id: 'hero_berserker',
    name: 'Berserker',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Berserker',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Rage-based melee fighter',
  },
  {
    id: 'hero_cleric',
    name: 'Cleric',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Cleric',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Holy support with healing and protection',
  },
  {
    id: 'hero_druid',
    name: 'Druid',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Druid',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Nature magic wielder with shapeshifting',
  },
  {
    id: 'hero_knight',
    name: 'Knight',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Knight',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Armored tank with sword and shield',
  },
  {
    id: 'hero_mage',
    name: 'Mage',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Mage',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Elemental magic caster',
  },
  {
    id: 'hero_monk',
    name: 'Monk',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Monk',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Martial artist with combo attacks',
  },
  {
    id: 'hero_necromancer',
    name: 'Necromancer',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Necromancer',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Dark magic and undead summoner',
  },
  {
    id: 'hero_ninja',
    name: 'Ninja',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Ninja',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Stealth and evasion specialist',
  },
  {
    id: 'hero_paladin',
    name: 'Paladin',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Paladin',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Holy warrior with defensive buffs',
  },
  {
    id: 'hero_priest',
    name: 'Priest',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Priest',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Dedicated healer and support',
  },
  {
    id: 'hero_ranger',
    name: 'Ranger',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Ranger',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Wilderness scout with tracking abilities',
  },
  {
    id: 'hero_rogue',
    name: 'Rogue',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Rogue',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Cunning thief with critical strikes',
  },
  {
    id: 'hero_samurai',
    name: 'Samurai',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Samurai',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Katana master with precision strikes',
  },
  {
    id: 'hero_sorcerer',
    name: 'Sorcerer',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Sorcerer',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Powerful arcane magic user',
  },
  {
    id: 'hero_warlock',
    name: 'Warlock',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Warlock',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Demon-pact magic wielder',
  },
  {
    id: 'hero_warrior',
    name: 'Warrior',
    path: '/docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Warrior',
    category: 'character',
    animations: {
      idle: { frames: 4, frameWidth: 64, frameHeight: 64, fps: 8 },
      walk: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      attack01: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      attack02: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 12 },
      death: { frames: 6, frameWidth: 64, frameHeight: 64, fps: 10 },
      hurt: { frames: 3, frameWidth: 64, frameHeight: 64, fps: 10 },
    },
    description: 'Balanced melee fighter',
  },
];

/**
 * Ground/Terrain Sprites
 * Located in: docs/MiniWorldSprites/Ground/
 */
export const TERRAIN_SPRITES: SpriteAsset[] = [
  {
    id: 'ground_grass',
    name: 'Grass Tile',
    path: '/docs/MiniWorldSprites/Ground/Grass',
    category: 'environment',
    dimensions: { width: 32, height: 32 },
    description: 'Basic grass terrain tile',
  },
  {
    id: 'ground_dirt',
    name: 'Dirt Tile',
    path: '/docs/MiniWorldSprites/Ground/Dirt',
    category: 'environment',
    dimensions: { width: 32, height: 32 },
    description: 'Dirt path terrain tile',
  },
  {
    id: 'ground_stone',
    name: 'Stone Tile',
    path: '/docs/MiniWorldSprites/Ground/Stone',
    category: 'environment',
    dimensions: { width: 32, height: 32 },
    description: 'Stone floor terrain tile',
  },
  {
    id: 'ground_water',
    name: 'Water Tile',
    path: '/docs/MiniWorldSprites/Ground/Water',
    category: 'environment',
    dimensions: { width: 32, height: 32 },
    description: 'Water terrain tile',
  },
];

/**
 * Building/Structure Sprites
 */
export const BUILDING_SPRITES: SpriteAsset[] = [
  {
    id: 'building_barracks',
    name: 'Barracks',
    path: '/docs/buildings/barracks',
    category: 'building',
    dimensions: { width: 128, height: 128 },
    description: 'Military training building',
  },
  {
    id: 'building_tower',
    name: 'Tower',
    path: '/docs/buildings/tower',
    category: 'building',
    dimensions: { width: 96, height: 128 },
    description: 'Defensive tower structure',
  },
];

/**
 * Effect/VFX Sprites
 */
export const EFFECT_SPRITES: SpriteAsset[] = [
  {
    id: 'effect_explosion',
    name: 'Explosion',
    path: '/docs/effects/explosion',
    category: 'effect',
    animations: {
      default: { frames: 8, frameWidth: 64, frameHeight: 64, fps: 16 },
    },
    description: 'Generic explosion effect',
  },
  {
    id: 'effect_fire',
    name: 'Fire',
    path: '/docs/effects/fire',
    category: 'effect',
    animations: {
      default: { frames: 6, frameWidth: 32, frameHeight: 48, fps: 12 },
    },
    description: 'Animated fire effect',
  },
];

/**
 * Helper function to get sprite by ID
 */
export function getSpriteAsset(id: string): SpriteAsset | undefined {
  const allSprites = [
    ...HERO_SPRITES,
    ...TERRAIN_SPRITES,
    ...BUILDING_SPRITES,
    ...EFFECT_SPRITES,
  ];
  return allSprites.find(sprite => sprite.id === id);
}

/**
 * Helper function to get sprites by category
 */
export function getSpritesByCategory(category: SpriteAsset['category']): SpriteAsset[] {
  const allSprites = [
    ...HERO_SPRITES,
    ...TERRAIN_SPRITES,
    ...BUILDING_SPRITES,
    ...EFFECT_SPRITES,
  ];
  return allSprites.filter(sprite => sprite.category === category);
}

/**
 * Helper function to get all sprites
 */
export function getAllSprites(): SpriteAsset[] {
  return [
    ...HERO_SPRITES,
    ...TERRAIN_SPRITES,
    ...BUILDING_SPRITES,
    ...EFFECT_SPRITES,
  ];
}

/**
 * Best Practices for Sprite Usage:
 * 
 * 1. LOADING SPRITES
 *    - Use Phaser's load.spritesheet() for animated sprites
 *    - Use Phaser's load.image() for static sprites
 *    - Always preload in the preload() function
 * 
 * 2. SPRITE ANIMATIONS
 *    - Define animations after loading in create()
 *    - Use consistent naming: 'character_action' (e.g., 'knight_walk')
 *    - Set appropriate frame rates (fps) based on action
 * 
 * 3. SPRITE DIMENSIONS
 *    - Always know your sprite's actual dimensions
 *    - Use proper hitbox sizing with body.setSize()
 *    - Adjust offsets with body.setOffset() if needed
 * 
 * 4. PERFORMANCE
 *    - Use sprite pools for frequently created/destroyed objects
 *    - Limit active sprites (use object pooling)
 *    - Consider using texture atlases for many small sprites
 * 
 * 5. ORGANIZATION
 *    - Keep related sprites in the same category
 *    - Use consistent file naming conventions
 *    - Document sprite sheet layouts
 */

export const SPRITE_BEST_PRACTICES = `
SPRITE ASSET BEST PRACTICES:

1. FILE ORGANIZATION
   - Group by type: characters/, environment/, effects/, ui/
   - Use descriptive names: hero_knight_idle.png
   - Keep sprite sheets together with their JSON descriptors

2. SPRITE SHEET FORMAT
   - Use power-of-2 dimensions when possible (64x64, 128x128)
   - Consistent frame sizes within a sheet
   - Add padding between frames if needed
   - Export with transparent backgrounds (PNG)

3. LOADING IN PHASER
   \`\`\`typescript
   preload() {
     // For sprite sheets
     this.load.spritesheet('knight', '/path/to/knight.png', {
       frameWidth: 64,
       frameHeight: 64
     });
     
     // For static images
     this.load.image('grass', '/path/to/grass.png');
   }
   \`\`\`

4. CREATING ANIMATIONS
   \`\`\`typescript
   create() {
     this.anims.create({
       key: 'knight_walk',
       frames: this.anims.generateFrameNumbers('knight', { 
         start: 0, 
         end: 5 
       }),
       frameRate: 10,
       repeat: -1
     });
   }
   \`\`\`

5. PERFORMANCE TIPS
   - Reuse sprite instances when possible
   - Use groups for similar sprites
   - Destroy offscreen sprites
   - Use texture atlases for UI elements
   - Consider sprite compression for web builds
`;
