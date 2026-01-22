import * as THREE from 'three';
import type { EntityConfig, GameEntity } from '../core/types';
import { createHealthBar } from './HealthBarFactory';
import { nanoid } from 'nanoid';

export interface EntityMeshConfig {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  scale?: number;
}

export function createCapsuleEntity(config: EntityConfig, meshConfig: EntityMeshConfig = {}): GameEntity {
  const {
    id = nanoid(),
    type,
    position,
    health = 100,
    maxHealth = 100,
    team,
    speed = 5,
    attackDamage = 10,
    attackRange = 2,
    showHealthBar = true,
    healthBarOffset = 2.5,
    scale = 1,
    color = 0x4488ff,
  } = config;

  const group = new THREE.Group();
  
  const bodyGeometry = meshConfig.geometry || new THREE.CapsuleGeometry(0.4 * scale, 1.2 * scale, 8, 16);
  const bodyMaterial = meshConfig.material || new THREE.MeshStandardMaterial({
    color: meshConfig.color || color,
    emissive: meshConfig.emissive || color,
    emissiveIntensity: meshConfig.emissiveIntensity || 0.2,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  if (showHealthBar) {
    const healthBar = createHealthBar({
      offsetY: healthBarOffset * scale,
      fillColor: team === 'red' ? 0xff4444 : 0x44ff44,
    });
    group.add(healthBar.group);
  }

  const pos = Array.isArray(position) 
    ? new THREE.Vector3(position[0], position[1], position[2])
    : position.clone();
  
  group.position.copy(pos);

  return {
    id,
    type,
    mesh: group,
    position: pos,
    health,
    maxHealth,
    team,
    velocity: new THREE.Vector3(),
    speed,
    attackDamage,
    attackRange,
    attackCooldown: 1,
    lastAttackTime: 0,
    isAlive: true,
  };
}

export function createBoxEntity(config: EntityConfig, size: [number, number, number] = [1, 1, 1]): GameEntity {
  const {
    id = nanoid(),
    type,
    position,
    health = 100,
    maxHealth = 100,
    team,
    showHealthBar = true,
    healthBarOffset = 2,
    color = 0x888888,
  } = config;

  const group = new THREE.Group();
  
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = size[1] / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  if (showHealthBar) {
    const healthBar = createHealthBar({
      offsetY: healthBarOffset + size[1],
      fillColor: team === 'red' ? 0xff4444 : 0x44ff44,
    });
    group.add(healthBar.group);
  }

  const pos = Array.isArray(position)
    ? new THREE.Vector3(position[0], position[1], position[2])
    : position.clone();
  
  group.position.copy(pos);

  return {
    id,
    type,
    mesh: group,
    position: pos,
    health,
    maxHealth,
    team,
    isAlive: true,
  };
}

export function createSphereEntity(config: EntityConfig, radius: number = 0.5): GameEntity {
  const {
    id = nanoid(),
    type,
    position,
    health = 100,
    maxHealth = 100,
    team,
    speed = 5,
    showHealthBar = true,
    healthBarOffset = 1.5,
    color = 0xffff00,
  } = config;

  const group = new THREE.Group();
  
  const geometry = new THREE.SphereGeometry(radius, 16, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = radius;
  mesh.castShadow = true;
  group.add(mesh);

  if (showHealthBar) {
    const healthBar = createHealthBar({
      offsetY: healthBarOffset + radius,
      fillColor: team === 'red' ? 0xff4444 : 0x44ff44,
    });
    group.add(healthBar.group);
  }

  const pos = Array.isArray(position)
    ? new THREE.Vector3(position[0], position[1], position[2])
    : position.clone();
  
  group.position.copy(pos);

  return {
    id,
    type,
    mesh: group,
    position: pos,
    health,
    maxHealth,
    team,
    velocity: new THREE.Vector3(),
    speed,
    isAlive: true,
  };
}

export function disposeEntity(entity: GameEntity): void {
  entity.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
  
  if (entity.mixer) {
    entity.mixer.stopAllAction();
  }
}
