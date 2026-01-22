import * as THREE from 'three';
import { AnimationLibrary, CharacterAnimator } from './AnimationLibrary';
import { AnimationDebugger } from './AnimationDebugger';

export type AnimationParameter = 'speed' | 'direction' | 'intensity' | 'blend' | 'custom';

export interface AnimationCallback {
  onStart?: (animationName: string) => void;
  onEnd?: (animationName: string) => void;
  onInterrupt?: (reason: string) => void;
  onBlend?: (from: string, to: string, progress: number) => void;
}

export interface QueuedAnimation {
  name: string;
  priority: number;
  callbacks?: AnimationCallback;
  parameters?: Record<AnimationParameter, number>;
}

export class AnimationControllerBridge {
  private animationLibrary: AnimationLibrary;
  private debugger: AnimationDebugger;
  private characterQueues: Map<string, QueuedAnimation[]> = new Map();
  private activeCallbacks: Map<string, AnimationCallback> = new Map();
  private parameterMap: Map<string, Record<AnimationParameter, number>> = new Map();
  private transitionRules: Map<string, Set<string>> = new Map();
  private customBlendCurves: Map<string, (t: number) => number> = new Map();

  constructor(animationLibrary: AnimationLibrary, debugger?: AnimationDebugger) {
    this.animationLibrary = animationLibrary;
    this.debugger = debugger || new AnimationDebugger(false);
    this.setupDefaultTransitions();
  }

  /**
   * Register a character for animation control
   */
  registerCharacter(characterId: string, mesh: THREE.Object3D): CharacterAnimator {
    const animator = this.animationLibrary.registerCharacter(characterId, mesh);
    this.characterQueues.set(characterId, []);
    this.parameterMap.set(characterId, {
      speed: 1,
      direction: 0,
      intensity: 1,
      blend: 0.2,
      custom: 0
    });
    return animator;
  }

  /**
   * Unregister a character
   */
  unregisterCharacter(characterId: string): void {
    this.animationLibrary.unregisterCharacter(characterId);
    this.characterQueues.delete(characterId);
    this.activeCallbacks.delete(characterId);
    this.parameterMap.delete(characterId);
  }

  /**
   * Play animation with full controller access
   */
  playAnimation(
    characterId: string,
    animationName: string,
    options: {
      priority?: number;
      blendTime?: number;
      loop?: THREE.AnimationActionLoopStyles;
      timeScale?: number;
      callbacks?: AnimationCallback;
      queue?: boolean;
      parameters?: Record<AnimationParameter, number>;
    } = {}
  ): THREE.AnimationAction | null {
    const {
      priority = 0,
      blendTime = 0.2,
      loop = THREE.LoopRepeat,
      timeScale = 1,
      callbacks,
      queue = false,
      parameters
    } = options;

    // Apply parameter mapping
    if (parameters) {
      this.setCharacterParameters(characterId, parameters);
    }

    // Queue animation if requested
    if (queue) {
      this.queueAnimation(characterId, {
        name: animationName,
        priority,
        callbacks,
        parameters
      });
      return null;
    }

    // Track in debugger
    const clip = this.animationLibrary.getClip(animationName);
    if (this.debugger && clip) {
      this.debugger.trackAnimationStart(characterId, animationName, clip.duration, blendTime);
    }

    // Store callbacks
    if (callbacks) {
      this.activeCallbacks.set(characterId, callbacks);
      callbacks.onStart?.(animationName);
    }

    // Apply custom blend curve if available
    const blendTimeAdjusted = this.applyBlendCurve(animationName, blendTime);

    // Play animation
    return this.animationLibrary.playAnimation(characterId, animationName, {
      loop,
      fadeIn: blendTimeAdjusted,
      fadeOut: blendTimeAdjusted,
      timeScale
    });
  }

