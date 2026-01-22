import * as THREE from 'three';

export const DEFAULT_SCENE_CONFIG = {
  backgroundColor: 0x0a0a1e,
  fogColor: 0x0a0a1e,
  fogDensity: 0.006,
  antialias: true,
  shadows: true,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.2,
};

export const DEFAULT_CAMERA_CONFIG = {
  type: 'perspective' as const,
  fov: 45,
  near: 0.1,
  far: 500,
  position: [0, 60, 60] as [number, number, number],
  lookAt: [0, 0, 0] as [number, number, number],
};

export const DEFAULT_LIGHT_CONFIG = {
  ambient: {
    color: 0x202040,
    intensity: 0.4,
  },
  directional: {
    color: 0xffd4a8,
    intensity: 0.8,
    position: [50, 100, 50] as [number, number, number],
    castShadow: true,
    shadowMapSize: 2048,
  },
  hemisphere: {
    skyColor: 0x4466aa,
    groundColor: 0x1a1a2e,
    intensity: 0.5,
  },
};

export const ENTITY_COLORS = {
  blue: 0x4488ff,
  red: 0xff4444,
  green: 0x44ff44,
  yellow: 0xffff44,
  purple: 0x9944ff,
  cyan: 0x44ffff,
  orange: 0xff8844,
  white: 0xffffff,
};

export const HEALTH_BAR_CONFIG = {
  width: 1.2,
  height: 0.15,
  offsetY: 2.5,
  backgroundColor: 0x333333,
  fillColorAlly: 0x44ff44,
  fillColorEnemy: 0xff4444,
};
