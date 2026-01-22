interface LoadingVideoProps {
  message?: string;
  showLogo?: boolean;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export function LoadingVideo({ 
  message = "Loading...", 
  showLogo = true,
  fullScreen = false,
  size = "md"
}: LoadingVideoProps) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32"
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
    : "w-full h-full min-h-[200px]";

  return (
    <div 
      className={`${containerClasses} flex flex-col items-center justify-center gap-4`}
      data-testid="loading-container"
    >
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
      </div>

      {showLogo && (
        <div className="text-xl font-bold text-primary" data-testid="img-loading-logo">
          Grudge Studio
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <p 
          className="text-sm text-muted-foreground uppercase tracking-widest animate-pulse"
          data-testid="text-loading-message"
        >
          {message}
        </p>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
  progress?: number;
}

export function LoadingOverlay({ 
  message = "Loading...", 
  isVisible,
  progress = 0
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
      data-testid="loading-overlay"
    >
      <div className="relative">
        <div className="h-20 w-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>

      <div className="text-xl font-bold text-primary">
        Grudge Studio
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground uppercase tracking-widest animate-pulse">
          {message}
        </p>
        {progress > 0 && (
          <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
