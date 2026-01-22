import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, Maximize2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NeedleViewerProps {
  src: string;
  backgroundColor?: string;
  className?: string;
  autoRotate?: boolean;
  showControls?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function NeedleViewer({
  src,
  backgroundColor = "transparent",
  className,
  autoRotate = true,
  showControls = true,
  onLoad,
  onError,
}: NeedleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/@needle-tools/engine/dist/needle-engine.min.js";
    script.onload = () => {
      setIsLoading(false);
      onLoad?.();
    };
    script.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.(new Error("Failed to load Needle Engine"));
    };
    
    if (!document.querySelector('script[src*="needle-engine"]')) {
      document.head.appendChild(script);
    } else {
      setIsLoading(false);
    }

    return () => {
      // Script stays loaded for reuse
    };
  }, [onLoad, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleLoadEnd = () => setIsLoading(false);
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.(new Error("Scene failed to load"));
    };
    const handleContextLost = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.(new Error("WebGL context lost"));
    };

    container.addEventListener("loadstart", handleLoadStart);
    container.addEventListener("progress", handleLoadEnd);
    container.addEventListener("error", handleError);
    container.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      container.removeEventListener("loadstart", handleLoadStart);
      container.removeEventListener("progress", handleLoadEnd);
      container.removeEventListener("error", handleError);
      container.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [onError, refreshKey]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const reloadScene = () => {
    setRefreshKey(prev => prev + 1);
    setHasError(false);
  };

  if (hasError) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-900 rounded-lg", className)} data-testid="needle-viewer-error">
        <div className="text-center p-6">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Failed to load 3D scene</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reloadScene} data-testid="button-retry-needle">
            <RotateCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("relative bg-gray-900 rounded-lg overflow-hidden", className)}
      data-testid="needle-viewer"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10" data-testid="needle-loading">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading 3D Scene...</p>
          </div>
        </div>
      )}
      
      {!isLoading && (
        <needle-engine
          key={refreshKey}
          src={src}
          background-color={backgroundColor}
          loading-style="dark"
          camera-controls
          auto-rotate={autoRotate}
          style={{ width: "100%", height: "100%" }}
          data-testid="needle-engine-element"
        />
      )}

      {showControls && !isLoading && (
        <div className="absolute bottom-3 right-3 flex gap-2 z-20" data-testid="needle-controls">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            onClick={reloadScene}
            data-testid="button-needle-reload"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            onClick={toggleFullscreen}
            data-testid="button-needle-fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function NeedleCloudViewer({
  assetId,
  className,
  ...props
}: Omit<NeedleViewerProps, "src"> & { assetId: string }) {
  const cloudUrl = `https://cloud.needle.tools/-/assets/${assetId}/file`;
  return <NeedleViewer src={cloudUrl} className={className} {...props} />;
}
