import * as THREE from 'three';

export interface SceneConfig {
  backgroundColor?: number;
  fogColor?: number;
  fogDensity?: number;
  fogNear?: number;
  fogFar?: number;
  fogType?: 'linear' | 'exponential';
  antialias?: boolean;
  shadows?: boolean;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
}

export interface CameraConfig {
  type: 'perspective' | 'orthographic';
  fov?: number;
  near?: number;
  far?: number;
  position?: THREE.Vector3 | [number, number, number];
  lookAt?: THREE.Vector3 | [number, number, number];
  orthoSize?: number;
}

export interface LightConfig {
  ambient?: {
    color: number;
    intensity: number;
  };
  directional?: {
    color: number;
    intensity: number;
    position: [number, number, number];
    castShadow?: boolean;
    shadowMapSize?: number;
  };
  hemisphere?: {
    skyColor: number;
    groundColor: number;
    intensity: number;
  };
  points?: Array<{
    color: number;
    intensity: number;
    distance: number;
    position: [number, number, number];
  }>;
}

export interface GameEntity {
  id: string;
  type: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  team?: string;
  velocity?: THREE.Vector3;
  speed?: number;
  attackDamage?: number;
  attackRange?: number;
  attackCooldown?: number;
  lastAttackTime?: number;
  isAlive?: boolean;
  mixer?: THREE.AnimationMixer;
  animations?: Map<string, THREE.AnimationAction>;
  currentAnimation?: string;
  data?: Record<string, unknown>;
}

export interface EntityConfig {
  id?: string;
  type: string;
  position: THREE.Vector3 | [number, number, number];
  health?: number;
  maxHealth?: number;
  team?: string;
  speed?: number;
  attackDamage?: number;
  attackRange?: number;
  showHealthBar?: boolean;
  healthBarOffset?: number;
  scale?: number;
  color?: number;
}

export interface GameLoopState {
  isRunning: boolean;
  isPaused: boolean;
  deltaTime: number;
  elapsedTime: number;
  frameCount: number;
}

export interface InputState {
  keys: Set<string>;
  mouse: {
    x: number;
    y: number;
    buttons: Set<number>;
    wheel: number;
  };
  touch: {
    active: boolean;
    points: Array<{ x: number; y: number; id: number }>;
  };
}

export interface AssetMetadata {
  id: string;
  path: string;
  type: 'model' | 'texture' | 'audio' | 'animation';
  category?: string;
  scale?: number;
  colliderType?: 'box' | 'sphere' | 'capsule' | 'mesh';
  colliderSize?: [number, number, number];
  animations?: string[];
}

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  metadata?: AssetMetadata;
}

export type UpdateCallback = (delta: number, elapsed: number) => void;
export type CleanupCallback = () => void;
