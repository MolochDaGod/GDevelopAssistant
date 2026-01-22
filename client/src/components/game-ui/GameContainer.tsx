import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle  } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  X,
  Gamepad2,
  Expand,
  Shrink
} from "lucide-react";
import { Link } from "wouter";

export interface GameContainerProps {
  id: string;
  title: string;
  description?: string;
  iframeSrc: string;
  standalonePath?: string;
  thumbnail?: string;
  tags?: string[];
  controls?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9";
  defaultHeight?: number;
  allowFullscreen?: boolean;
  showControls?: boolean;
}

export function GameContainer({
  id,
  title,
  description,
  iframeSrc,
  standalonePath,
  thumbnail,
  tags = [],
  controls,
  aspectRatio = "16:9",
  defaultHeight = 400,
  allowFullscreen = true,
  showControls = true,
}: GameContainerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const aspectRatioClass = {
    "16:9": "aspect-video",
    "4:3": "aspect-[4/3]",
    "1:1": "aspect-square",
    "21:9": "aspect-[21/9]",
  }[aspectRatio];

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIframeKey(prev => prev + 1);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "mute", muted: !isMuted }, "*");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black flex flex-col"
        ref={containerRef}
        data-testid={`game-container-expanded-${id}`}
      >
        <div className="flex items-center justify-between p-3 bg-black/80 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">{title}</h2>
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {controls && (
              <span className="text-xs text-muted-foreground mr-4">{controls}</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              className="text-white hover:text-white"
              data-testid={`button-refresh-${id}`}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleMute}
              className="text-white hover:text-white"
              data-testid={`button-mute-${id}`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            {allowFullscreen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleFullscreen}
                className="text-white hover:text-white"
                data-testid={`button-fullscreen-${id}`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}
            {standalonePath && (
              <Link href={standalonePath}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:text-white"
                  data-testid={`button-standalone-${id}`}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleExpand}
              className="text-white hover:text-white"
              data-testid={`button-close-expanded-${id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeSrc}
            className="w-full h-full border-0"
            title={title}
            allow="fullscreen; autoplay"
            data-testid={`iframe-game-${id}`}
          />
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors"
      ref={containerRef}
      data-testid={`game-container-${id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className={`relative ${aspectRatioClass} bg-muted`} style={{ minHeight: isPlaying ? defaultHeight : 200 }}>
          {!isPlaying ? (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
              onClick={handlePlay}
              style={{
                backgroundImage: thumbnail ? `url(${thumbnail})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
              <Button
                size="lg"
                className="relative z-10 gap-2"
                data-testid={`button-play-${id}`}
              >
                <Play className="w-5 h-5" />
                Play Now
              </Button>
              {controls && (
                <p className="relative z-10 text-xs text-white/70 mt-3">{controls}</p>
              )}
            </div>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={iframeSrc}
                className="absolute inset-0 w-full h-full border-0"
                title={title}
                allow="fullscreen; autoplay"
                data-testid={`iframe-game-${id}`}
              />
              {showControls && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-lg p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleRefresh}
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    data-testid={`button-refresh-${id}`}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleExpand}
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    data-testid={`button-expand-${id}`}
                  >
                    <Expand className="w-3 h-3" />
                  </Button>
                  {allowFullscreen && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleFullscreen}
                      className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                      data-testid={`button-fullscreen-${id}`}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                  )}
                  {standalonePath && (
                    <Link href={standalonePath}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                        data-testid={`button-standalone-${id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleStop}
                    className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
                    data-testid={`button-stop-${id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function GameContainerGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="game-container-grid">
      {children}
    </div>
  );
}
