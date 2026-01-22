import * as THREE from 'three';
import { CharacterAnimator } from './AnimationLibrary';

export interface AnimationEvent {
  timestamp: number;
  characterId: string;
  type: 'start' | 'end' | 'blend' | 'interrupt' | 'error';
  animationName: string;
  duration: number;
  blendTime?: number;
  error?: string;
}

export interface AnimationMetrics {
  characterId: string;
  animationName: string;
  startTime: number;
  blendInTime: number;
  blendOutTime: number;
  currentBlendWeight: number;
  timeScale: number;
  looping: boolean;
  isActive: boolean;
  predictedEndTime: number;
}

export interface CharacterAnimationState {
  characterId: string;
  currentAnimation: string | null;
  previousAnimation: string | null;
  blendingTo: string | null;
  isTransitioning: boolean;
  blendProgress: number;
  upcomingAnimations: string[];
  activeEvents: AnimationEvent[];
}

export class AnimationDebugger {
  private events: AnimationEvent[] = [];
  private characterStates: Map<string, CharacterAnimationState> = new Map();
  private metrics: Map<string, AnimationMetrics> = new Map();
  private maxEventHistory: number = 1000;
  private isEnabled: boolean = true;
  private enabledCharacters: Set<string> = new Set();

  constructor(enableAll: boolean = true) {
    if (enableAll) {
      this.isEnabled = true;
    }
  }

  /**
   * Enable/disable debugging for specific character
   */
  setCharacterMonitored(characterId: string, monitored: boolean): void {
    if (monitored) {
      this.enabledCharacters.add(characterId);
    } else {
      this.enabledCharacters.delete(characterId);
    }
  }

  /**
   * Track animation start event
   */
  trackAnimationStart(
    characterId: string,
    animationName: string,
    duration: number,
    blendTime: number = 0
  ): void {
    if (!this.isEnabled) return;

    const event: AnimationEvent = {
      timestamp: performance.now(),
      characterId,
      type: 'start',
      animationName,
      duration,
      blendTime
    };

    this.addEvent(event);
    this.updateCharacterState(characterId, animationName, false);
    this.createMetrics(characterId, animationName, duration, blendTime);

    console.log(
      `[AnimDebug] Started: ${characterId} -> ${animationName} (${duration.toFixed(2)}s fade: ${blendTime.toFixed(2)}s)`
    );
  }

  /**
   * Track animation end event
   */
  trackAnimationEnd(characterId: string, animationName: string): void {
    if (!this.isEnabled) return;

    const event: AnimationEvent = {
      timestamp: performance.now(),
      characterId,
      type: 'end',
      animationName,
      duration: 0
    };

    this.addEvent(event);
    this.updateCharacterState(characterId, null, false);

    console.log(`[AnimDebug] Ended: ${characterId} -> ${animationName}`);
  }

  /**
   * Track animation blend event
   */
  trackAnimationBlend(
    characterId: string,
    fromAnimation: string,
    toAnimation: string,
    blendTime: number,
    weight: number
  ): void {
    if (!this.isEnabled) return;

    const event: AnimationEvent = {
      timestamp: performance.now(),
      characterId,
      type: 'blend',
      animationName: `${fromAnimation} -> ${toAnimation}`,
      duration: blendTime,
      blendTime
    };

    this.addEvent(event);

    const state = this.getOrCreateCharacterState(characterId);
    state.blendingTo = toAnimation;
    state.isTransitioning = true;
    state.blendProgress = weight;

    console.log(
      `[AnimDebug] Blending: ${characterId} ${fromAnimation} -> ${toAnimation} (${(weight * 100).toFixed(1)}% ${blendTime.toFixed(2)}s)`
    );
  }

  /**
   * Track animation interrupt
   */
  trackAnimationInterrupt(
    characterId: string,
    currentAnimation: string,
    reason: string
  ): void {
    if (!this.isEnabled) return;

    const event: AnimationEvent = {
      timestamp: performance.now(),
      characterId,
      type: 'interrupt',
      animationName: currentAnimation,
      duration: 0,
      error: reason
    };

    this.addEvent(event);

    console.warn(
      `[AnimDebug] Interrupted: ${characterId} -> ${currentAnimation} (${reason})`
    );
  }

  /**
   * Track animation error
   */
  trackAnimationError(
    characterId: string,
    animationName: string,
    error: string
  ): void {
    if (!this.isEnabled) return;

    const event: AnimationEvent = {
      timestamp: performance.now(),
      characterId,
      type: 'error',
      animationName,
      duration: 0,
      error
    };

    this.addEvent(event);

    console.error(
      `[AnimDebug] Error: ${characterId} -> ${animationName}: ${error}`
    );
  }

