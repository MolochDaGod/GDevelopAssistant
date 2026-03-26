import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export type FactionId = 'elves' | 'orcs';
export type UnitRole = 'melee' | 'ranged' | 'elite_melee' | 'elite_ranged' | 'hero_king' | 'hero_queen';

export interface UnitStats {
  health: number;
  maxHealth: number;
  damage: number;
  attackRange: number;
  attackRate: number;
  speed: number;
  isRanged: boolean;
  isTank: boolean;
  isHero: boolean;
}

export interface GameUnit {
  id: string;
  mesh: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  stats: UnitStats;
  owner: 'player' | 'enemy';
  faction: FactionId;
  role: UnitRole;
  target: GameUnit | GameBuilding | null;
  lane: 'left' | 'right' | 'center';
  waypoint: THREE.Vector3 | null;
  currentAnim: string;
  isDead: boolean;
  nextAttackTime: number;
  healthBar: THREE.Sprite | null;
  selectionRing: THREE.Mesh | null;
  isSelected: boolean;
}

export interface GameBuilding {
  id: string;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  damage: number;
  range: number;
  attackRate: number;
  owner: 'player' | 'enemy';
  type: string;
  isKing: boolean;
  destroyed: boolean;
  lane: 'left' | 'right' | 'center';
  nextAttackTime: number;
  spawnTimer: number;
  spawnsUnit: string | null;
  spawnInterval: number;
  position: THREE.Vector3;
  healthBar: THREE.Sprite | null;
}

const BASE_PATH = '/models/crown-clash';

const ROLE_STATS: Record<UnitRole, Omit<UnitStats, 'maxHealth'>> = {
  melee: { health: 120, damage: 25, attackRange: 2.5, attackRate: 1.0, speed: 4, isRanged: false, isTank: false, isHero: false },
  ranged: { health: 80, damage: 20, attackRange: 10, attackRate: 0.8, speed: 3.5, isRanged: true, isTank: false, isHero: false },
  elite_melee: { health: 200, damage: 40, attackRange: 3, attackRate: 0.9, speed: 3.5, isRanged: false, isTank: true, isHero: false },
  elite_ranged: { health: 100, damage: 35, attackRange: 12, attackRate: 0.7, speed: 3, isRanged: true, isTank: false, isHero: false },
  hero_king: { health: 500, damage: 65, attackRange: 4, attackRate: 0.8, speed: 4.5, isRanged: false, isTank: true, isHero: true },
  hero_queen: { health: 400, damage: 55, attackRange: 14, attackRate: 0.6, speed: 4, isRanged: true, isTank: false, isHero: true },
};

export class UnitFactory {
  private fbxLoader = new FBXLoader();
  private gltfLoader = new GLTFLoader();
  private modelCache: Map<string, THREE.Group> = new Map();
  private animationClips: Map<string, THREE.AnimationClip> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private scene: THREE.Scene;
  private nextId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  async preloadFaction(faction: FactionId): Promise<void> {
    const subdir = faction === 'elves' ? 'elves' : 'orcs';
    const texturePath = faction === 'elves'
      ? `${BASE_PATH}/elves/texture/Texture_MAp_ELfs.png`
      : `${BASE_PATH}/orcs/texture/Texture_MAp.png`;

    // Load texture atlas
    if (!this.textureCache.has(faction)) {
      const loader = new THREE.TextureLoader();
      const tex = await loader.loadAsync(texturePath);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.textureCache.set(faction, tex);
    }

    // Load manifest to get model list
    const manifestResp = await fetch(`${BASE_PATH}/crown-clash-assets.json`);
    const manifest = await manifestResp.json();
    const factionData = manifest.factions[faction];

    // Load all models for this faction
    for (const model of factionData.models) {
      const key = `${faction}/${model.name}`;
      if (this.modelCache.has(key)) continue;

      try {
        const fbx = await this.loadFBX(`${BASE_PATH}/${model.path}`);
        // Apply texture atlas
        const texture = this.textureCache.get(faction)!;
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.7,
              metalness: 0.1,
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Normalize scale - Craftpix models are ~100 units tall, we want ~1.5 units
        const box = new THREE.Box3().setFromObject(fbx);
        const height = box.getSize(new THREE.Vector3()).y;
        const targetHeight = model.type === 'hero' ? 2.0 : 1.4;
        fbx.scale.setScalar(targetHeight / height);

        this.modelCache.set(key, fbx);
      } catch (err) {
        console.warn(`[UnitFactory] Failed to load ${model.path}:`, err);
      }
    }

    console.log(`[UnitFactory] Preloaded ${this.modelCache.size} models for ${faction}`);
  }

  async preloadAnimations(): Promise<void> {
    const animNames = ['idle', 'run', 'attack', 'hit', 'dodge', 'spell', 'jump', 'collect', 'limp', 'dive'];
    
    for (const name of animNames) {
      const url = `${BASE_PATH}/animations/${name}.glb`;
      try {
        const gltf = await this.gltfLoader.loadAsync(url);
        if (gltf.animations.length > 0) {
          const clip = gltf.animations[0].clone();
          clip.name = name;
          this.animationClips.set(name, clip);
        }
      } catch {
        console.warn(`[UnitFactory] Animation not found: ${name}`);
      }
    }
    console.log(`[UnitFactory] Loaded ${this.animationClips.size} animation clips`);
  }

