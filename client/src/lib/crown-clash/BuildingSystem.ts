import * as THREE from 'three';
import type { GameBuilding } from './UnitFactory';
import { ARENA_CONSTANTS } from './CrownClashScene';

export type BuildingType = 'king_tower' | 'princess_tower' | 'barracks' | 'archery_range' | 'mage_tower' | 'healing_shrine' | 'siege_workshop' | 'fortification' | 'spawner_hut' | 'bomb_tower';

interface BuildingTemplate {
  type: BuildingType;
  health: number;
  damage: number;
  range: number;
  attackRate: number;
  spawnsUnit: string | null;
  spawnInterval: number;
  color: number;
  width: number;
  height: number;
  depth: number;
  isDefensive: boolean;
}

const BUILDING_TEMPLATES: Record<BuildingType, BuildingTemplate> = {
  king_tower: { type: 'king_tower', health: 4000, damage: 120, range: 8, attackRate: 0.8, spawnsUnit: null, spawnInterval: 0, color: 0xb8860b, width: 3, height: 4, depth: 3, isDefensive: true },
  princess_tower: { type: 'princess_tower', health: 2000, damage: 90, range: 7, attackRate: 1.0, spawnsUnit: null, spawnInterval: 0, color: 0x808080, width: 2, height: 3, depth: 2, isDefensive: true },
  barracks: { type: 'barracks', health: 600, damage: 0, range: 0, attackRate: 0, spawnsUnit: 'melee', spawnInterval: 8, color: 0x8b4513, width: 2.5, height: 2, depth: 2.5, isDefensive: false },
  archery_range: { type: 'archery_range', health: 500, damage: 0, range: 0, attackRate: 0, spawnsUnit: 'ranged', spawnInterval: 10, color: 0x228b22, width: 2.5, height: 2.5, depth: 2, isDefensive: false },
  mage_tower: { type: 'mage_tower', health: 450, damage: 50, range: 10, attackRate: 1.5, spawnsUnit: 'elite_ranged', spawnInterval: 14, color: 0x4b0082, width: 2, height: 3.5, depth: 2, isDefensive: true },
  healing_shrine: { type: 'healing_shrine', health: 400, damage: 0, range: 6, attackRate: 0, spawnsUnit: null, spawnInterval: 0, color: 0x00ff7f, width: 2, height: 2, depth: 2, isDefensive: false },
  siege_workshop: { type: 'siege_workshop', health: 700, damage: 0, range: 0, attackRate: 0, spawnsUnit: 'elite_melee', spawnInterval: 16, color: 0x696969, width: 3, height: 2, depth: 3, isDefensive: false },
  fortification: { type: 'fortification', health: 1200, damage: 0, range: 0, attackRate: 0, spawnsUnit: null, spawnInterval: 0, color: 0xa0a0a0, width: 4, height: 2.5, depth: 1.5, isDefensive: true },
  spawner_hut: { type: 'spawner_hut', health: 350, damage: 0, range: 0, attackRate: 0, spawnsUnit: 'melee', spawnInterval: 5, color: 0xdeb887, width: 2, height: 1.5, depth: 2, isDefensive: false },
  bomb_tower: { type: 'bomb_tower', health: 500, damage: 100, range: 5, attackRate: 2.0, spawnsUnit: null, spawnInterval: 0, color: 0x8b0000, width: 2, height: 3, depth: 2, isDefensive: true },
};

export class BuildingSystem {
  private scene: THREE.Scene;
  private buildings: GameBuilding[] = [];
  private placementGhost: THREE.Group | null = null;
  private nextId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createInitialBuildings(playerFaction: 'elves' | 'orcs'): GameBuilding[] {
    const { WIDTH, DEPTH, RIVER_HALF_WIDTH } = ARENA_CONSTANTS;
    
    // Player buildings (south / +Z)
    const playerKing = this.createBuilding('king_tower', 'player', new THREE.Vector3(0, 0, DEPTH / 2 - 4), 'center', true);
    const playerLeftTower = this.createBuilding('princess_tower', 'player', new THREE.Vector3(-6, 0, DEPTH / 2 - 10), 'left', false);
    const playerRightTower = this.createBuilding('princess_tower', 'player', new THREE.Vector3(6, 0, DEPTH / 2 - 10), 'right', false);

    // Enemy buildings (north / -Z)
    const enemyKing = this.createBuilding('king_tower', 'enemy', new THREE.Vector3(0, 0, -DEPTH / 2 + 4), 'center', true);
    const enemyLeftTower = this.createBuilding('princess_tower', 'enemy', new THREE.Vector3(-6, 0, -DEPTH / 2 + 10), 'left', false);
    const enemyRightTower = this.createBuilding('princess_tower', 'enemy', new THREE.Vector3(6, 0, -DEPTH / 2 + 10), 'right', false);

    this.buildings = [playerKing, playerLeftTower, playerRightTower, enemyKing, enemyLeftTower, enemyRightTower];
    return this.buildings;
  }

  createBuilding(
    type: BuildingType,
    owner: 'player' | 'enemy',
    position: THREE.Vector3,
    lane: 'left' | 'right' | 'center',
    isKing: boolean
  ): GameBuilding {
    const template = BUILDING_TEMPLATES[type];
    const mesh = this.buildMesh(template, owner);
    mesh.position.copy(position);

    this.scene.add(mesh);

    // Health bar
    const healthBar = this.createHealthBar(template.width + 0.5);
    healthBar.position.y = template.height + 0.5;
    mesh.add(healthBar);

    const building: GameBuilding = {
      id: `building_${this.nextId++}`,
      mesh,
      health: template.health,
      maxHealth: template.health,
      damage: template.damage,
      range: template.range,
      attackRate: template.attackRate,
      owner,
      type,
      isKing,
      destroyed: false,
      lane,
      nextAttackTime: 0,
      spawnTimer: template.spawnInterval > 0 ? template.spawnInterval : 0,
      spawnsUnit: template.spawnsUnit,
      spawnInterval: template.spawnInterval,
      position: position.clone(),
      healthBar,
    };

    this.buildings.push(building);
    return building;
  }