  /**
   * Play animation once with callback
   */
  playAnimationOnce(
    characterId: string,
    animationName: string,
    onComplete?: () => void,
    blendTime: number = 0.2
  ): THREE.AnimationAction | null {
    if (this.debugger) {
      const clip = this.animationLibrary.getClip(animationName);
      if (clip) {
        this.debugger.trackAnimationStart(characterId, animationName, clip.duration, blendTime);
      }
    }

    return this.animationLibrary.playOnce(characterId, animationName, onComplete);
  }

  /**
   * Smooth transition between animations
   */
  transitionToAnimation(
    characterId: string,
    toAnimation: string,
    blendTime?: number
  ): THREE.AnimationAction | null {
    const animator = this.animationLibrary.getAnimator(characterId);
    if (!animator || !animator.currentAction) {
      return this.playAnimation(characterId, toAnimation, { blendTime: blendTime || 0.3 });
    }

    const fromAnimation = animator.currentAction.getClip().name;
    const adjustedBlendTime = blendTime || this.getOptimalBlendTime(fromAnimation, toAnimation);

    if (this.debugger) {
      this.debugger.trackAnimationBlend(
        characterId,
        fromAnimation,
        toAnimation,
        adjustedBlendTime,
        0.5
      );
    }

    return this.playAnimation(characterId, toAnimation, { blendTime: adjustedBlendTime });
  }

  /**
   * Queue animation for later playback
   */
  queueAnimation(characterId: string, animation: QueuedAnimation): void {
    const queue = this.characterQueues.get(characterId);
    if (!queue) return;

    queue.push(animation);
    queue.sort((a, b) => b.priority - a.priority);

    if (queue.length === 1) {
      this.processQueue(characterId);
    }
  }

  /**
   * Set animation parameters for character
   */
  setCharacterParameters(
    characterId: string,
    parameters: Partial<Record<AnimationParameter, number>>
  ): void {
    const params = this.parameterMap.get(characterId);
    if (!params) return;

    Object.assign(params, parameters);
  }

  /**
   * Get character animation parameters
   */
  getCharacterParameters(characterId: string): Record<AnimationParameter, number> | undefined {
    return this.parameterMap.get(characterId);
  }

  /**
   * Define transition rules between animations
   */
  defineTransitionRule(fromAnimation: string, toAnimations: string[]): void {
    if (!this.transitionRules.has(fromAnimation)) {
      this.transitionRules.set(fromAnimation, new Set());
    }
    const existing = this.transitionRules.get(fromAnimation)!;
    toAnimations.forEach(anim => existing.add(anim));
  }

  /**
   * Check if transition is allowed
   */
  canTransition(fromAnimation: string, toAnimation: string): boolean {
    if (fromAnimation === toAnimation) return true;

    const rules = this.transitionRules.get(fromAnimation);
    return rules ? rules.has(toAnimation) : true; // Default allow if no rules defined
  }

  /**
   * Define custom blend curve
   */
  defineBlendCurve(
    transitionKey: string,
    curve: (t: number) => number
  ): void {
    this.customBlendCurves.set(transitionKey, curve);
  }

  /**
   * Stop animation with fade out
   */
  stopAnimation(characterId: string, fadeOut: number = 0.2): void {
    this.animationLibrary.stopAnimation(characterId, fadeOut);
    this.activeCallbacks.delete(characterId);

    if (this.debugger) {
      const animator = this.animationLibrary.getAnimator(characterId);
      if (animator?.currentAction) {
        this.debugger.trackAnimationEnd(
          characterId,
          animator.currentAction.getClip().name
        );
      }
    }
  }

  /**
   * Get available animations for character
   */
  getAvailableAnimations(characterId: string): string[] {
    const library = this.animationLibrary.getAvailableAnimations();
    return library.map(clip => clip.name);
  }

  /**
   * Get current animation info
   */
  getCurrentAnimation(characterId: string): {
    name: string;
    duration: number;
    elapsed: number;
    progress: number;
  } | null {
    const animator = this.animationLibrary.getAnimator(characterId);
    if (!animator || !animator.currentAction) return null;

    const action = animator.currentAction;
    const clip = action.getClip();
    const elapsed = action.time;
    const progress = (elapsed % clip.duration) / clip.duration;

    return {
      name: clip.name,
      duration: clip.duration,
      elapsed,
      progress
    };
  }

