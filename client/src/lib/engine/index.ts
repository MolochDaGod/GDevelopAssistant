export * from './core/types';
export * from './core/constants';

export { useThreeScene } from './hooks/useThreeScene';
export type { UseThreeSceneOptions, UseThreeSceneReturn } from './hooks/useThreeScene';

export { useGameLoop } from './hooks/useGameLoop';
export type { UseGameLoopOptions, UseGameLoopReturn } from './hooks/useGameLoop';

export { useInputHandlers } from './hooks/useInputHandlers';
export type { UseInputHandlersOptions, UseInputHandlersReturn } from './hooks/useInputHandlers';

export { useEntityManager } from './hooks/useEntityManager';
export type { UseEntityManagerOptions, UseEntityManagerReturn } from './hooks/useEntityManager';

export { AssetLoader } from './assets/GLTFAssetLoader';
export type { AssetRegistryEntry } from './assets/GLTFAssetLoader';

export { createHealthBar, updateEntityHealthBar } from './entities/HealthBarFactory';
export type { HealthBar, HealthBarConfig } from './entities/HealthBarFactory';

export { createCapsuleEntity, createBoxEntity, createSphereEntity, disposeEntity } from './entities/EntityFactory';
export type { EntityMeshConfig } from './entities/EntityFactory';

export { createEffectsSystem } from './systems/EffectsAdapter';
export type { EffectsSystem } from './systems/EffectsAdapter';
