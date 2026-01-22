/**
 * Shared 3D Engine Utilities for Grudge Platform
 * 
 * This module provides common utilities for 3D games using Three.js or Babylon.js.
 * Based on patterns from Grudge Warlords Builder.
 */

// Scene configuration types
export interface SceneConfig {
  id: string;
  name: string;
  description: string;
  engine: '3js' | 'babylon';
  features: string[];
}

// Camera presets based on game type
export interface CameraPreset {
  type: 'rts' | 'fps' | 'third-person' | 'isometric' | 'platformer';
  fov: number;
  near: number;
  far: number;
  position: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  rts: {
    type: 'rts',
    fov: 60,
    near: 0.1,
    far: 20000,
    position: { x: 0, y: 200, z: -150 },
    target: { x: 0, y: 0, z: 0 }
  },
  platformer: {
    type: 'platformer',
    fov: 75,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 5, z: 10 },
    target: { x: 0, y: 0, z: 0 }
  },
  thirdPerson: {
    type: 'third-person',
    fov: 60,
    near: 0.1,
    far: 5000,
    position: { x: 0, y: 8, z: -15 },
    target: { x: 0, y: 2, z: 0 }
  },
  fps: {
    type: 'fps',
    fov: 90,
    near: 0.1,
    far: 2000,
    position: { x: 0, y: 1.7, z: 0 }
  },
  isometric: {
    type: 'isometric',
    fov: 45,
    near: 0.1,
    far: 10000,
    position: { x: 100, y: 100, z: 100 },
    target: { x: 0, y: 0, z: 0 }
  }
};

// Material types based on Three.js documentation
export type MaterialType = 'basic' | 'lambert' | 'phong' | 'standard' | 'physical';

export interface MaterialConfig {
  type: MaterialType;
  color?: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  transparent?: boolean;
  opacity?: number;
}

export const MATERIAL_PRESETS: Record<string, MaterialConfig> = {
  metal: { type: 'standard', roughness: 0.3, metalness: 0.9 },
  wood: { type: 'lambert', color: '#8B4513' },
  grass: { type: 'standard', color: '#228B22', roughness: 0.8 },
  stone: { type: 'standard', color: '#808080', roughness: 0.9 },
  water: { type: 'physical', color: '#0077be', transparent: true, opacity: 0.7 },
  glass: { type: 'physical', transparent: true, opacity: 0.3 }
};

// Physics settings
export interface PhysicsConfig {
  gravity: { x: number; y: number; z: number };
  restitution: number;
  friction: number;
}

export const PHYSICS_PRESETS: Record<string, PhysicsConfig> = {
  earth: { gravity: { x: 0, y: -9.81, z: 0 }, restitution: 0.3, friction: 0.8 },
  moon: { gravity: { x: 0, y: -1.62, z: 0 }, restitution: 0.5, friction: 0.3 },
  space: { gravity: { x: 0, y: 0, z: 0 }, restitution: 1.0, friction: 0.0 },
  underwater: { gravity: { x: 0, y: -2.0, z: 0 }, restitution: 0.1, friction: 0.9 }
};

// Lighting presets
export interface LightingPreset {
  ambient: { color: string; intensity: number };
  directional?: { color: string; intensity: number; position: { x: number; y: number; z: number } };
  fog?: { color: string; near: number; far: number };
}

export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  day: {
    ambient: { color: '#ffffff', intensity: 0.4 },
    directional: { color: '#fffaf0', intensity: 1.0, position: { x: 50, y: 100, z: 50 } },
    fog: { color: '#87CEEB', near: 100, far: 1000 }
  },
  night: {
    ambient: { color: '#1a1a2e', intensity: 0.2 },
    directional: { color: '#4a4a6a', intensity: 0.3, position: { x: -30, y: 50, z: -30 } },
    fog: { color: '#0a0a1a', near: 50, far: 500 }
  },
  sunset: {
    ambient: { color: '#ff6b35', intensity: 0.3 },
    directional: { color: '#ff8c42', intensity: 0.8, position: { x: -100, y: 30, z: 0 } },
    fog: { color: '#ff7f50', near: 100, far: 800 }
  },
  indoor: {
    ambient: { color: '#ffecd2', intensity: 0.5 },
    directional: { color: '#fff8e7', intensity: 0.6, position: { x: 0, y: 10, z: 0 } }
  }
};

// Asset loading helpers
export interface AssetManifest {
  models: Array<{ id: string; path: string; type: 'gltf' | 'glb' | 'fbx' | 'obj' }>;
  textures: Array<{ id: string; path: string; type: 'diffuse' | 'normal' | 'roughness' | 'metalness' | 'ao' }>;
  audio: Array<{ id: string; path: string; type: 'sfx' | 'music' | 'ambient' }>;
}

