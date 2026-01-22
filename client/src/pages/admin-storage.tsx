import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FolderOpen,
  File,
  Box,
  Image,
  Music,
  FileCode,
  Trash2,
  Edit,
  Move,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  ChevronRight,
  Home,
  FolderPlus,
  Upload,
  Layers,
  CuboidIcon,
  Info,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface StorageItem {
  name: string;
  path: string;
  fullPath: string;
  type: "file" | "folder";
  size?: number;
  contentType?: string;
  createdAt?: string;
  extension?: string;
}

interface StorageListResponse {
  items: StorageItem[];
  folders: string[];
  currentPath: string;
  breadcrumbs: { name: string; path: string }[];
}

interface AssetMetadata {
  id: string;
  storagePath: string;
  filename: string;
  fileType: string;
  fileSize?: number;
  meshes: Array<{ name: string; vertexCount?: number; faceCount?: number }>;
  materials: Array<{ name: string; type?: string; color?: string }>;
  animations: Array<{ name: string; duration?: number }>;
  textures: Array<{ name: string; size?: string }>;
  boundingBox?: { min: any; max: any; center?: any; size?: any };
  sceneInfo?: { nodeCount?: number; totalVertices?: number; totalFaces?: number };
  folder: string;
  tags: string[];
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(item: StorageItem) {
  if (item.type === "folder") return FolderOpen;
  const ext = item.extension?.toLowerCase() || "";
  if (["glb", "gltf", "fbx", "obj"].includes(ext)) return Box;
  if (["png", "jpg", "jpeg", "webp", "gif", "tga"].includes(ext)) return Image;
  if (["mp3", "wav", "ogg"].includes(ext)) return Music;
  if (["json", "js", "ts", "tsx"].includes(ext)) return FileCode;
  return File;
}

function is3DFile(item: StorageItem): boolean {
  const ext = item.extension?.toLowerCase() || "";
  return ["glb", "gltf"].includes(ext);
}

function Model3DViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const modelRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);
    setProgress(0);

    const container = containerRef.current;
    let cleanup: (() => void) | null = null;

    // Dynamic import for THREE.js to reduce bundle size (CRITICAL optimization)
    (async () => {
      try {
        const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js")
        ]);

        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
          45,
          container.clientWidth / container.clientHeight,
          0.1,
          1000
        );
        camera.position.set(3, 3, 3);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        const loader = new GLTFLoader();
        loader.load(
          url,
          (gltf) => {
            const model = gltf.scene;
            modelRef.current = model;
            
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            
            scene.add(model);
            setLoading(false);
          },
          (xhr) => {
            if (xhr.lengthComputable) {
              setProgress(Math.round((xhr.loaded / xhr.total) * 100));
            }
          },
          (err) => {
            console.error("Error loading model:", err);
            setError("Failed to load 3D model");
            setLoading(false);
          }
        );

        const animate = () => {
          animationIdRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
          if (!containerRef.current || !renderer) return;
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        cleanup = () => {
          window.removeEventListener("resize", handleResize);
          if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
          
          if (modelRef.current) {
            modelRef.current.traverse((child: any) => {
              if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                  child.material.forEach((m: any) => m.dispose());
                } else {
                  child.material?.dispose();
                }
              }
            });
            scene.remove(modelRef.current);
            modelRef.current = null;
          }
          
          controls.dispose();
          renderer.dispose();
          if (containerRef.current?.contains(renderer.domElement)) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error("Error loading 3D viewer:", err);
        setError("Failed to load 3D viewer");
        setLoading(false);
      }
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, [url]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading... {progress > 0 ? `${progress}%` : ""}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-red-500 text-center">
            <CuboidIcon className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Model3DPreview({ url, onMetadataExtracted }: { url: string; onMetadataExtracted?: (data: any) => void }) {
  return (
    <div className="w-full h-[400px] bg-black/20 rounded-lg overflow-hidden">
      <Model3DViewer url={url} />
    </div>
  );
}

