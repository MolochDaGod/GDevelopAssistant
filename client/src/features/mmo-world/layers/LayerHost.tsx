import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";

export interface LayerCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface LayerHostRef {
  camera: LayerCamera;
  setCamera: (camera: Partial<LayerCamera>) => void;
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
}

interface LayerHostProps {
  width: number;
  height: number;
  children: React.ReactNode;
  onCameraChange?: (camera: LayerCamera) => void;
  className?: string;
}

export const LayerHost = forwardRef<LayerHostRef, LayerHostProps>(
  ({ width, height, children, onCameraChange, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [camera, setCamera] = useState<LayerCamera>({ x: 0, y: 0, zoom: 1 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const updateCamera = useCallback((updates: Partial<LayerCamera>) => {
      setCamera(prev => {
        const newCamera = { ...prev, ...updates };
        onCameraChange?.(newCamera);
        return newCamera;
      });
    }, [onCameraChange]);

    const worldToScreen = useCallback((worldX: number, worldY: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      return {
        x: (worldX - camera.x) * camera.zoom + centerX,
        y: (worldY - camera.y) * camera.zoom + centerY
      };
    }, [camera, width, height]);

    const screenToWorld = useCallback((screenX: number, screenY: number) => {
      const centerX = width / 2;
      const centerY = height / 2;
      return {
        x: (screenX - centerX) / camera.zoom + camera.x,
        y: (screenY - centerY) / camera.zoom + camera.y
      };
    }, [camera, width, height]);

    useImperativeHandle(ref, () => ({
      camera,
      setCamera: updateCamera,
      worldToScreen,
      screenToWorld
    }), [camera, updateCamera, worldToScreen, screenToWorld]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        updateCamera({ zoom: Math.max(0.5, Math.min(3, camera.zoom * zoomFactor)) });
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 1 || e.button === 2) {
          isDragging.current = true;
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          const dx = (e.clientX - lastMouse.current.x) / camera.zoom;
          const dy = (e.clientY - lastMouse.current.y) / camera.zoom;
          updateCamera({ x: camera.x - dx, y: camera.y - dy });
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }
      };

      const handleMouseUp = () => {
        isDragging.current = false;
      };

      const handleContextMenu = (e: Event) => e.preventDefault();

      container.addEventListener("wheel", handleWheel, { passive: false });
      container.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("contextmenu", handleContextMenu);

      return () => {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        container.removeEventListener("contextmenu", handleContextMenu);
      };
    }, [camera, updateCamera]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width,
          height,
          overflow: "hidden",
          cursor: isDragging.current ? "grabbing" : "default"
        }}
        data-testid="layer-host"
      >
        {children}
      </div>
    );
  }
);

LayerHost.displayName = "LayerHost";
