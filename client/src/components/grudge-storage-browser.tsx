import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  File,
  Search,
  Loader2,
  Box,
  ChevronRight,
  Home,
  RefreshCw,
} from "lucide-react";

interface StorageAsset {
  id: string;
  uuid: string;
  filename: string;
  type: string;
  folder: string;
  url: string;
  directUrl: string;
  storagePath: string;
  size?: number;
}

interface GrudgeStorageBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: StorageAsset) => void;
  fileTypes?: string[];
  title?: string;
}

export function GrudgeStorageBrowser({
  open,
  onOpenChange,
  onSelect,
  fileTypes = [".glb", ".gltf"],
  title = "Upload from Grudge Storage",
}: GrudgeStorageBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<StorageAsset | null>(null);

  const { data, isLoading, refetch } = useQuery<{ count: number; assets: StorageAsset[] }>({
    queryKey: ["/api/asset-registry"],
    enabled: open,
  });

  const assets = data?.assets || [];

  const filteredAssets = assets.filter((asset) => {
    const matchesType = fileTypes.some((ext) =>
      asset.filename.toLowerCase().endsWith(ext.toLowerCase())
    );
    const matchesSearch = searchQuery
      ? asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.folder.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesFolder = currentFolder
      ? asset.folder === currentFolder
      : true;
    return matchesType && matchesSearch && matchesFolder;
  });

  const folders = Array.from(new Set(assets.map((a) => a.folder))).filter(Boolean).sort();

  const handleSelect = useCallback(() => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onOpenChange(false);
      setSelectedAsset(null);
      setSearchQuery("");
      setCurrentFolder(null);
    }
  }, [selectedAsset, onSelect, onOpenChange]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!open) {
      setSelectedAsset(null);
      setSearchQuery("");
      setCurrentFolder(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-gray-950 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Box className="h-5 w-5 text-red-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-900 border-gray-700"
                data-testid="input-storage-search"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-storage"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setCurrentFolder(null)}
              data-testid="button-storage-home"
            >
              <Home className="h-3 w-3 mr-1" />
              All
            </Button>
            {currentFolder && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Badge variant="secondary" className="font-normal">
                  {currentFolder}
                </Badge>
              </>
            )}
          </div>

          {!currentFolder && folders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {folders.map((folder) => (
                <Button
                  key={folder}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setCurrentFolder(folder)}
                  data-testid={`folder-${folder}`}
                >
                  <Folder className="h-3 w-3 mr-1 text-yellow-500" />
                  {folder}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {assets.filter((a) => a.folder === folder).length}
                  </Badge>
                </Button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[300px] border border-gray-800 rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Box className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No models found</p>
                <p className="text-xs mt-1">Upload models to your Grudge Storage to see them here</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAsset?.id === asset.id
                        ? "bg-red-600/20 border border-red-600"
                        : "hover:bg-gray-900 border border-transparent"
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                    onDoubleClick={() => {
                      setSelectedAsset(asset);
                      handleSelect();
                    }}
                    data-testid={`asset-item-${asset.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <File className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`asset-name-${asset.id}`}>
                          {asset.filename}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{asset.folder || "root"}</span>
                          {asset.size && <span>{formatFileSize(asset.size)}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {asset.filename.split(".").pop()?.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filteredAssets.length} model{filteredAssets.length !== 1 ? "s" : ""} available
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-storage"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleSelect}
                disabled={!selectedAsset}
                data-testid="button-select-asset"
              >
                Select Model
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
