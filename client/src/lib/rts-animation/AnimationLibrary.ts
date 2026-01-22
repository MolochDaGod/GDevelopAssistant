import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AnimationClipInfo {
  name: string;
  duration: number;
  clip: THREE.AnimationClip;
}

export interface CharacterAnimator {
  id: string;
  mesh: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  currentAction: THREE.AnimationAction | null;
  actions: Map<string, THREE.AnimationAction>;
}

export class AnimationLibrary {
  private clips: Map<string, THREE.AnimationClip> = new Map();
  private animators: Map<string, CharacterAnimator> = new Map();
  private loader: GLTFLoader;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  async loadFromGLB(url: string): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          for (const clip of gltf.animations) {
            const normalizedName = this.normalizeAnimationName(clip.name);
            this.clips.set(normalizedName, clip);
            console.log(`Loaded animation: ${normalizedName} (${clip.duration.toFixed(2)}s)`);
          }
          this.isLoaded = true;
          resolve();
        },
        undefined,
        (error) => {
          console.error('Failed to load animation library:', error);
          reject(error);
        }
      );
    });

    return this.loadPromise;
  }

  private normalizeAnimationName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[-_\s]+/g, '_')
      .replace(/^(armature\|)?/, '')
      .trim();
  }

  getAvailableAnimations(): AnimationClipInfo[] {
    const animations: AnimationClipInfo[] = [];
    this.clips.forEach((clip, name) => {
      animations.push({
        name,
        duration: clip.duration,
        clip
      });
    });
    return animations;
  }

  hasAnimation(name: string): boolean {
    return this.clips.has(this.normalizeAnimationName(name));
  }

  getClip(name: string): THREE.AnimationClip | undefined {
    return this.clips.get(this.normalizeAnimationName(name));
  }

  registerCharacter(id: string, mesh: THREE.Object3D): CharacterAnimator {
    const mixer = new THREE.AnimationMixer(mesh);
    const animator: CharacterAnimator = {
      id,
      mesh,
      mixer,
      currentAction: null,
      actions: new Map()
    };

    this.clips.forEach((clip, name) => {
      const action = mixer.clipAction(clip);
      animator.actions.set(name, action);
    });

    this.animators.set(id, animator);
    return animator;
  }

  unregisterCharacter(id: string): void {
    const animator = this.animators.get(id);
    if (animator) {
      animator.mixer.stopAllAction();
      this.animators.delete(id);
    }
  }

  playAnimation(
    characterId: string,
    animationName: string,
    options: {
      loop?: THREE.AnimationActionLoopStyles;
      fadeIn?: number;
      fadeOut?: number;
      timeScale?: number;
      clampWhenFinished?: boolean;
    } = {}
  ): THREE.AnimationAction | null {
    const animator = this.animators.get(characterId);
    if (!animator) {
      console.warn(`Character ${characterId} not registered`);
      return null;
    }

    const normalizedName = this.normalizeAnimationName(animationName);
    const action = animator.actions.get(normalizedName);
    if (!action) {
      console.warn(`Animation ${animationName} not found for ${characterId}`);
      return null;
    }

    const {
      loop = THREE.LoopRepeat,
      fadeIn = 0.2,
      fadeOut = 0.2,
      timeScale = 1,
      clampWhenFinished = false
    } = options;

    if (animator.currentAction && animator.currentAction !== action) {
      animator.currentAction.fadeOut(fadeOut);
    }

    action.reset();
    action.setLoop(loop, Infinity);
    action.timeScale = timeScale;
    action.clampWhenFinished = clampWhenFinished;
    action.fadeIn(fadeIn);
    action.play();

    animator.currentAction = action;
    return action;
  }

  playOnce(
    characterId: string,
    animationName: string,
    onComplete?: () => void
  ): THREE.AnimationAction | null {
    const action = this.playAnimation(characterId, animationName, {
      loop: THREE.LoopOnce,
      clampWhenFinished: true
    });

    if (action && onComplete) {
      const animator = this.animators.get(characterId);
      if (animator) {
        const onFinish = (e: { action: THREE.AnimationAction }) => {
          if (e.action === action) {
            animator.mixer.removeEventListener('finished', onFinish);
            onComplete();
          }
        };
        animator.mixer.addEventListener('finished', onFinish);
      }
    }

    return action;
  }

  stopAnimation(characterId: string, fadeOut: number = 0.2): void {
    const animator = this.animators.get(characterId);
    if (animator && animator.currentAction) {
      animator.currentAction.fadeOut(fadeOut);
      animator.currentAction = null;
    }
  }

  stopAllAnimations(fadeOut: number = 0.2): void {
    this.animators.forEach((animator) => {
      if (animator.currentAction) {
        animator.currentAction.fadeOut(fadeOut);
        animator.currentAction = null;
      }
    });
  }

  update(deltaTime: number): void {
    this.animators.forEach((animator) => {
      animator.mixer.update(deltaTime);
    });
  }

  getAnimator(characterId: string): CharacterAnimator | undefined {
    return this.animators.get(characterId);
  }

  isReady(): boolean {
    return this.isLoaded;
  }
}

export const COMMON_ANIMATIONS = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  ATTACK: 'attack',
  ATTACK_MELEE: 'attack_melee',
  ATTACK_RANGED: 'attack_ranged',
  DIE: 'die',
  DEATH: 'death',
  HIT: 'hit',
  HURT: 'hurt',
  JUMP: 'jump',
  FALL: 'fall',
  GATHER: 'gather',
  BUILD: 'build',
  CAST: 'cast',
  SPELL: 'spell',
  VICTORY: 'victory',
  DEFEAT: 'defeat'
} as const;

export function createAnimationLibrary(): AnimationLibrary {
  return new AnimationLibrary();
}
