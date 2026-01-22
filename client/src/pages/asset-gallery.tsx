import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewportAssetViewer, ImageViewport } from "@/components/viewport-asset-viewer";
import { 
  Search, 
  RefreshCw, 
  Box, 
  Sword, 
  Shield, 
  Users, 
  Castle, 
  Loader2,
  Eye,
  X,
  FileBox,
  Image as ImageIcon,
  Sparkles,
  CloudUpload,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Music,
  Grid3X3,
  Film,
  Layers
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ViewportAsset } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  unit: <Users className="h-4 w-4" />,
  weapon: <Sword className="h-4 w-4" />,
  siege: <Castle className="h-4 w-4" />,
  building: <Castle className="h-4 w-4" />,
  equipment: <Shield className="h-4 w-4" />,
  sound: <Volume2 className="h-4 w-4" />,
  background: <ImageIcon className="h-4 w-4" />,
  tileset: <Grid3X3 className="h-4 w-4" />,
  sprite: <Layers className="h-4 w-4" />,
  animation: <Film className="h-4 w-4" />,
};

const FACTION_COLORS: Record<string, string> = {
  orcs: "bg-green-600 text-white",
  elves: "bg-blue-500 text-white",
  humans: "bg-amber-500 text-white",
  undead: "bg-purple-600 text-white",
  skeletons: "bg-gray-500 text-white",
  combat: "bg-red-600 text-white",
  ui: "bg-cyan-600 text-white",
  music: "bg-pink-600 text-white",
  environment: "bg-green-700 text-white",
  player: "bg-blue-600 text-white",
  nature: "bg-emerald-600 text-white",
  sky: "bg-indigo-600 text-white",
  desert: "bg-orange-600 text-white",
  urban: "bg-slate-600 text-white",
  terrain: "bg-lime-600 text-white",
  dungeon: "bg-stone-600 text-white",
  platformer: "bg-yellow-600 text-white",
  character: "bg-violet-600 text-white",
  enemy: "bg-rose-600 text-white",
  item: "bg-amber-600 text-white",
  projectile: "bg-orange-500 text-white",
  effect: "bg-fuchsia-600 text-white",
};

function AudioPlayer({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setError(true);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <VolumeX className="h-12 w-12 mb-2" />
        <span className="text-xs text-center">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-br from-red-900/20 to-black">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-3 border-2 border-red-600">
        <Music className="h-8 w-8 text-red-500" />
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={togglePlay}
          className="h-10 w-10 bg-red-600 hover:bg-red-700"
          data-testid={`button-audio-play-${name}`}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleStop}
          className="h-8 w-8"
          data-testid={`button-audio-stop-${name}`}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </div>
    </div>
  );
}

function AnimatedSpritePreview({ src, metadata }: { src: string; metadata: Record<string, unknown> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const frameWidth = (metadata?.frameWidth as number) || 64;
  const frameHeight = (metadata?.frameHeight as number) || 64;
  const totalFrames = (metadata?.frames as number) || 4;
  const fps = (metadata?.fps as number) || 12;

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => setError(true);
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!imageLoaded) return;

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [imageLoaded, totalFrames, fps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const sx = frame * frameWidth;
    const sy = 0;
    
    ctx.drawImage(
      img,
      sx, sy, frameWidth, frameHeight,
      0, 0, canvas.width, canvas.height
    );
  }, [frame, imageLoaded, frameWidth, frameHeight]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Film className="h-12 w-12 mb-2" />
        <span className="text-xs">Animation unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black/50 p-2">
      <canvas 
        ref={canvasRef} 
        width={Math.min(frameWidth * 2, 128)} 
        height={Math.min(frameHeight * 2, 128)}
        className="image-rendering-pixelated"
        style={{ imageRendering: "pixelated" }}
      />
      <Badge className="mt-2 bg-red-600 text-xs">
        Frame {frame + 1}/{totalFrames}
      </Badge>
    </div>
  );
}