  /**
   * Update all animators
   */
  update(deltaTime: number): void {
    this.animationLibrary.update(deltaTime);

    // Process queued animations
    this.characterQueues.forEach((queue, characterId) => {
      if (queue.length > 0) {
        const animator = this.animationLibrary.getAnimator(characterId);
        if (animator && !animator.currentAction) {
          this.processQueue(characterId);
        }
      }
    });
  }

  /**
   * Get debugging information
   */
  getDebugInfo(): {
    transitions: ReturnType<AnimationDebugger['analyzeTransitions']>;
    state: any;
    conflicts: string[];
  } | null {
    if (!this.debugger) return null;

    return {
      transitions: this.debugger.analyzeTransitions('all'),
      state: this.debugger.getAllCharacterStates(),
      conflicts: []
    };
  }

  /**
   * Export debugging data
   */
  exportDebugData(): string {
    return this.debugger.exportData();
  }

  // Private helpers

  private setupDefaultTransitions(): void {
    // Movement transitions
    this.defineTransitionRule('idle', ['walk', 'run', 'jump', 'attack']);
    this.defineTransitionRule('walk', ['idle', 'run', 'jump', 'attack']);
    this.defineTransitionRule('run', ['idle', 'walk', 'jump', 'attack']);

    // Combat transitions
    this.defineTransitionRule('attack', ['idle', 'walk', 'run']);
    this.defineTransitionRule('attack_melee', ['idle', 'walk', 'run']);
    this.defineTransitionRule('attack_ranged', ['idle', 'walk', 'run']);

    // Ability transitions
    this.defineTransitionRule('cast', ['idle', 'walk', 'run']);
    this.defineTransitionRule('spell', ['idle', 'walk', 'run']);
  }

  private getOptimalBlendTime(fromAnimation: string, toAnimation: string): number {
    // Get character parameters to adjust blend based on intensity
    const params = Array.from(this.parameterMap.values())[0];
    const baseBlendTime = 0.2;
    const intensityModifier = params?.intensity || 1;

    // Slower blend for similar animations
    if (this.areAnimationsSimilar(fromAnimation, toAnimation)) {
      return baseBlendTime * 0.8 / intensityModifier;
    }

    // Faster blend for different animations
    return baseBlendTime * 1.2 / intensityModifier;
  }

  private areAnimationsSimilar(anim1: string, anim2: string): boolean {
    const type1 = this.getAnimationType(anim1);
    const type2 = this.getAnimationType(anim2);
    return type1 === type2;
  }

  private getAnimationType(animName: string): string {
    if (animName.includes('attack') || animName.includes('spell')) return 'combat';
    if (animName.includes('move') || animName.includes('walk') || animName.includes('run')) return 'movement';
    if (animName.includes('idle') || animName.includes('stand')) return 'idle';
    return 'other';
  }

  private applyBlendCurve(transitionKey: string, baseBlendTime: number): number {
    const curve = this.customBlendCurves.get(transitionKey);
    if (!curve) return baseBlendTime;

    // Apply curve to time (0-1 range)
    const curveValue = curve(0.5); // Evaluate at midpoint
    return baseBlendTime * curveValue;
  }

  private processQueue(characterId: string): void {
    const queue = this.characterQueues.get(characterId);
    if (!queue || queue.length === 0) return;

    const nextAnimation = queue.shift();
    if (nextAnimation) {
      this.playAnimation(characterId, nextAnimation.name, {
        blendTime: 0.3,
        callbacks: nextAnimation.callbacks,
        parameters: nextAnimation.parameters
      });
    }
  }
}

export function createAnimationControllerBridge(
  library: AnimationLibrary,
  debugger?: AnimationDebugger
): AnimationControllerBridge {
  return new AnimationControllerBridge(library, debugger);
}