  private buildMesh(template: BuildingTemplate, owner: 'player' | 'enemy'): THREE.Group {
    const group = new THREE.Group();
    const ownerTint = owner === 'player' ? 0.8 : 1.2;

    if (template.type === 'king_tower' || template.type === 'princess_tower') {
      // Castle-like tower
      const baseGeo = new THREE.CylinderGeometry(template.width / 2, template.width / 2 + 0.3, template.height * 0.7, 8);
      const baseMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(template.color).multiplyScalar(ownerTint),
        roughness: 0.8,
        metalness: 0.1,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = template.height * 0.35;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // Battlements
      const topGeo = new THREE.CylinderGeometry(template.width / 2 + 0.2, template.width / 2, template.height * 0.3, 8);
      const topMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(template.color).multiplyScalar(ownerTint * 0.8),
        roughness: 0.7,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = template.height * 0.85;
      top.castShadow = true;
      group.add(top);

      // King crown
      if (template.type === 'king_tower') {
        const crownGeo = new THREE.ConeGeometry(0.4, 0.8, 6);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6, roughness: 0.2 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.y = template.height + 0.4;
        group.add(crown);
      }
    } else if (template.type === 'fortification') {
      // Wall section
      const wallGeo = new THREE.BoxGeometry(template.width, template.height, template.depth);
      const wallMat = new THREE.MeshStandardMaterial({ color: template.color, roughness: 0.9 });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = template.height / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    } else {
      // Generic building (box with roof)
      const bodyGeo = new THREE.BoxGeometry(template.width, template.height * 0.6, template.depth);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(template.color).multiplyScalar(ownerTint),
        roughness: 0.7,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = template.height * 0.3;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Pyramid roof
      const roofGeo = new THREE.ConeGeometry(Math.max(template.width, template.depth) / 2 + 0.3, template.height * 0.4, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = template.height * 0.6 + template.height * 0.2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      // Door
      const doorGeo = new THREE.PlaneGeometry(0.6, 0.9);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 0.45, template.depth / 2 + 0.01);
      group.add(door);
    }

    // Owner indicator ring
    const ringGeo = new THREE.RingGeometry(template.width / 2 + 0.2, template.width / 2 + 0.5, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: owner === 'player' ? 0x3366ff : 0xff3333,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    return group;
  }

  showPlacementGhost(type: BuildingType, position: THREE.Vector3): void {
    this.hidePlacementGhost();
    
    const template = BUILDING_TEMPLATES[type];
    this.placementGhost = this.buildMesh(template, 'player');
    this.placementGhost.position.copy(position);

    // Make ghost transparent
    this.placementGhost.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = (child.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = 0.5;
        child.material = mat;
      }
    });

    this.scene.add(this.placementGhost);
  }

  updatePlacementGhost(position: THREE.Vector3, valid: boolean): void {
    if (!this.placementGhost) return;
    this.placementGhost.position.copy(position);
    
    this.placementGhost.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.emissive = new THREE.Color(valid ? 0x00ff00 : 0xff0000);
        mat.emissiveIntensity = 0.3;
      }
    });
  }

  hidePlacementGhost(): void {
    if (this.placementGhost) {
      this.scene.remove(this.placementGhost);
      this.placementGhost = null;
    }
  }

  isValidPlacement(position: THREE.Vector3, owner: 'player' | 'enemy'): boolean {
    const { RIVER_HALF_WIDTH, DEPTH } = ARENA_CONSTANTS;
    
    // Must be on own territory
    if (owner === 'player' && position.z <= RIVER_HALF_WIDTH + 1) return false;
    if (owner === 'enemy' && position.z >= -RIVER_HALF_WIDTH - 1) return false;

    // Not too close to existing buildings
    for (const b of this.buildings) {
      if (b.destroyed) continue;
      const dist = b.position.distanceTo(position);
      if (dist < 3) return false;
    }

    return true;
  }

  destroyBuilding(building: GameBuilding): void {
    building.destroyed = true;
    building.health = 0;

    // Visual destruction - shrink and darken
    building.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.color.multiplyScalar(0.3);
        mat.emissive = new THREE.Color(0x331100);
        mat.emissiveIntensity = 0.5;
      }
    });
    building.mesh.scale.setScalar(0.6);
    building.mesh.position.y -= 0.5;
  }

  updateHealthBar(building: GameBuilding): void {
    if (!building.healthBar) return;
    const ratio = Math.max(0, building.health / building.maxHealth);
    
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
    (building.healthBar.material as THREE.SpriteMaterial).map?.dispose();
    (building.healthBar.material as THREE.SpriteMaterial).map = texture;
    (building.healthBar.material as THREE.SpriteMaterial).needsUpdate = true;
  }

  private createHealthBar(width: number = 2): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, 64, 8);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, 0.2, 1);
    return sprite;
  }

  getBuildings(): GameBuilding[] { return this.buildings; }
  
  getPlayerBuildings(): GameBuilding[] { return this.buildings.filter(b => b.owner === 'player'); }
  
  getEnemyBuildings(): GameBuilding[] { return this.buildings.filter(b => b.owner === 'enemy'); }

  getBuildingTemplate(type: BuildingType): BuildingTemplate { return BUILDING_TEMPLATES[type]; }

  dispose(): void {
    for (const b of this.buildings) {
      this.scene.remove(b.mesh);
    }
    this.hidePlacementGhost();
    this.buildings = [];
  }
}