  /**
   * Analyze animation transitions for a character
   */
  analyzeTransitions(characterId: string): {
    smoothestTransitions: Array<{ from: string; to: string; avgBlendTime: number }>;
    problematicTransitions: Array<{ from: string; to: string; issues: string[] }>;
    averageBlendTime: number;
  } {
    const characterEvents = this.events.filter(e => e.characterId === characterId);
    const blendEvents = characterEvents.filter(e => e.type === 'blend');

    const transitions = new Map<string, { count: number; totalTime: number; errors: number }>();

    blendEvents.forEach(event => {
      const key = event.animationName; // "from -> to"
      const existing = transitions.get(key) || { count: 0, totalTime: 0, errors: 0 };
      existing.count++;
      existing.totalTime += event.blendTime || 0;
      transitions.set(key, existing);
    });

    const avgBlendTime =
      blendEvents.length > 0
        ? blendEvents.reduce((sum, e) => sum + (e.blendTime || 0), 0) / blendEvents.length
        : 0.2;

    const smoothest = Array.from(transitions.entries())
      .map(([key, data]) => ({
        from: key.split(' -> ')[0],
        to: key.split(' -> ')[1],
        avgBlendTime: data.totalTime / data.count,
        count: data.count
      }))
      .sort((a, b) => a.avgBlendTime - b.avgBlendTime)
      .slice(0, 5);

    return {
      smoothestTransitions: smoothest.map(({ from, to, avgBlendTime }) => ({
        from,
        to,
        avgBlendTime
      })),
      problematicTransitions: [],
      averageBlendTime: avgBlendTime
    };
  }

  /**
   * Get animation timeline for character
   */
  getAnimationTimeline(characterId: string, maxEvents: number = 50): AnimationEvent[] {
    return this.events
      .filter(e => e.characterId === characterId)
      .slice(-maxEvents)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get current state for character
   */
  getCharacterState(characterId: string): CharacterAnimationState | undefined {
    return this.characterStates.get(characterId);
  }

  /**
   * Get metrics for character animation
   */
  getCharacterMetrics(characterId: string): AnimationMetrics | undefined {
    return this.metrics.get(characterId);
  }

  /**
   * Get all character states
   */
  getAllCharacterStates(): CharacterAnimationState[] {
    return Array.from(this.characterStates.values());
  }

  /**
   * Check for blend conflicts
   */
  checkBlendConflicts(characterId: string): string[] {
    const state = this.characterStates.get(characterId);
    const issues: string[] = [];

    if (!state) return issues;

    // Check for stuck transitions
    if (state.isTransitioning && state.blendProgress < 0.5) {
      const transitionDuration = performance.now() - (this.events.find(e => 
        e.characterId === characterId && e.type === 'blend'
      )?.timestamp || 0);

      if (transitionDuration > 2000) {
        issues.push('Long transition detected - possible blend lock');
      }
    }

    // Check for animation conflicts
    if (state.upcomingAnimations.length > 5) {
      issues.push('Animation queue overflow - too many pending animations');
    }

    return issues;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    totalEvents: number;
    averageBlendTime: number;
    animationErrorRate: number;
    charactersMonitored: number;
    memoryUsage: string;
  } {
    const totalBlends = this.events.filter(e => e.type === 'blend').length;
    const totalErrors = this.events.filter(e => e.type === 'error').length;
    const totalAnimations = this.events.filter(e => e.type === 'start').length;

    const avgBlendTime = totalBlends > 0
      ? this.events
          .filter(e => e.type === 'blend')
          .reduce((sum, e) => sum + (e.blendTime || 0), 0) / totalBlends
      : 0;

    const errorRate = totalAnimations > 0 ? totalErrors / totalAnimations : 0;

    return {
      totalEvents: this.events.length,
      averageBlendTime: avgBlendTime,
      animationErrorRate: errorRate,
      charactersMonitored: this.characterStates.size,
      memoryUsage: `${(this.events.length * 256 / 1024).toFixed(2)} KB` // Approximate
    };
  }

  /**
   * Clear all debugging data
   */
  clear(): void {
    this.events = [];
    this.characterStates.clear();
    this.metrics.clear();
  }

  /**
   * Export debugging data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      events: this.events,
      characterStates: Array.from(this.characterStates.entries()),
      report: this.getPerformanceReport()
    }, null, 2);
  }

  // Private helpers

  private addEvent(event: AnimationEvent): void {
    this.events.push(event);

    // Trim event history
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }
  }

  private updateCharacterState(
    characterId: string,
    currentAnimation: string | null,
    isTransitioning: boolean
  ): void {
    const state = this.getOrCreateCharacterState(characterId);
    state.previousAnimation = state.currentAnimation;
    state.currentAnimation = currentAnimation;
    state.isTransitioning = isTransitioning;
  }

  private getOrCreateCharacterState(characterId: string): CharacterAnimationState {
    if (!this.characterStates.has(characterId)) {
      this.characterStates.set(characterId, {
        characterId,
        currentAnimation: null,
        previousAnimation: null,
        blendingTo: null,
        isTransitioning: false,
        blendProgress: 0,
        upcomingAnimations: [],
        activeEvents: []
      });
    }
    return this.characterStates.get(characterId)!;
  }

  private createMetrics(
    characterId: string,
    animationName: string,
    duration: number,
    blendTime: number
  ): void {
    const metricsKey = `${characterId}_${animationName}`;
    this.metrics.set(metricsKey, {
      characterId,
      animationName,
      startTime: performance.now(),
      blendInTime: blendTime,
      blendOutTime: 0,
      currentBlendWeight: 0,
      timeScale: 1,
      looping: true,
      isActive: true,
      predictedEndTime: performance.now() + duration * 1000
    });
  }
}

export function createAnimationDebugger(): AnimationDebugger {
  return new AnimationDebugger(true);
}
