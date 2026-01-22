import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";

export interface ThreeCanvasHandle {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  getSize: () => { width: number; height: number };
}

export interface ThreeCanvasProps {
  onInit?: (deps: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
  }) => void;
  onFrame?: (deltaTime: number) => void;
  onResize?: (width: number, height: number) => void;
  onDispose?: () => void;
  cameraType?: "perspective" | "orthographic";
  cameraConfig?: {
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
    lookAt?: [number, number, number];
    viewSize?: number;
  };
  rendererConfig?: {
    antialias?: boolean;
    alpha?: boolean;
    powerPreference?: "default" | "high-performance" | "low-power";
    pixelRatio?: number;
  };
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeCanvasProps>(
  function ThreeCanvas(
    {
      onInit,
      onFrame,
      onResize,
      onDispose,
      cameraType = "perspective",
      cameraConfig = {},
      rendererConfig = {},
      className,
      style,
      children,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const initializedRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      scene: sceneRef.current,
      camera: cameraRef.current,
      renderer: rendererRef.current,
      getSize: () => {
        const container = containerRef.current;
        return container
          ? { width: container.clientWidth, height: container.clientHeight }
          : { width: 0, height: 0 };
      },
    }));

    const handleResize = useCallback(() => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!container || !renderer || !camera) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const viewSize = cameraConfig.viewSize ?? 50;
        const aspect = width / height;
        camera.left = -viewSize * aspect;
        camera.right = viewSize * aspect;
        camera.top = viewSize;
        camera.bottom = -viewSize;
        camera.updateProjectionMatrix();
      }

      onResize?.(width, height);
    }, [onResize, cameraConfig.viewSize]);

    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
      if (cameraType === "orthographic") {
        const viewSize = cameraConfig.viewSize ?? 50;
        const aspect = width / height;
        camera = new THREE.OrthographicCamera(
          -viewSize * aspect,
          viewSize * aspect,
          viewSize,
          -viewSize,
          cameraConfig.near ?? 0.1,
          cameraConfig.far ?? 1000
        );
      } else {
        camera = new THREE.PerspectiveCamera(
          cameraConfig.fov ?? 75,
          width / height,
          cameraConfig.near ?? 0.1,
          cameraConfig.far ?? 1000
        );
      }

      if (cameraConfig.position) {
        camera.position.set(...cameraConfig.position);
      }
      if (cameraConfig.lookAt) {
        camera.lookAt(new THREE.Vector3(...cameraConfig.lookAt));
      }
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: rendererConfig.antialias ?? true,
        alpha: rendererConfig.alpha ?? false,
        powerPreference: rendererConfig.powerPreference ?? "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(rendererConfig.pixelRatio ?? window.devicePixelRatio);
      rendererRef.current = renderer;

      onInit?.({
        scene,
        camera,
        renderer,
        canvas,
        width,
        height,
      });

      initializedRef.current = true;

      const animate = (time: number) => {
        animationFrameRef.current = requestAnimationFrame(animate);

        const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = time;

        onFrame?.(deltaTime);

        renderer.render(scene, camera);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);

      window.addEventListener("resize", handleResize);

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener("resize", handleResize);
        resizeObserver.disconnect();

        onDispose?.();

        renderer.dispose();
        scene.clear();

        initializedRef.current = false;
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
      };
    }, [cameraType, cameraConfig, rendererConfig, onInit, onFrame, onDispose, handleResize]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", overflow: "hidden", ...style }}
        data-testid="three-canvas-container"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            touchAction: "none",
          }}
          data-testid="three-game-canvas"
        />
        {children}
      </div>
    );
  }
);
