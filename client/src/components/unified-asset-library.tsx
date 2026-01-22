import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Search,
  Loader2,
  Box,
  Image,
  Music,
  Film,
  FileText,
  Trash2,
  Eye,
  Grid3X3,
  List,
  FolderOpen,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type { UnifiedAsset } from "@shared/schema";

const ASSET_TYPES = [
  { value: "all", label: "All Types", icon: Grid3X3 },
  { value: "model", label: "3D Models", icon: Box },
  { value: "texture", label: "Textures", icon: Image },
  { value: "sprite", label: "Sprites", icon: Image },
  { value: "audio", label: "Audio", icon: Music },
  { value: "animation", label: "Animations", icon: Film },
  { value: "map", label: "Maps", icon: FileText },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "characters", label: "Characters" },
  { value: "buildings", label: "Buildings" },
  { value: "weapons", label: "Weapons" },
  { value: "terrain", label: "Terrain" },
  { value: "props", label: "Props" },
  { value: "vehicles", label: "Vehicles" },
  { value: "nature", label: "Nature" },
  { value: "ui", label: "UI Elements" },
  { value: "sfx", label: "Sound Effects" },
  { value: "music", label: "Music" },
];

const LICENSES = [
  { value: "cc0", label: "CC0 (Public Domain)" },
  { value: "cc-by", label: "CC-BY (Attribution)" },
  { value: "cc-by-sa", label: "CC-BY-SA" },
  { value: "cc-by-nc", label: "CC-BY-NC (Non-Commercial)" },
  { value: "personal", label: "Personal Use Only" },
  { value: "commercial", label: "Commercial" },
  { value: "unknown", label: "Unknown" },
];

interface UnifiedAssetLibraryProps {
  onSelectAsset?: (asset: UnifiedAsset) => void;
  selectionMode?: boolean;
  filterTypes?: string[];
  filterCategories?: string[];
  showUpload?: boolean;
  compact?: boolean;
}

