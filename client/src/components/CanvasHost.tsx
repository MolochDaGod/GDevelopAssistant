import { useRef, useEffect, useCallback } from "react";

export interface CanvasHostConfig {
  type: "webgl" | "2d";
  antialias?: boolean;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: "default" | "high-performance" | "low-power";
}

export interface GameDependencies {
  canvas: HTMLCanvasElement;
  context: WebGLRenderingContext | WebGL2RenderingContext | CanvasRenderingContext2D | null;
  width: number;
  height: number;
}

export interface GameCallbacks {
  onInit: (deps: GameDependencies) => void | Promise<void>;
  onFrame: (deps: GameDependencies, deltaTime: number) => void;
  onResize: (deps: GameDependencies) => void;
  onDispose: () => void;
}

interface CanvasHostProps {
  config: CanvasHostConfig;
  callbacks: GameCallbacks;
  className?: string;
  style?: React.CSSProperties;
}

export function CanvasHost({ config, callbacks, className, style }: CanvasHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const contextRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | CanvasRenderingContext2D | null>(null);

  const getDependencies = useCallback((): GameDependencies | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    return {
      canvas,
      context: contextRef.current,
      width: canvas.width,
      height: canvas.height,
    };
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const deps = getDependencies();
    if (deps && initializedRef.current) {
      callbacks.onResize(deps);
    }
  }, [callbacks, getDependencies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const contextOptions = {
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? false,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
      powerPreference: config.powerPreference ?? "high-performance",
    };

    if (config.type === "webgl") {
      const ctx = canvas.getContext("webgl2", contextOptions) || 
                  canvas.getContext("webgl", contextOptions);
      contextRef.current = ctx as WebGLRenderingContext | WebGL2RenderingContext | null;
    } else {
      contextRef.current = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    }

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const deps = getDependencies();
    if (deps) {
      const initResult = callbacks.onInit(deps);
      if (initResult instanceof Promise) {
        initResult.then(() => {
          initializedRef.current = true;
        });
      } else {
        initializedRef.current = true;
      }
    }

    const frameLoop = (time: number) => {
      if (!initializedRef.current) {
        animationFrameRef.current = requestAnimationFrame(frameLoop);
        return;
      }

      const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;

      const frameDeps = getDependencies();
      if (frameDeps) {
        callbacks.onFrame(frameDeps, deltaTime);
      }

      animationFrameRef.current = requestAnimationFrame(frameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(frameLoop);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      
      if (initializedRef.current) {
        callbacks.onDispose();
      }
      
      initializedRef.current = false;
      contextRef.current = null;
    };
  }, [config, callbacks, getDependencies, handleResize]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      data-testid="canvas-host-container"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
        }}
        data-testid="game-canvas"
      />
    </div>
  );
}

export function useGameCanvas(
  config: CanvasHostConfig,
  callbacks: GameCallbacks
) {
  return { config, callbacks };
}