export default function AdminStoragePage() {
  const [currentPath, setCurrentPath] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [renameItem, setRenameItem] = useState<StorageItem | null>(null);
  const [newName, setNewName] = useState("");
  const [moveItem, setMoveItem] = useState<StorageItem | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<StorageItem | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadata | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<StorageListResponse>({
    queryKey: ["/api/admin/storage", currentPath],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPath) params.append("path", currentPath);
      const response = await fetch(`/api/admin/storage?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch storage");
      return response.json();
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      return apiRequest("POST", "/api/admin/storage/rename", { oldPath, newName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage", currentPath] });
      setRenameItem(null);
      toast({ title: "Renamed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Rename failed", description: error.message, variant: "destructive" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ sourcePath, targetFolder }: { sourcePath: string; targetFolder: string }) => {
      return apiRequest("POST", "/api/admin/storage/move", { sourcePath, targetFolder });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage", currentPath] });
      if (variables.targetFolder !== currentPath) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/storage", variables.targetFolder] });
      }
      setMoveItem(null);
      toast({ title: "Moved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Move failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest("POST", "/api/admin/storage/delete", { path });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage", currentPath] });
      setDeleteConfirm(null);
      toast({ title: "Deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ parentPath, folderName }: { parentPath: string; folderName: string }) => {
      return apiRequest("POST", "/api/admin/storage/create-folder", { parentPath, folderName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/storage", currentPath] });
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast({ title: "Folder created" });
    },
    onError: (error: any) => {
      toast({ title: "Create folder failed", description: error.message, variant: "destructive" });
    },
  });

  const parseMetadataMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(`/api/admin/storage/parse-model?path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error("Failed to parse model");
      return response.json();
    },
    onSuccess: (data) => {
      setAssetMetadata(data);
    },
  });

  const navigateToFolder = useCallback((path: string) => {
    setCurrentPath(path);
    setSelectedItem(null);
  }, []);

  const handleItemClick = useCallback((item: StorageItem) => {
    if (item.type === "folder") {
      navigateToFolder(item.path);
    } else {
      setSelectedItem(item);
      if (is3DFile(item)) {
        parseMetadataMutation.mutate(item.fullPath);
      }
    }
  }, [navigateToFolder, parseMetadataMutation]);

  const handleRename = useCallback(() => {
    if (renameItem && newName) {
      renameMutation.mutate({ oldPath: renameItem.fullPath, newName });
    }
  }, [renameItem, newName, renameMutation]);

  const handleMove = useCallback(() => {
    if (moveItem && moveTarget) {
      moveMutation.mutate({ sourcePath: moveItem.fullPath, targetFolder: moveTarget });
    }
  }, [moveItem, moveTarget, moveMutation]);

  const handleDelete = useCallback(() => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.fullPath);
    }
  }, [deleteConfirm, deleteMutation]);

  const handleCreateFolder = useCallback(() => {
    if (newFolderName) {
      createFolderMutation.mutate({ parentPath: currentPath, folderName: newFolderName });
    }
  }, [currentPath, newFolderName, createFolderMutation]);

  const filteredItems = data?.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 
                className="text-2xl font-bold text-white flex items-center gap-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                data-testid="text-admin-storage-title"
              >
                <Layers className="h-6 w-6 text-red-500" />
                Storage Admin
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage files, folders, and 3D model metadata
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Link href="/asset-catalog">
                <Button variant="outline" size="sm" data-testid="button-catalog">
                  View Catalog
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-back-home">
                  Back to App
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateToFolder("")}
              className={currentPath === "" ? "bg-accent" : ""}
              data-testid="button-root"
            >
              <Home className="h-4 w-4" />
            </Button>
            {data?.breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToFolder(crumb.path)}
                  data-testid={`button-breadcrumb-${idx}`}
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setCreateFolderOpen(true)}
              data-testid="button-create-folder"
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const IconComponent = getFileIcon(item);
                const isSelected = selectedItem?.fullPath === item.fullPath;
                
                return (
                  <ContextMenu key={item.fullPath}>
                    <ContextMenuTrigger>
                      <Card 
                        className={`cursor-pointer transition-all hover-elevate ${
                          isSelected ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleItemClick(item)}
                        data-testid={`item-${item.name}`}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            item.type === "folder" ? "bg-amber-500/20" : "bg-blue-500/20"
                          }`}>
                            <IconComponent className={`h-5 w-5 ${
                              item.type === "folder" ? "text-amber-500" : "text-blue-500"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type === "folder" ? "Folder" : formatFileSize(item.size)}
                            </p>
                          </div>
                          {is3DFile(item) && (
                            <Badge variant="outline" className="shrink-0">
                              <CuboidIcon className="h-3 w-3 mr-1" />
                              3D
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {item.type === "file" && is3DFile(item) && (
                        <>
                          <ContextMenuItem onClick={() => setPreviewItem(item)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview 3D Model
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                        </>
                      )}
                      <ContextMenuItem onClick={() => {
                        setRenameItem(item);
                        setNewName(item.name);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => {
                        setMoveItem(item);
                        setMoveTarget(currentPath);
                      }}>
                        <Move className="h-4 w-4 mr-2" />
                        Move
                      </ContextMenuItem>
                      {item.type === "file" && (
                        <ContextMenuItem onClick={() => window.open(`/api/admin/storage/download?path=${encodeURIComponent(item.fullPath)}`)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteConfirm(item)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
              
              {filteredItems.length === 0 && !isLoading && (
                <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
                  <p>No files in this folder</p>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedItem && selectedItem.type === "file" && (
          <div className="w-80 border-l p-4 overflow-auto bg-card/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              File Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium break-all">{selectedItem.name}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="text-sm">{formatFileSize(selectedItem.size)}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm">{selectedItem.contentType || selectedItem.extension?.toUpperCase() || "Unknown"}</p>
              </div>

              {is3DFile(selectedItem) && (
                <>
                  <Button 
                    className="w-full" 
                    onClick={() => setPreviewItem(selectedItem)}
                    data-testid="button-preview-3d"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview 3D Model
                  </Button>

                  {parseMetadataMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing model metadata...
                    </div>
                  )}

                  {assetMetadata && (
                    <Tabs defaultValue="meshes" className="w-full">
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="meshes">Meshes</TabsTrigger>
                        <TabsTrigger value="materials">Materials</TabsTrigger>
                        <TabsTrigger value="animations">Animations</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="meshes" className="mt-2">
                        <ScrollArea className="h-32">
                          {assetMetadata.meshes.length > 0 ? (
                            <div className="space-y-1">
                              {assetMetadata.meshes.map((mesh, idx) => (
                                <div key={idx} className="text-xs p-2 bg-black/20 rounded">
                                  <p className="font-medium">{mesh.name}</p>
                                  {mesh.vertexCount && (
                                    <p className="text-muted-foreground">{mesh.vertexCount} vertices</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No meshes found</p>
                          )}
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="materials" className="mt-2">
                        <ScrollArea className="h-32">
                          {assetMetadata.materials.length > 0 ? (
                            <div className="space-y-1">
                              {assetMetadata.materials.map((mat, idx) => (
                                <div key={idx} className="text-xs p-2 bg-black/20 rounded flex items-center gap-2">
                                  {mat.color && (
                                    <div 
                                      className="w-4 h-4 rounded border"
                                      style={{ backgroundColor: mat.color }}
                                    />
                                  )}
                                  <p className="font-medium">{mat.name}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No materials found</p>
                          )}
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="animations" className="mt-2">
                        <ScrollArea className="h-32">
                          {assetMetadata.animations.length > 0 ? (
                            <div className="space-y-1">
                              {assetMetadata.animations.map((anim, idx) => (
                                <div key={idx} className="text-xs p-2 bg-black/20 rounded">
                                  <p className="font-medium">{anim.name}</p>
                                  {anim.duration && (
                                    <p className="text-muted-foreground">{anim.duration.toFixed(2)}s</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No animations found</p>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CuboidIcon className="h-5 w-5" />
              {previewItem?.name}
            </DialogTitle>
          </DialogHeader>
          {previewItem && (
            <Model3DPreview 
              url={`/api/admin/storage/download?path=${encodeURIComponent(previewItem.fullPath)}`}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameItem} onOpenChange={() => setRenameItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Enter a new name for this item</DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
            data-testid="input-new-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameItem(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRename}
              disabled={renameMutation.isPending}
              data-testid="button-confirm-rename"
            >
              {renameMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveItem} onOpenChange={() => setMoveItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>Enter the target folder path</DialogDescription>
          </DialogHeader>
          <Input
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
            placeholder="Target folder path (e.g., 3DAssets/characters)"
            data-testid="input-move-target"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveItem(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMove}
              disabled={moveMutation.isPending}
              data-testid="button-confirm-move"
            >
              {moveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>Enter a name for the new folder</DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            data-testid="input-folder-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
              data-testid="button-confirm-create-folder"
            >
              {createFolderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