  private loadFBX(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(url, resolve, undefined, reject);
    });
  }

  spawnUnit(
    faction: FactionId,
    role: UnitRole,
    owner: 'player' | 'enemy',
    position: THREE.Vector3,
    lane: 'left' | 'right' | 'center'
  ): GameUnit | null {
    // Pick a model based on role
    const modelName = this.getModelNameForRole(faction, role);
    const key = `${faction}/${modelName}`;
    const template = this.modelCache.get(key);

    if (!template) {
      console.warn(`[UnitFactory] No model cached for ${key}`);
      return null;
    }

    // Clone the model using SkeletonUtils for proper skeleton handling
    let mesh: THREE.Group;
    try {
      mesh = SkeletonUtils.clone(template) as THREE.Group;
    } catch {
      mesh = template.clone();
    }

    mesh.position.copy(position);
    mesh.position.y = 0;

    // Flip enemy units to face player
    if (owner === 'enemy') {
      mesh.rotation.y = Math.PI;
    }

    // Setup animation mixer
    let mixer: THREE.AnimationMixer | null = null;
    const idleClip = this.animationClips.get('idle');
    if (idleClip) {
      mixer = new THREE.AnimationMixer(mesh);
      try {
        const action = mixer.clipAction(idleClip);
        action.play();
      } catch {
        // Animation retargeting may fail on different skeletons - that's OK
      }
    }

    // Health bar sprite
    const healthBar = this.createHealthBar();
    healthBar.position.y = 2.2;
    mesh.add(healthBar);

    // Selection ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: owner === 'player' ? 0x00ff00 : 0xff0000,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.05;
    mesh.add(selectionRing);

    this.scene.add(mesh);

    const baseStats = ROLE_STATS[role];
    const id = `unit_${this.nextId++}`;

    const unit: GameUnit = {
      id,
      mesh,
      mixer,
      stats: { ...baseStats, maxHealth: baseStats.health },
      owner,
      faction,
      role,
      target: null,
      lane,
      waypoint: null,
      currentAnim: 'idle',
      isDead: false,
      nextAttackTime: 0,
      healthBar,
      selectionRing,
      isSelected: false,
    };

    return unit;
  }

  private getModelNameForRole(faction: FactionId, role: UnitRole): string {
    // Map roles to specific models from manifest unitRoles
    const roleMap: Record<FactionId, Record<UnitRole, string[]>> = {
      elves: {
        melee: ['elf_commoner_1', 'elf_commoner_2', 'elf_commoner_3'],
        ranged: ['elf_commoner_4', 'elf_commoner_5', 'elf_commoner_6'],
        elite_melee: ['elf_upper_class_1', 'elf_upper_class_2', 'elf_upper_class_3'],
        elite_ranged: ['elf_upper_class_4', 'elf_upper_class_5', 'elf_upper_class_6'],
        hero_king: ['king'],
        hero_queen: ['queen'],
      },
      orcs: {
        melee: ['orcs_city_dwellers_1', 'orcs_city_dwellers_2', 'orcs_city_dwellers_3'],
        ranged: ['orcs_city_dwellers_4', 'orcs_dwellers_6', 'city_dwellers_5_test'],
        elite_melee: ['peasant_1', 'peasant_2', 'peasant_3'],
        elite_ranged: ['peasant_4', 'peasant_5', 'peasant_6'],
        hero_king: ['king'],
        hero_queen: ['queen'],
      },
    };

    const names = roleMap[faction][role];
    return names[Math.floor(Math.random() * names.length)];
  }

  playAnimation(unit: GameUnit, animName: string): void {
    if (!unit.mixer || unit.currentAnim === animName) return;
    
    const clip = this.animationClips.get(animName);
    if (!clip) return;

    try {
      unit.mixer.stopAllAction();
      const action = unit.mixer.clipAction(clip);
      
      if (animName === 'attack' || animName === 'hit' || animName === 'dodge') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.reset().play();
        
        // Return to idle after one-shot
        unit.mixer.addEventListener('finished', () => {
          if (!unit.isDead) this.playAnimation(unit, 'idle');
        });
      } else {
        action.play();
      }
      
      unit.currentAnim = animName;
    } catch {
      // Skeleton mismatch - use procedural animation
    }
  }

  updateHealthBar(unit: GameUnit): void {
    if (!unit.healthBar) return;
    const ratio = Math.max(0, unit.stats.health / unit.stats.maxHealth);
    
    // Color: green > yellow > red
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 64, 8);
    
    const color = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = color;
    ctx.fillRect(1, 1, 62 * ratio, 6);
    
    const texture = new THREE.CanvasTexture(canvas);
    (unit.healthBar.material as THREE.SpriteMaterial).map?.dispose();
    (unit.healthBar.material as THREE.SpriteMaterial).map = texture;
    (unit.healthBar.material as THREE.SpriteMaterial).needsUpdate = true;
  }

  private createHealthBar(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 64, 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.15, 1);
    return sprite;
  }

  setSelected(unit: GameUnit, selected: boolean): void {
    unit.isSelected = selected;
    if (unit.selectionRing) {
      (unit.selectionRing.material as THREE.MeshBasicMaterial).opacity = selected ? 0.6 : 0;
    }
  }

  removeUnit(unit: GameUnit): void {
    if (unit.mixer) unit.mixer.stopAllAction();
    this.scene.remove(unit.mesh);
    unit.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  update(units: GameUnit[], delta: number): void {
    for (const unit of units) {
      if (unit.mixer) unit.mixer.update(delta);
    }
  }

  dispose(): void {
    this.modelCache.clear();
    this.animationClips.clear();
    this.textureCache.forEach(t => t.dispose());
    this.textureCache.clear();
  }
}