// Movement controls based on Stemkoski patterns
export interface MovementConfig {
  moveSpeed: number;
  rotateSpeed: number;
  jumpForce?: number;
  usePhysics: boolean;
}

export const MOVEMENT_PRESETS: Record<string, MovementConfig> = {
  character: { moveSpeed: 5, rotateSpeed: 2, jumpForce: 10, usePhysics: true },
  vehicle: { moveSpeed: 20, rotateSpeed: 1.5, usePhysics: true },
  flying: { moveSpeed: 15, rotateSpeed: 2, usePhysics: false },
  rtsUnit: { moveSpeed: 3, rotateSpeed: 4, usePhysics: true }
};

// Post-processing effects
export type PostProcessEffect = 'bloom' | 'ssao' | 'fxaa' | 'vignette' | 'dof' | 'motionBlur' | 'colorGrading';

export interface PostProcessConfig {
  enabled: boolean;
  effects: PostProcessEffect[];
  bloom?: { threshold: number; intensity: number; radius: number };
  vignette?: { offset: number; darkness: number };
  colorGrading?: { contrast: number; saturation: number; brightness: number };
}

export const POST_PROCESS_PRESETS: Record<string, PostProcessConfig> = {
  cinematic: {
    enabled: true,
    effects: ['bloom', 'vignette', 'colorGrading', 'fxaa'],
    bloom: { threshold: 0.8, intensity: 0.5, radius: 0.4 },
    vignette: { offset: 0.3, darkness: 0.5 },
    colorGrading: { contrast: 1.1, saturation: 1.0, brightness: 1.0 }
  },
  retro: {
    enabled: true,
    effects: ['vignette', 'colorGrading'],
    vignette: { offset: 0.5, darkness: 0.7 },
    colorGrading: { contrast: 1.3, saturation: 0.8, brightness: 0.9 }
  },
  performance: {
    enabled: true,
    effects: ['fxaa']
  }
};

// Warlords Builder scene types (matches the Babylon.js implementation)
export const WARLORDS_SCENES = [
  'builder', 'day', 'night', 'outdoor', 'inn', 'town', 'room', 'underground'
] as const;

export type WarlordsScene = typeof WARLORDS_SCENES[number];

// Generate Warlords Builder URL with parameters
export function getWarlordsBuilderUrl(scene: WarlordsScene = 'outdoor', debug = false): string {
  const params = new URLSearchParams();
  params.set('scene', scene);
  if (debug) params.set('debug', 'true');
  return `/grudge-warlords/index.html?${params.toString()}`;
}

// Utility to convert hex color to RGB array
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
}

// Utility to lerp between values
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Utility to clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Delta time helper for frame-rate independent movement
export function getDeltaTime(lastTime: number): { delta: number; now: number } {
  const now = performance.now();
  const delta = (now - lastTime) / 1000; // Convert to seconds
  return { delta: clamp(delta, 0, 0.1), now }; // Cap at 100ms to prevent huge jumps
}

// Simple vector math utilities
export const Vec3 = {
  add: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  }),
  sub: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  }),
  scale: (v: { x: number; y: number; z: number }, s: number) => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s
  }),
  length: (v: { x: number; y: number; z: number }) => 
    Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  normalize: (v: { x: number; y: number; z: number }) => {
    const len = Vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return Vec3.scale(v, 1 / len);
  },
  dot: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
    a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }),
  lerp: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, t: number) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t)
  })
};

// Input handling utilities
export interface InputState {
  keys: Set<string>;
  mouse: { x: number; y: number; buttons: number };
  touch: Array<{ id: number; x: number; y: number }>;
}

export function createInputHandler(canvas: HTMLCanvasElement): InputState {
  const state: InputState = {
    keys: new Set(),
    mouse: { x: 0, y: 0, buttons: 0 },
    touch: []
  };

  window.addEventListener('keydown', (e) => state.keys.add(e.code));
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  
  canvas.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
  });
  
  canvas.addEventListener('mousedown', (e) => state.mouse.buttons = e.buttons);
  canvas.addEventListener('mouseup', (e) => state.mouse.buttons = e.buttons);
  
  canvas.addEventListener('touchstart', (e) => {
    state.touch = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
  });
  
  canvas.addEventListener('touchmove', (e) => {
    state.touch = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
  });
  
  canvas.addEventListener('touchend', (e) => {
    state.touch = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
  });

  return state;
}

// Check if key is pressed (supports WASD and arrow keys)
export function isMovementKey(state: InputState, direction: 'forward' | 'back' | 'left' | 'right'): boolean {
  switch (direction) {
    case 'forward': return state.keys.has('KeyW') || state.keys.has('ArrowUp');
    case 'back': return state.keys.has('KeyS') || state.keys.has('ArrowDown');
    case 'left': return state.keys.has('KeyA') || state.keys.has('ArrowLeft');
    case 'right': return state.keys.has('KeyD') || state.keys.has('ArrowRight');
  }
}