export function UnifiedAssetLibrary({
  onSelectAsset,
  selectionMode = false,
  filterTypes,
  filterCategories,
  showUpload = true,
  compact = false,
}: UnifiedAssetLibraryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedAsset, setSelectedAsset] = useState<UnifiedAsset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<UnifiedAsset | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const buildQueryUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (selectedType !== "all") params.set("type", selectedType);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    const queryString = params.toString();
    return queryString ? `/api/unified-assets?${queryString}` : "/api/unified-assets";
  }, [searchQuery, selectedType, selectedCategory]);

  const { data: assets = [], isLoading, refetch } = useQuery<UnifiedAsset[]>({
    queryKey: [buildQueryUrl()],
  });

  const filteredAssets = assets.filter((asset) => {
    if (filterTypes && filterTypes.length > 0 && !filterTypes.includes(asset.assetType)) {
      return false;
    }
    if (filterCategories && filterCategories.length > 0 && !filterCategories.includes(asset.category)) {
      return false;
    }
    return true;
  });

  const invalidateAssetQueries = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        typeof query.queryKey[0] === "string" &&
        query.queryKey[0].startsWith("/api/unified-assets"),
    });
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/unified-assets/${id}`);
    },
    onSuccess: () => {
      invalidateAssetQueries();
      toast({ title: "Asset deleted", description: "The asset has been removed from the library." });
      setSelectedAsset(null);
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not delete the asset.", variant: "destructive" });
    },
  });

  const handleSelectAsset = useCallback((asset: UnifiedAsset) => {
    setSelectedAsset(asset);
    if (selectionMode && onSelectAsset) {
      onSelectAsset(asset);
    }
  }, [selectionMode, onSelectAsset]);

  const handleDoubleClick = useCallback((asset: UnifiedAsset) => {
    if (selectionMode && onSelectAsset) {
      onSelectAsset(asset);
    } else {
      setPreviewAsset(asset);
    }
  }, [selectionMode, onSelectAsset]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "model": return <Box className="h-4 w-4" />;
      case "texture":
      case "sprite": return <Image className="h-4 w-4" />;
      case "audio": return <Music className="h-4 w-4" />;
      case "animation": return <Film className="h-4 w-4" />;
      case "map": return <FileText className="h-4 w-4" />;
      default: return <FolderOpen className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPreviewThumbnail = (asset: UnifiedAsset) => {
    if (asset.previewUrl) {
      return asset.previewUrl;
    }
    if (asset.assetType === "texture" || asset.assetType === "sprite") {
      return asset.fileUrl;
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full ${compact ? "gap-2" : "gap-4"}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-900 border-gray-700"
            data-testid="input-asset-search"
          />
        </div>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700" data-testid="select-asset-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border border-gray-700 rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-assets"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>

        {showUpload && (
          <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-open-upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      <ScrollArea className={compact ? "h-[300px]" : "flex-1"}>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
            <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No assets found</p>
            <p className="text-xs mt-1">Try adjusting your filters or upload new assets</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
            {filteredAssets.map((asset) => {
              const thumbnail = getPreviewThumbnail(asset);
              return (
                <Card
                  key={asset.id}
                  className={`cursor-pointer transition-all hover-elevate ${
                    selectedAsset?.id === asset.id
                      ? "border-red-600 bg-red-600/10"
                      : "border-gray-800 bg-gray-900"
                  }`}
                  onClick={() => handleSelectAsset(asset)}
                  onDoubleClick={() => handleDoubleClick(asset)}
                  data-testid={`asset-card-${asset.id}`}
                >
                  <div className="aspect-square relative bg-gray-800 rounded-t-lg overflow-hidden">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        {getAssetIcon(asset.assetType)}
                      </div>
                    )}
                    <Badge
                      variant="secondary"
                      className="absolute top-1 right-1 text-xs bg-gray-900/80"
                    >
                      {asset.assetType}
                    </Badge>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-sm font-medium truncate" title={asset.name}>
                      {asset.name}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>{asset.category}</span>
                      <span>{formatFileSize(asset.fileSize)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAsset?.id === asset.id
                    ? "bg-red-600/20 border border-red-600"
                    : "hover:bg-gray-900 border border-transparent"
                }`}
                onClick={() => handleSelectAsset(asset)}
                onDoubleClick={() => handleDoubleClick(asset)}
                data-testid={`asset-row-${asset.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                    {getPreviewThumbnail(asset) ? (
                      <img
                        src={getPreviewThumbnail(asset)!}
                        alt={asset.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      getAssetIcon(asset.assetType)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{asset.category}</span>
                      {asset.fileSize && <span>{formatFileSize(asset.fileSize)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {asset.assetType}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewAsset(asset);
                    }}
                    data-testid={`button-preview-${asset.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this asset?")) {
                        deleteMutation.mutate(asset.id);
                      }
                    }}
                    data-testid={`button-delete-${asset.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {selectedAsset && !selectionMode && (
        <div className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            {getAssetIcon(selectedAsset.assetType)}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedAsset.name}</p>
              <p className="text-xs text-gray-500">{selectedAsset.filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewAsset(selectedAsset)}
              data-testid="button-preview-selected"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Delete this asset?")) {
                  deleteMutation.mutate(selectedAsset.id);
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-selected"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <AssetPreviewDialog
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
      />

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={() => {
          refetch();
          setUploadDialogOpen(false);
        }}
      />
    </div>
  );
}

interface AssetPreviewDialogProps {
  asset: UnifiedAsset | null;
  onClose: () => void;
}

function AssetPreviewDialog({ asset, onClose }: AssetPreviewDialogProps) {
  if (!asset) return null;

  const isImage = asset.assetType === "texture" || asset.assetType === "sprite";
  const isModel = asset.assetType === "model";
  const isAudio = asset.assetType === "audio";

  return (
    <Dialog open={!!asset} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Box className="h-5 w-5 text-red-600" />
            {asset.name}
          </DialogTitle>
          <DialogDescription>
            {asset.category} - {asset.assetType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
            {isImage && (
              <img
                src={asset.fileUrl}
                alt={asset.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
            {isModel && (
              <div className="text-center text-gray-500 p-8">
                <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">3D Model Preview</p>
                <p className="text-xs mt-1">Use the 3D viewer to inspect this model</p>
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:underline text-xs mt-2 block"
                >
                  Download: {asset.filename}
                </a>
              </div>
            )}
            {isAudio && (
              <div className="text-center p-8">
                <Music className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <audio controls src={asset.fileUrl} className="w-full max-w-md" />
              </div>
            )}
            {!isImage && !isModel && !isAudio && (
              <div className="text-center text-gray-500 p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Preview not available</p>
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:underline text-xs mt-2 block"
                >
                  Download file
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Filename</p>
              <p className="font-mono text-xs truncate">{asset.filename}</p>
            </div>
            <div>
              <p className="text-gray-500">Size</p>
              <p>{asset.fileSize ? `${(asset.fileSize / 1024).toFixed(1)} KB` : "Unknown"}</p>
            </div>
            <div>
              <p className="text-gray-500">Source</p>
              <p>{asset.source}</p>
            </div>
            <div>
              <p className="text-gray-500">License</p>
              <p>{asset.license}</p>
            </div>
            {asset.tags && asset.tags.length > 0 && (
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {asset.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {asset.description && (
              <div className="col-span-2">
                <p className="text-gray-500 mb-1">Description</p>
                <p className="text-sm">{asset.description}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-preview">
            Close
          </Button>
          <Button asChild>
            <a href={asset.fileUrl} download={asset.filename} data-testid="button-download-asset">
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

function UploadDialog({ open, onOpenChange, onUploadComplete }: UploadDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("model");
  const [category, setCategory] = useState("characters");
  const [license, setLicense] = useState("unknown");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!assetName) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setAssetName(nameWithoutExt.replace(/_/g, " "));
      }
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
      if (["glb", "gltf", "fbx", "obj"].includes(ext)) {
        setAssetType("model");
      } else if (["png", "jpg", "jpeg", "webp", "tga"].includes(ext)) {
        setAssetType("texture");
      } else if (["mp3", "ogg", "wav", "m4a"].includes(ext)) {
        setAssetType("audio");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !assetName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a file and provide a name",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      const uploadUrlResponse = await fetch("/api/unified-assets/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          category,
          subcategory: null,
        }),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, storagePath, fileUrl } = await uploadUrlResponse.json();
      setUploadProgress(30);

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadProgress(60);

      const createAssetResponse = await apiRequest("POST", "/api/unified-assets", {
        name: assetName.trim(),
        filename: file.name,
        assetType,
        category,
        storagePath,
        fileUrl,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        tags: [assetType, category],
        description: description || undefined,
        source: "user-upload",
        license,
        scope: "user",
      });

      if (!createAssetResponse.ok) {
        throw new Error("Failed to save asset metadata");
      }

      setUploadProgress(100);

      toast({
        title: "Upload successful",
        description: `${assetName} has been added to your library`,
      });

      setFile(null);
      setAssetName("");
      setDescription("");
      setUploadProgress(0);
      onUploadComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setAssetName("");
    setDescription("");
    setUploadProgress(0);
    setAssetType("model");
    setCategory("characters");
    setLicense("unknown");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5 text-red-600" />
            Upload Asset
          </DialogTitle>
          <DialogDescription>
            Add a new asset to your unified library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              accept=".glb,.gltf,.fbx,.obj,.png,.jpg,.jpeg,.webp,.tga,.mp3,.ogg,.wav,.m4a"
              data-testid="input-upload-file"
            />
            {file && (
              <p className="text-xs text-gray-500">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-name">Asset Name</Label>
            <Input
              id="asset-name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Enter asset name"
              disabled={uploading}
              data-testid="input-upload-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType} disabled={uploading}>
                <SelectTrigger data-testid="select-upload-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="model">3D Model</SelectItem>
                  <SelectItem value="texture">Texture</SelectItem>
                  <SelectItem value="sprite">Sprite</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="animation">Animation</SelectItem>
                  <SelectItem value="map">Map</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>License</Label>
            <Select value={license} onValueChange={setLicense} disabled={uploading}>
              <SelectTrigger data-testid="select-upload-license">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LICENSES.map((lic) => (
                  <SelectItem key={lic.value} value={lic.value}>
                    {lic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the asset"
              disabled={uploading}
              data-testid="input-upload-description"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            data-testid="button-cancel-upload"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !assetName.trim() || uploading}
            data-testid="button-submit-upload"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UnifiedAssetLibrary;