function TilesetPreview({ src }: { src: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Grid3X3 className="h-12 w-12 mb-2" />
        <span className="text-xs">Tileset preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black/50 p-2 flex items-center justify-center overflow-hidden">
      <img 
        src={src} 
        alt="Tileset" 
        className="max-w-full max-h-full object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={() => setError(true)}
      />
    </div>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2" />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export default function AssetGallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<ViewportAsset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const { data: assets = [], isLoading, isError, error, refetch } = useQuery<ViewportAsset[]>({
    queryKey: ["/api/viewport-assets", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      
      const response = await fetch(`/api/viewport-assets?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch assets");
      return response.json();
    },
    retry: 2,
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/viewport-assets/seed", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to seed assets");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Assets Seeded",
        description: `Successfully loaded ${(data as any).count} viewport assets`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/viewport-assets"] });
    },
    onError: (error) => {
      toast({
        title: "Seed Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const syncFromStorageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/viewport-assets/sync-from-storage", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to sync assets from storage");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "GLB Models Synced",
        description: `Added ${data.added} new models, ${data.skipped} already exist`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/viewport-assets"] });
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Some files failed",
          description: `${data.errors.length} file(s) had issues`,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const categories = ["all", ...Array.from(new Set(assets.map(a => a.category)))];
  const filteredAssets = assets.filter(asset => {
    if (selectedCategory !== "all" && asset.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.tags?.some(t => t.toLowerCase().includes(query)) ||
        asset.subcategory?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const isSupported3DModel = (assetType: string) => {
    return ["gltf", "glb"].includes(assetType.toLowerCase());
  };

  const isUnsupported3D = (assetType: string) => {
    return ["obj", "fbx"].includes(assetType.toLowerCase());
  };

  const isImage = (assetType: string) => {
    return ["png", "jpg", "jpeg", "gif", "webp", "tga", "sprite", "background"].includes(assetType.toLowerCase());
  };

  const isAudio = (assetType: string) => {
    return ["audio", "sound", "mp3", "wav", "ogg"].includes(assetType.toLowerCase());
  };

  const isTileset = (assetType: string) => {
    return ["tileset"].includes(assetType.toLowerCase());
  };

  const isSpritesheet = (assetType: string) => {
    return ["spritesheet", "animation"].includes(assetType.toLowerCase());
  };

  const renderAssetPreview = (asset: ViewportAsset, isLarge = false) => {
    if (isAudio(asset.assetType)) {
      return <AudioPlayer src={asset.filePath} name={asset.slug} />;
    }
    
    if (isSpritesheet(asset.assetType) && asset.isAnimated) {
      return <AnimatedSpritePreview src={asset.filePath} metadata={asset.metadata as Record<string, unknown>} />;
    }
    
    if (isTileset(asset.assetType)) {
      return <TilesetPreview src={asset.filePath} />;
    }
    
    if (isSupported3DModel(asset.assetType)) {
      return (
        <ViewportAssetViewer
          filePath={asset.filePath}
          className="w-full h-full"
          viewportConfig={asset.viewportConfig as any}
          showControls={isLarge}
          autoRotate={true}
        />
      );
    }
    
    if (isUnsupported3D(asset.assetType)) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <FileBox className="h-12 w-12 mb-2" />
          <span className="text-xs">{asset.assetType.toUpperCase()} (Preview N/A)</span>
        </div>
      );
    }
    
    if (isImage(asset.assetType)) {
      return <ImagePreview src={asset.filePath} alt={asset.name} />;
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <FileBox className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-asset-gallery">
      <div className="p-6 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-page-title">
              3D Asset Gallery
            </h1>
            <p className="text-muted-foreground">
              Browse 3D models and animations for game development
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => syncFromStorageMutation.mutate()}
              disabled={syncFromStorageMutation.isPending}
              data-testid="button-sync-storage"
            >
              {syncFromStorageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              Sync GLB Models
            </Button>
            <Button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-seed-assets"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Load Assets
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, tag, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-black/50 flex-wrap">
              <TabsTrigger value="all" data-testid="tab-all">
                <Box className="h-4 w-4 mr-1" />
                All 3D
              </TabsTrigger>
              <TabsTrigger value="unit" data-testid="tab-unit">
                <Users className="h-4 w-4 mr-1" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="weapon" data-testid="tab-weapon">
                <Sword className="h-4 w-4 mr-1" />
                Weapons
              </TabsTrigger>
              <TabsTrigger value="building" data-testid="tab-building">
                <Castle className="h-4 w-4 mr-1" />
                Buildings
              </TabsTrigger>
              <TabsTrigger value="equipment" data-testid="tab-equipment">
                <Shield className="h-4 w-4 mr-1" />
                Equipment
              </TabsTrigger>
              <TabsTrigger value="animation" data-testid="tab-animation">
                <Film className="h-4 w-4 mr-1" />
                Animations
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Assets</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="p-4">
                  <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Box className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Assets Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Click 'Load Assets' to populate the gallery with free game assets"}
            </p>
            {!searchQuery && assets.length === 0 && (
              <Button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-seed-empty"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Load Assets
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <Card 
                key={asset.id} 
                className="bg-card/50 hover-elevate cursor-pointer group overflow-visible"
                onClick={() => {
                  setSelectedAsset(asset);
                  setShowPreview(true);
                }}
                data-testid={`card-asset-${asset.slug}`}
              >
                <CardContent className="p-4">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/50 mb-3 relative">
                    {renderAssetPreview(asset)}
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 bg-black/70"
                        data-testid={`button-preview-${asset.slug}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {asset.isAnimated && (
                      <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs">
                        Animated
                      </Badge>
                    )}
                    
                    {isAudio(asset.assetType) && (
                      <Badge className="absolute top-2 left-2 bg-purple-600 text-white text-xs">
                        Audio
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-white truncate mb-1" data-testid={`text-asset-name-${asset.slug}`}>
                    {asset.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_ICONS[asset.category] || <Box className="h-3 w-3" />}
                      <span className="ml-1">{asset.category}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs uppercase">
                      {asset.assetType}
                    </Badge>
                  </div>
                  
                  {asset.subcategory && (
                    <Badge 
                      className={`text-xs ${FACTION_COLORS[asset.subcategory] || "bg-gray-600 text-white"}`}
                      data-testid={`badge-faction-${asset.slug}`}
                    >
                      {asset.subcategory}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedAsset?.name}
              {selectedAsset?.isAnimated && (
                <Badge className="bg-red-600 text-white">Animated</Badge>
              )}
              {selectedAsset && isAudio(selectedAsset.assetType) && (
                <Badge className="bg-purple-600 text-white">Audio</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-lg overflow-hidden bg-black/50">
                {renderAssetPreview(selectedAsset, true)}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">File Path</h4>
                  <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto">
                    {selectedAsset.filePath}
                  </code>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {CATEGORY_ICONS[selectedAsset.category]}
                      <span className="ml-1">{selectedAsset.category}</span>
                    </Badge>
                    {selectedAsset.subcategory && (
                      <Badge className={FACTION_COLORS[selectedAsset.subcategory] || "bg-gray-600"}>
                        {selectedAsset.subcategory}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Asset Type</h4>
                  <Badge variant="secondary" className="uppercase">
                    {selectedAsset.assetType}
                  </Badge>
                </div>
                
                {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {(() => {
                  const meta = selectedAsset.metadata as Record<string, unknown> | null | undefined;
                  if (meta && typeof meta === "object" && Object.keys(meta).length > 0) {
                    return (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Metadata</h4>
                        <pre className="text-xs bg-black/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(meta, null, 2)}
                        </pre>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="pt-4">
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.filePath);
                      toast({
                        title: "Copied",
                        description: "File path copied to clipboard",
                      });
                    }}
                    data-testid="button-copy-path"
                  >
                    Copy File Path
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
