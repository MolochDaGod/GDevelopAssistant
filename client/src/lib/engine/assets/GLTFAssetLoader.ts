import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AssetMetadata, LoadedModel } from '../core/types';

export interface AssetRegistryEntry {
  id: string;
  path: string;
  model?: THREE.Group;
  animations: THREE.AnimationClip[];
  metadata?: AssetMetadata;
  loading?: Promise<LoadedModel>;
}

class AssetLoaderClass {
  private cache: Map<string, AssetRegistryEntry> = new Map();
  private loader: GLTFLoader;
  private loadingPromises: Map<string, Promise<LoadedModel>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadModel(path: string, id?: string): Promise<LoadedModel> {
    const assetId = id || path;
    
    const cached = this.cache.get(assetId);
    if (cached?.model) {
      return {
        scene: SkeletonUtils.clone(cached.model) as THREE.Group,
        animations: cached.animations,
        metadata: cached.metadata,
      };
    }

    const existing = this.loadingPromises.get(assetId);
    if (existing) {
      const result = await existing;
      return {
        scene: SkeletonUtils.clone(result.scene) as THREE.Group,
        animations: result.animations,
        metadata: result.metadata,
      };
    }

    const loadPromise = new Promise<LoadedModel>((resolve, reject) => {
      this.loader.load(
        path,
        (gltf: GLTF) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          const entry: AssetRegistryEntry = {
            id: assetId,
            path,
            model,
            animations: gltf.animations || [],
            metadata: { id: assetId, path, type: 'model' },
          };
          this.cache.set(assetId, entry);

          resolve({
            scene: model.clone(),
            animations: gltf.animations || [],
            metadata: entry.metadata,
          });
        },
        undefined,
        (error) => {
          console.error(`Failed to load model: ${path}`, error);
          reject(new Error(`Failed to load model: ${path}`));
        }
      );
    });

    this.loadingPromises.set(assetId, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingPromises.delete(assetId);
      return result;
    } catch (error) {
      this.loadingPromises.delete(assetId);
      throw error;
    }
  }

  async loadAnimation(path: string, id?: string): Promise<THREE.AnimationClip[]> {
    const assetId = id || path;
    
    const cached = this.cache.get(assetId);
    if (cached?.animations.length) {
      return cached.animations;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf: GLTF) => {
          const animations = gltf.animations || [];
          
          const entry: AssetRegistryEntry = {
            id: assetId,
            path,
            animations,
            metadata: { id: assetId, path, type: 'animation' },
          };
          this.cache.set(assetId, entry);
          
          resolve(animations);
        },
        undefined,
        (error) => {
          console.error(`Failed to load animation: ${path}`, error);
          reject(new Error(`Failed to load animation: ${path}`));
        }
      );
    });
  }

  cloneWithSkeleton(model: THREE.Group): THREE.Group {
    return SkeletonUtils.clone(model) as THREE.Group;
  }

  createMixer(model: THREE.Object3D): THREE.AnimationMixer {
    return new THREE.AnimationMixer(model);
  }

  setupAnimations(
    mixer: THREE.AnimationMixer, 
    clips: THREE.AnimationClip[]
  ): Map<string, THREE.AnimationAction> {
    const actions = new Map<string, THREE.AnimationAction>();
    
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      actions.set(clip.name, action);
    }
    
    return actions;
  }

  async preloadAssets(assets: Array<{ path: string; id?: string; type?: 'model' | 'animation' }>): Promise<void> {
    const promises = assets.map(asset => {
      if (asset.type === 'animation') {
        return this.loadAnimation(asset.path, asset.id);
      }
      return this.loadModel(asset.path, asset.id);
    });
    
    await Promise.allSettled(promises);
  }

  getCached(id: string): AssetRegistryEntry | undefined {
    return this.cache.get(id);
  }

  clearCache(): void {
    this.cache.forEach(entry => {
      if (entry.model) {
        entry.model.traverse((child) => {
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
    });
    this.cache.clear();
  }

  dispose(): void {
    this.clearCache();
    this.loadingPromises.clear();
  }
}

export const AssetLoader = new AssetLoaderClass();
export { AssetLoaderClass };
