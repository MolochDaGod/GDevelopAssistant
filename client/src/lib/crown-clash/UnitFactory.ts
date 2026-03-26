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

    let mesh: THREE.Group;
    if (!template) {
      // Fallback: create a colored capsule placeholder
      console.warn(`[UnitFactory] No model for ${key}, using placeholder`);
      mesh = this.createPlaceholderUnit(faction, role, owner);
    } else {
      // Clone the model using SkeletonUtils for proper skeleton handling
      try {
        mesh = SkeletonUtils.clone(template) as THREE.Group;
      } catch {
        mesh = template.clone();
      }
    }

    mesh.position.copy(position);
    mesh.position.y = 0;

    // Flip enemy units to face player
    if (owner === 'enemy') {
      mesh.rotation.y = Math.PI;
    }

    // Setup animation mixer — try GLB clips on FBX skeleton
    let mixer: THREE.AnimationMixer | null = null;
    let animWorking = false;
    const idleClip = this.animationClips.get('idle');
    if (idleClip) {
      mixer = new THREE.AnimationMixer(mesh);
      try {
        const action = mixer.clipAction(idleClip);
        action.play();
        // Check if any tracks actually bind (animation retargeting test)
        const bound = action.getClip().tracks.some(t => {
          const parts = t.name.split('.');
          return mesh.getObjectByName(parts[0]) !== undefined;
        });
        animWorking = bound;
        if (!bound) {
          mixer.stopAllAction();
          mixer = null;
        }
      } catch {
        mixer = null;
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
    if (unit.currentAnim === animName) return;
    unit.currentAnim = animName;

    // Try skeleton animation if mixer exists
    if (unit.mixer) {
      const clip = this.animationClips.get(animName);
      if (clip) {
        try {
          unit.mixer.stopAllAction();
          const action = unit.mixer.clipAction(clip);
          if (animName === 'attack' || animName === 'hit' || animName === 'dodge') {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.reset().play();
            unit.mixer.addEventListener('finished', () => {
              if (!unit.isDead) this.playAnimation(unit, 'idle');
            });
          } else {
            action.play();
          }
          return; // Skeleton anim worked
        } catch { /* fall through to procedural */ }
      }
    }

    // Procedural animation fallback (always works)
    // These are applied in update() based on currentAnim
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
    const time = performance.now() * 0.001;
    for (const unit of units) {
      if (unit.isDead) continue;

      // Update skeleton mixer if present
      if (unit.mixer) unit.mixer.update(delta);

      // Procedural animation fallback (always runs — adds life even if skeleton anims work)
      const mesh = unit.mesh;
      if (unit.currentAnim === 'run') {
        // Bobbing motion while moving
        mesh.position.y = Math.abs(Math.sin(time * 8 + unit.mesh.id)) * 0.15;
        // Slight lean forward
        mesh.rotation.x = Math.sin(time * 6) * 0.05;
      } else if (unit.currentAnim === 'attack') {
        // Lunge forward pulse
        const pulse = Math.sin(time * 12) * 0.5;
        mesh.scale.setScalar(1 + Math.max(0, pulse) * 0.15);
        mesh.position.y = Math.max(0, pulse * 0.1);
      } else if (unit.currentAnim === 'hit') {
        // Recoil
        mesh.position.y = Math.abs(Math.sin(time * 15)) * 0.1;
        mesh.rotation.z = Math.sin(time * 10) * 0.15;
      } else {
        // Idle — gentle breathing bob
        mesh.position.y = Math.sin(time * 2 + unit.mesh.id) * 0.05;
        mesh.rotation.x = 0;
        mesh.rotation.z = 0;
        // Reset scale if it was pulsed from attack
        const s = mesh.scale.x;
        if (Math.abs(s - 1) > 0.01) mesh.scale.setScalar(1);
      }
    }
  }

  private createPlaceholderUnit(faction: FactionId, role: UnitRole, owner: 'player' | 'enemy'): THREE.Group {
    const group = new THREE.Group();
    const isHero = role === 'hero_king' || role === 'hero_queen';
    const height = isHero ? 2.0 : 1.4;
    const radius = isHero ? 0.5 : 0.35;

    // Body capsule
    const bodyGeo = new THREE.CapsuleGeometry(radius, height * 0.5, 4, 8);
    const factionColor = faction === 'elves' ? 0x22aa44 : 0xaa4422;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: factionColor,
      roughness: 0.6,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height * 0.5;
    body.castShadow = true;
    group.add(body);

    // Head sphere
    const headGeo = new THREE.SphereGeometry(radius * 0.7, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xeebb99, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = height * 0.85;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: owner === 'player' ? 0x44aaff : 0xff4444 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, height * 0.88, radius * 0.5);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, height * 0.88, radius * 0.5);
    group.add(rightEye);

    // Weapon indicator for role
    if (role.includes('ranged') || role === 'hero_queen') {
      // Bow-like arc
      const bowGeo = new THREE.TorusGeometry(0.3, 0.04, 4, 8, Math.PI);
      const bowMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const bow = new THREE.Mesh(bowGeo, bowMat);
      bow.position.set(0.4, height * 0.55, 0);
      bow.rotation.z = Math.PI / 2;
      group.add(bow);
    } else {
      // Sword
      const swordGeo = new THREE.BoxGeometry(0.08, 0.6, 0.04);
      const swordMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeo, swordMat);
      sword.position.set(0.4, height * 0.45, 0);
      group.add(sword);
    }

    // Hero crown
    if (isHero) {
      const crownGeo = new THREE.ConeGeometry(0.2, 0.3, 5);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.7, roughness: 0.2 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = height * 0.95 + 0.15;
      group.add(crown);
    }

    return group;
  }

  dispose(): void {
    this.modelCache.clear();
    this.animationClips.clear();
    this.textureCache.forEach(t => t.dispose());
    this.textureCache.clear();
  }
}
