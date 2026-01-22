/**
 * React Hooks for Game Utilities
 * TypeScript equivalents of Unity patterns for React components
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// USE TOGGLE - Equivalent to Unity Toggle
// Original: Togglescript.cs
// ============================================

export interface UseToggleOptions {
  initialState?: boolean;
  onChange?: (isOn: boolean) => void;
}

export function useToggle(options: UseToggleOptions = {}) {
  const { initialState = false, onChange } = options;
  const [isOn, setIsOn] = useState(initialState);

  const toggle = useCallback(() => {
    setIsOn(prev => {
      const newValue = !prev;
      onChange?.(newValue);
      return newValue;
    });
  }, [onChange]);

  const setOn = useCallback(() => {
    setIsOn(true);
    onChange?.(true);
  }, [onChange]);

  const setOff = useCallback(() => {
    setIsOn(false);
    onChange?.(false);
  }, [onChange]);

  return { isOn, toggle, setOn, setOff };
}

// ============================================
// USE SLIDER - Equivalent to Unity Slider
// Original: Slide.cs
// ============================================

export interface UseSliderOptions {
  min?: number;
  max?: number;
  initialValue?: number;
  step?: number;
  onChange?: (value: number) => void;
}

export function useSlider(options: UseSliderOptions = {}) {
  const { min = 0, max = 100, initialValue = 0, step = 1, onChange } = options;
  const [value, setValue] = useState(Math.max(min, Math.min(max, initialValue)));

  const setSliderValue = useCallback((v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    const stepped = Math.round(clamped / step) * step;
    setValue(stepped);
    onChange?.(stepped);
  }, [min, max, step, onChange]);

  const percentage = (value - min) / (max - min);

  return {
    value,
    percentage,
    min,
    max,
    setValue: setSliderValue,
    increment: () => setSliderValue(value + step),
    decrement: () => setSliderValue(value - step),
  };
}

// ============================================
// USE GAME LOOP - Equivalent to Unity Update
// ============================================

export interface GameLoopCallbacks {
  onUpdate?: (deltaTime: number) => void;
  onFixedUpdate?: (fixedDeltaTime: number) => void;
  onLateUpdate?: (deltaTime: number) => void;
}

export function useGameLoop(callbacks: GameLoopCallbacks, isRunning: boolean = true) {
  const { onUpdate, onFixedUpdate, onLateUpdate } = callbacks;
  const lastTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const frameIdRef = useRef<number>();
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsTimeRef = useRef(0);

  const FIXED_DELTA = 1000 / 60; // 60 FPS for physics

  useEffect(() => {
    if (!isRunning) {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();
    fpsTimeRef.current = lastTimeRef.current;

    const tick = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      frameCountRef.current++;

      // FPS calculation
      if (currentTime - fpsTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        fpsTimeRef.current = currentTime;
      }

      // Fixed update (physics)
      if (onFixedUpdate) {
        accumulatedTimeRef.current += deltaTime;
        while (accumulatedTimeRef.current >= FIXED_DELTA) {
          onFixedUpdate(FIXED_DELTA);
          accumulatedTimeRef.current -= FIXED_DELTA;
        }
      }

      // Regular update
      onUpdate?.(deltaTime);

      // Late update
      onLateUpdate?.(deltaTime);

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isRunning, onUpdate, onFixedUpdate, onLateUpdate]);

  return { fps: fpsRef.current };
}

// ============================================
// USE INPUT - Equivalent to Unity Input
// ============================================

export function useInput() {
  const keysRef = useRef<Set<string>>(new Set());
  const keysDownRef = useRef<Set<string>>(new Set());
  const keysUpRef = useRef<Set<string>>(new Set());
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const mouseButtonsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keysRef.current.has(e.code)) {
        keysDownRef.current.add(e.code);
      }
      keysRef.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      keysUpRef.current.add(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseButtonsRef.current.add(e.button);
    };

    const handleMouseUp = (e: MouseEvent) => {
      mouseButtonsRef.current.delete(e.button);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getKey = useCallback((code: string) => keysRef.current.has(code), []);
  const getKeyDown = useCallback((code: string) => keysDownRef.current.has(code), []);
  const getKeyUp = useCallback((code: string) => keysUpRef.current.has(code), []);
  
  const getHorizontalAxis = useCallback(() => {
    let axis = 0;
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('KeyA')) axis -= 1;
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('KeyD')) axis += 1;
    return axis;
  }, []);
  
  const getVerticalAxis = useCallback(() => {
    let axis = 0;
    if (keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW')) axis -= 1;
    if (keysRef.current.has('ArrowDown') || keysRef.current.has('KeyS')) axis += 1;
    return axis;
  }, []);

  const getMousePosition = useCallback(() => mousePositionRef.current, []);
  const getMouseButton = useCallback((button: number) => mouseButtonsRef.current.has(button), []);

  const clearFrameInput = useCallback(() => {
    keysDownRef.current.clear();
    keysUpRef.current.clear();
  }, []);

  return {
    getKey,
    getKeyDown,
    getKeyUp,
    getHorizontalAxis,
    getVerticalAxis,
    getMousePosition,
    getMouseButton,
    clearFrameInput,
    keys: keysRef.current
  };
}

// ============================================
// USE TIMER - Equivalent to Unity coroutines
// ============================================

export function useTimer() {
  const timersRef = useRef<Map<string, {
    callback: () => void;
    interval: number;
    elapsed: number;
    repeat: boolean;
    paused: boolean;
  }>>(new Map());

  const setTimeout = useCallback((id: string, callback: () => void, delay: number) => {
    timersRef.current.set(id, {
      callback,
      interval: delay,
      elapsed: 0,
      repeat: false,
      paused: false
    });
  }, []);

  const setInterval = useCallback((id: string, callback: () => void, interval: number) => {
    timersRef.current.set(id, {
      callback,
      interval,
      elapsed: 0,
      repeat: true,
      paused: false
    });
  }, []);

  const cancel = useCallback((id: string) => {
    timersRef.current.delete(id);
  }, []);

  const pause = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) timer.paused = true;
  }, []);

  const resume = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) timer.paused = false;
  }, []);

  const update = useCallback((deltaTime: number) => {
    const entries = Array.from(timersRef.current.entries());
    for (const [id, timer] of entries) {
      if (timer.paused) continue;

      timer.elapsed += deltaTime;
      
      if (timer.elapsed >= timer.interval) {
        timer.callback();
        
        if (timer.repeat) {
          timer.elapsed = 0;
        } else {
          timersRef.current.delete(id);
        }
      }
    }
  }, []);

  const clear = useCallback(() => {
    timersRef.current.clear();
  }, []);

  return { setTimeout, setInterval, cancel, pause, resume, update, clear };
}

// ============================================
// USE ANIMATION - Smooth value transitions
// ============================================

export function useAnimatedValue(initialValue: number, duration: number = 300) {
  const [value, setValue] = useState(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const targetRef = useRef(initialValue);

  const animateTo = useCallback((target: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    targetRef.current = target;
    const startValue = value;
    const startTime = performance.now();
    setIsAnimating(true);

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress); // ease-out

      const newValue = startValue + (target - startValue) * eased;
      setValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(tick);
  }, [value, duration]);

  const setImmediate = useCallback((newValue: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setValue(newValue);
    targetRef.current = newValue;
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { value, animateTo, setImmediate, isAnimating, target: targetRef.current };
}

// ============================================
// USE OBJECT POOL - Reusable object management
// ============================================

export function useObjectPool<T>(
  factory: () => T,
  reset: (obj: T) => void = () => {},
  initialSize: number = 10
) {
  const poolRef = useRef<T[]>([]);
  const activeRef = useRef<Set<T>>(new Set());

  // Initialize pool
  useEffect(() => {
    for (let i = 0; i < initialSize; i++) {
      poolRef.current.push(factory());
    }
  }, []);

  const get = useCallback((): T => {
    let obj: T;
    
    if (poolRef.current.length > 0) {
      obj = poolRef.current.pop()!;
    } else {
      obj = factory();
    }

    activeRef.current.add(obj);
    return obj;
  }, [factory]);

  const release = useCallback((obj: T) => {
    if (!activeRef.current.has(obj)) return;
    
    activeRef.current.delete(obj);
    reset(obj);
    poolRef.current.push(obj);
  }, [reset]);

  const releaseAll = useCallback(() => {
    const activeItems = Array.from(activeRef.current);
    for (const obj of activeItems) {
      reset(obj);
      poolRef.current.push(obj);
    }
    activeRef.current.clear();
  }, [reset]);

  return {
    get,
    release,
    releaseAll,
    activeCount: activeRef.current.size,
    pooledCount: poolRef.current.length
  };
}

// ============================================
// USE STATE MACHINE - State management
// ============================================

export interface StateConfig<T extends string> {
  name: T;
  onEnter?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onExit?: () => void;
}

export function useStateMachine<T extends string>(initialState: T) {
  const [currentState, setCurrentState] = useState<T>(initialState);
  const [previousState, setPreviousState] = useState<T | null>(null);
  const statesRef = useRef<Map<T, StateConfig<T>>>(new Map());

  const addState = useCallback((config: StateConfig<T>) => {
    statesRef.current.set(config.name, config);
  }, []);

  const setState = useCallback((stateName: T) => {
    if (currentState === stateName) return;
    
    const currentConfig = statesRef.current.get(currentState);
    const nextConfig = statesRef.current.get(stateName);

    // Exit current state
    currentConfig?.onExit?.();

    setPreviousState(currentState);
    setCurrentState(stateName);

    // Enter new state
    nextConfig?.onEnter?.();
  }, [currentState]);

  const update = useCallback((deltaTime: number) => {
    const config = statesRef.current.get(currentState);
    config?.onUpdate?.(deltaTime);
  }, [currentState]);

  return {
    currentState,
    previousState,
    setState,
    addState,
    update
  };
}
