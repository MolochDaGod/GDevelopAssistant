import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

export interface Canvas2DHandle {
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  getSize: () => { width: number; height: number };
  clear: () => void;
}

export interface Canvas2DProps {
  onInit?: (deps: {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
  }) => void;
  onFrame?: (ctx: CanvasRenderingContext2D, deltaTime: number) => void;
  onResize?: (width: number, height: number) => void;
  onDispose?: () => void;
  fixedSize?: { width: number; height: number };
  pixelRatio?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Canvas2D = forwardRef<Canvas2DHandle, Canvas2DProps>(
  function Canvas2D(
    {
      onInit,
      onFrame,
      onResize,
      onDispose,
      fixedSize,
      pixelRatio,
      className,
      style,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const initializedRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      canvas: canvasRef.current,
      ctx: ctxRef.current,
      getSize: () => {
        const canvas = canvasRef.current;
        return canvas
          ? { width: canvas.width, height: canvas.height }
          : { width: 0, height: 0 };
      },
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      },
    }));

    const handleResize = useCallback(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!container || !canvas || !ctx) return;

      if (fixedSize) {
        canvas.width = fixedSize.width;
        canvas.height = fixedSize.height;
      } else {
        const dpr = pixelRatio ?? window.devicePixelRatio;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        ctx.scale(dpr, dpr);
      }

      onResize?.(canvas.width, canvas.height);
    }, [onResize, fixedSize, pixelRatio]);

    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Failed to get 2D canvas context");
        return;
      }
      ctxRef.current = ctx;

      if (fixedSize) {
        canvas.width = fixedSize.width;
        canvas.height = fixedSize.height;
      } else {
        const dpr = pixelRatio ?? window.devicePixelRatio;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        ctx.scale(dpr, dpr);
      }

      onInit?.({
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
      });

      initializedRef.current = true;

      const animate = (time: number) => {
        animationFrameRef.current = requestAnimationFrame(animate);

        const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = time;

        onFrame?.(ctx, deltaTime);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      const resizeObserver = new ResizeObserver(() => {
        if (!fixedSize) {
          handleResize();
        }
      });
      resizeObserver.observe(container);

      window.addEventListener("resize", handleResize);

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        window.removeEventListener("resize", handleResize);
        resizeObserver.disconnect();

        onDispose?.();

        initializedRef.current = false;
        ctxRef.current = null;
      };
    }, [fixedSize, pixelRatio, onInit, onFrame, onDispose, handleResize]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", overflow: "hidden", ...style }}
        data-testid="canvas-2d-container"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            touchAction: "none",
            ...(fixedSize ? {} : { width: "100%", height: "100%" }),
          }}
          data-testid="game-canvas-2d"
        />
      </div>
    );
  }
);
