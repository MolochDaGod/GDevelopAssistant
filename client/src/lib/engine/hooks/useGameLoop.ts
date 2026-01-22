import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { UpdateCallback, GameLoopState } from '../core/types';

export interface UseGameLoopOptions {
  sceneRef: RefObject<THREE.Scene | null>;
  cameraRef: RefObject<THREE.Camera | null>;
  rendererRef: RefObject<THREE.WebGLRenderer | null>;
  autoStart?: boolean;
  maxDelta?: number;
  onUpdate?: UpdateCallback;
  onRender?: () => void;
}

export interface UseGameLoopReturn {
  state: GameLoopState;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  addUpdateCallback: (id: string, callback: UpdateCallback) => void;
  removeUpdateCallback: (id: string) => void;
}

export function useGameLoop(options: UseGameLoopOptions): UseGameLoopReturn {
  const { 
    sceneRef, 
    cameraRef, 
    rendererRef, 
    autoStart = true, 
    maxDelta = 0.1,
    onUpdate,
    onRender 
  } = options;

  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock(false));
  const updateCallbacksRef = useRef<Map<string, UpdateCallback>>(new Map());
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  const [state, setState] = useState<GameLoopState>({
    isRunning: false,
    isPaused: false,
    deltaTime: 0,
    elapsedTime: 0,
    frameCount: 0,
  });

  const updateState = useCallback((updates: Partial<GameLoopState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const gameLoop = useCallback(() => {
    if (!isRunningRef.current) return;

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    if (isPausedRef.current) return;

    const delta = Math.min(clockRef.current.getDelta(), maxDelta);
    const elapsed = clockRef.current.getElapsedTime();

    onUpdate?.(delta, elapsed);
    
    updateCallbacksRef.current.forEach(callback => {
      callback(delta, elapsed);
    });

    if (sceneRef.current && cameraRef.current && rendererRef.current) {
      onRender?.();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    updateState({
      deltaTime: delta,
      elapsedTime: elapsed,
      frameCount: state.frameCount + 1,
    });
  }, [sceneRef, cameraRef, rendererRef, maxDelta, onUpdate, onRender, updateState, state.frameCount]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    isPausedRef.current = false;
    clockRef.current.start();
    
    updateState({ isRunning: true, isPaused: false });
    gameLoop();
  }, [gameLoop, updateState]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    clockRef.current.stop();
    updateState({ isRunning: false, isPaused: false });
  }, [updateState]);

  const pause = useCallback(() => {
    if (!isRunningRef.current || isPausedRef.current) return;
    isPausedRef.current = true;
    updateState({ isPaused: true });
  }, [updateState]);

  const resume = useCallback(() => {
    if (!isRunningRef.current || !isPausedRef.current) return;
    isPausedRef.current = false;
    updateState({ isPaused: false });
  }, [updateState]);

  const addUpdateCallback = useCallback((id: string, callback: UpdateCallback) => {
    updateCallbacksRef.current.set(id, callback);
  }, []);

  const removeUpdateCallback = useCallback((id: string) => {
    updateCallbacksRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (autoStart && sceneRef.current && cameraRef.current && rendererRef.current) {
      start();
    }

    return () => {
      stop();
      updateCallbacksRef.current.clear();
    };
  }, [autoStart, start, stop, sceneRef, cameraRef, rendererRef]);

  return {
    state,
    start,
    stop,
    pause,
    resume,
    addUpdateCallback,
    removeUpdateCallback,
  };
}
