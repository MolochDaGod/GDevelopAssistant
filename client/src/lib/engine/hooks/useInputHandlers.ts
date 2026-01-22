import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import type { InputState } from '../core/types';

export interface UseInputHandlersOptions {
  containerRef: RefObject<HTMLElement | null>;
  preventDefault?: boolean;
  onKeyDown?: (key: string, event: KeyboardEvent) => void;
  onKeyUp?: (key: string, event: KeyboardEvent) => void;
  onMouseDown?: (button: number, x: number, y: number, event: MouseEvent) => void;
  onMouseUp?: (button: number, x: number, y: number, event: MouseEvent) => void;
  onMouseMove?: (x: number, y: number, dx: number, dy: number, event: MouseEvent) => void;
  onWheel?: (delta: number, event: WheelEvent) => void;
  onPointerLock?: (locked: boolean) => void;
}

export interface UseInputHandlersReturn {
  inputState: InputState;
  isKeyDown: (key: string) => boolean;
  isMouseButtonDown: (button: number) => boolean;
  requestPointerLock: () => void;
  exitPointerLock: () => void;
  isPointerLocked: boolean;
}

export function useInputHandlers(options: UseInputHandlersOptions): UseInputHandlersReturn {
  const { 
    containerRef,
    preventDefault = true,
    onKeyDown,
    onKeyUp,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onWheel,
    onPointerLock,
  } = options;

  const keysRef = useRef<Set<string>>(new Set());
  const mouseButtonsRef = useRef<Set<number>>(new Set());
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  const [inputState, setInputState] = useState<InputState>({
    keys: new Set(),
    mouse: { x: 0, y: 0, buttons: new Set(), wheel: 0 },
    touch: { active: false, points: [] },
  });

  const isKeyDown = useCallback((key: string) => {
    return keysRef.current.has(key.toLowerCase());
  }, []);

  const isMouseButtonDown = useCallback((button: number) => {
    return mouseButtonsRef.current.has(button);
  }, []);

  const requestPointerLock = useCallback(() => {
    containerRef.current?.requestPointerLock?.();
  }, [containerRef]);

  const exitPointerLock = useCallback(() => {
    document.exitPointerLock?.();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!keysRef.current.has(key)) {
        keysRef.current.add(key);
        setInputState(prev => ({
          ...prev,
          keys: new Set(keysRef.current),
        }));
        onKeyDown?.(key, e);
      }
      if (preventDefault && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.delete(key);
      setInputState(prev => ({
        ...prev,
        keys: new Set(keysRef.current),
      }));
      onKeyUp?.(key, e);
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseButtonsRef.current.add(e.button);
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;
      
      setInputState(prev => ({
        ...prev,
        mouse: { ...prev.mouse, buttons: new Set(mouseButtonsRef.current), x, y },
      }));
      onMouseDown?.(e.button, x, y, e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      mouseButtonsRef.current.delete(e.button);
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;
      
      setInputState(prev => ({
        ...prev,
        mouse: { ...prev.mouse, buttons: new Set(mouseButtonsRef.current), x, y },
      }));
      onMouseUp?.(e.button, x, y, e);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : e.clientX;
      const y = rect ? e.clientY - rect.top : e.clientY;
      const dx = isPointerLocked ? e.movementX : x - lastMousePosRef.current.x;
      const dy = isPointerLocked ? e.movementY : y - lastMousePosRef.current.y;
      
      lastMousePosRef.current = { x, y };
      
      setInputState(prev => ({
        ...prev,
        mouse: { ...prev.mouse, x, y },
      }));
      onMouseMove?.(x, y, dx, dy, e);
    };

    const handleWheel = (e: WheelEvent) => {
      if (preventDefault) e.preventDefault();
      setInputState(prev => ({
        ...prev,
        mouse: { ...prev.mouse, wheel: e.deltaY },
      }));
      onWheel?.(e.deltaY, e);
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      setIsPointerLocked(locked);
      onPointerLock?.(locked);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    containerRef.current?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('wheel', handleWheel);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      keysRef.current.clear();
      mouseButtonsRef.current.clear();
    };
  }, [containerRef, preventDefault, onKeyDown, onKeyUp, onMouseDown, onMouseUp, onMouseMove, onWheel, onPointerLock, isPointerLocked]);

  return {
    inputState,
    isKeyDown,
    isMouseButtonDown,
    requestPointerLock,
    exitPointerLock,
    isPointerLocked,
  };
}
