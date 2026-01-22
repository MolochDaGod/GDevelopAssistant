import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Grid3X3,
  Move,
  Square,
  Circle,
  Pencil,
  Eraser,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  FolderOpen,
  Download,
  Upload,
  Layers,
  Box,
  User,
  Sword,
  Home,
  TreePine,
  Mountain,
  Trash2,
  Copy,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Settings,
  Play,
  Pause,
  ArrowLeft,
  Plus,
  Minus,
  Wand2,
  Map,
  Target,
  Castle,
  Trees,
  Car,
  Crosshair,
  Users,
  Gamepad2,
  Loader2,
  Bug,
  RefreshCw,
  Maximize,
  Minimize,
  Camera,
  Sun,
  Moon,
  CloudSun,
  Cuboid,
  LayoutGrid,
  Sparkles,
  Clipboard,
  ClipboardPaste,
  CopyPlus,
  RotateCw
} from "lucide-react";
import { Link } from "wouter";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlayModeController } from "@/lib/playModeController";

// Types
interface Point {
  x: number;
  y: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Segment {
  id: string;
  start: Point;
  end: Point;
  height: number;
  texture?: string;
  type: 'wall' | 'door' | 'window';
}

interface Sector {
  id: string;
  points: Point[];
  floorHeight: number;
  ceilingHeight: number;
  floorTexture?: string;
  ceilingTexture?: string;
  lightLevel: number;
}

interface Entity {
  id: string;
  type: string;
  position: Point3D;
  rotation: Point3D;
  scale: Point3D;
  properties: Record<string, unknown>;
  modelUrl?: string;
  modelId?: string;
}

interface MapData {
  name: string;
  width: number;
  height: number;
  depth: number;
  gridSize: number;
  segments: Segment[];
  sectors: Sector[];
  entities: Entity[];
  spawnPoints: Point3D[];
  terrain: {
    type: 'flat' | 'heightmap' | 'procedural';
    biome: string;
    seed: number;
  };
  lighting: {
    ambientColor: string;
    ambientIntensity: number;
    sunColor: string;
    sunIntensity: number;
    sunPosition: Point3D;
  };
  gameType: string;
  createdAt: string;
  updatedAt: string;
}

// Map Template Types
interface MapTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  defaultSize: { width: number; height: number; depth: number };
  terrainType: 'flat' | 'heightmap' | 'procedural';
  biome: string;
  features: string[];
}

// Map Templates for Auto-Generation
const MAP_TEMPLATES: MapTemplate[] = [
  {
    id: 'arena',
    name: 'Arena',
    description: 'Circular combat arena with spectator stands',
    icon: Target,
    category: 'pvp',
    defaultSize: { width: 256, height: 64, depth: 256 },
    terrainType: 'flat',
    biome: 'stone',
    features: ['circular_walls', 'spawn_points', 'health_pickups', 'weapon_pickups']
  },
  {
    id: 'battleground',
    name: 'Battleground',
    description: 'Large open battlefield with cover positions',
    icon: Sword,
    category: 'pvp',
    defaultSize: { width: 512, height: 128, depth: 512 },
    terrainType: 'procedural',
    biome: 'grassland',
    features: ['terrain_variation', 'cover_objects', 'capture_points', 'vehicle_spawns']
  },
  {
    id: 'town',
    name: 'Town Scene',
    description: 'Medieval town with buildings and streets',
    icon: Castle,
    category: 'rpg',
    defaultSize: { width: 512, height: 64, depth: 512 },
    terrainType: 'flat',
    biome: 'grassland',
    features: ['buildings', 'streets', 'marketplace', 'npcs', 'quests']
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Dense forest environment with clearings',
    icon: Trees,
    category: 'survival',
    defaultSize: { width: 1024, height: 256, depth: 1024 },
    terrainType: 'procedural',
    biome: 'forest',
    features: ['trees', 'rocks', 'wildlife', 'resources', 'water']
  },
  {
    id: 'moba',
    name: 'MOBA',
    description: '3-lane MOBA map with jungle',
    icon: LayoutGrid,
    category: 'competitive',
    defaultSize: { width: 512, height: 32, depth: 512 },
    terrainType: 'flat',
    biome: 'grassland',
    features: ['lanes', 'towers', 'jungle', 'bases', 'minion_spawns']
  },
  {
    id: 'open_world',
    name: 'Open World',
    description: 'Large explorable world with varied terrain',
    icon: Map,
    category: 'exploration',
    defaultSize: { width: 2048, height: 512, depth: 2048 },
    terrainType: 'procedural',
    biome: 'mixed',
    features: ['biome_transitions', 'points_of_interest', 'dungeons', 'villages']
  },
  {
    id: 'race_track',
    name: 'Race Track',
    description: 'Racing circuit with checkpoints',
    icon: Car,
    category: 'racing',
    defaultSize: { width: 1024, height: 64, depth: 1024 },
    terrainType: 'heightmap',
    biome: 'desert',
    features: ['track_path', 'checkpoints', 'barriers', 'spectator_areas']
  },
  {
    id: 'fps',
    name: 'FPS Arena',
    description: 'First-person shooter map with corridors',
    icon: Crosshair,
    category: 'shooter',
    defaultSize: { width: 256, height: 128, depth: 256 },
    terrainType: 'flat',
    biome: 'industrial',
    features: ['corridors', 'rooms', 'verticality', 'weapon_spawns', 'cover']
  },
  {
    id: 'tps',
    name: 'TPS Level',
    description: 'Third-person shooter level design',
    icon: User,
    category: 'shooter',
    defaultSize: { width: 384, height: 96, depth: 384 },
    terrainType: 'heightmap',
    biome: 'urban',
    features: ['cover_system', 'vantage_points', 'flank_routes', 'objectives']
  },
  {
    id: 'mmo',
    name: 'MMO Zone',
    description: 'Large zone for MMO gameplay',
    icon: Users,
    category: 'mmorpg',
    defaultSize: { width: 1024, height: 256, depth: 1024 },
    terrainType: 'procedural',
    biome: 'fantasy',
    features: ['quest_hubs', 'mob_spawns', 'dungeons', 'fast_travel', 'gathering']
  },
  {
    id: 'turn_based',
    name: 'Turn-Based Grid',
    description: 'Grid-based tactical combat map',
    icon: Grid3X3,
    category: 'strategy',
    defaultSize: { width: 128, height: 32, depth: 128 },
    terrainType: 'flat',
    biome: 'grassland',
    features: ['grid_tiles', 'elevation', 'cover_tiles', 'objective_tiles']
  },
  {
    id: 'rpg_dungeon',
    name: 'RPG Dungeon',
    description: 'Classic dungeon crawler layout',
    icon: Castle,
    category: 'rpg',
    defaultSize: { width: 256, height: 64, depth: 256 },
    terrainType: 'flat',
    biome: 'dungeon',
    features: ['rooms', 'corridors', 'traps', 'treasure', 'boss_room']
  },
  {
    id: 'survival',
    name: 'Survival Island',
    description: 'Island survival scenario',
    icon: TreePine,
    category: 'survival',
    defaultSize: { width: 512, height: 128, depth: 512 },
    terrainType: 'procedural',
    biome: 'tropical',
    features: ['beaches', 'jungle', 'caves', 'resources', 'wildlife']
  },
  {
    id: 'world_building',
    name: 'World Canvas',
    description: 'Blank canvas for world building',
    icon: Sparkles,
    category: 'creative',
    defaultSize: { width: 1024, height: 256, depth: 1024 },
    terrainType: 'flat',
    biome: 'grassland',
    features: ['empty_canvas', 'full_tools', 'unlimited_entities']
  },
  {
    id: 'pvp_arena',
    name: 'PvP Arena',
    description: 'Balanced competitive arena',
    icon: Sword,
    category: 'pvp',
    defaultSize: { width: 192, height: 48, depth: 192 },
    terrainType: 'flat',
    biome: 'stone',
    features: ['symmetrical', 'spawn_balance', 'power_positions', 'line_of_sight']
  }
];

// Entity presets with 3D support
const ENTITY_PRESETS = [
  { id: 'player_spawn', name: 'Player Spawn', icon: User, category: 'spawn', color: '#22c55e' },
  { id: 'enemy_spawn', name: 'Enemy Spawn', icon: Sword, category: 'spawn', color: '#ef4444' },
  { id: 'item_health', name: 'Health Pack', icon: Plus, category: 'item', color: '#22c55e' },
  { id: 'item_ammo', name: 'Ammo', icon: Box, category: 'item', color: '#3b82f6' },
  { id: 'item_weapon', name: 'Weapon', icon: Crosshair, category: 'item', color: '#f59e0b' },
  { id: 'prop_tree', name: 'Tree', icon: TreePine, category: 'prop', color: '#16a34a' },
  { id: 'prop_rock', name: 'Rock', icon: Mountain, category: 'prop', color: '#78716c' },
  { id: 'prop_building', name: 'Building', icon: Home, category: 'prop', color: '#94a3b8' },
  { id: 'prop_crate', name: 'Crate', icon: Box, category: 'prop', color: '#a16207' },
  { id: 'npc_friendly', name: 'Friendly NPC', icon: User, category: 'npc', color: '#06b6d4' },
  { id: 'npc_enemy', name: 'Enemy NPC', icon: Sword, category: 'npc', color: '#dc2626' },
  { id: 'trigger_zone', name: 'Trigger Zone', icon: Square, category: 'logic', color: '#a855f7' },
  { id: 'waypoint', name: 'Waypoint', icon: Target, category: 'logic', color: '#eab308' },
  { id: 'camera_point', name: 'Camera Point', icon: Camera, category: 'logic', color: '#6366f1' },
];

// Tool modes
type ToolMode = 'select' | 'move' | 'rotate' | 'scale' | 'place' | 'terrain' | 'erase';
type ViewMode = 'editor' | 'play' | 'debug';

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 3D Viewport Component
function Viewport3D({ 
  mapData, 
  selectedEntity,
  onEntitySelect,
  onEntityMove,
  viewMode,
  onExitPlayMode,
  assets,
  debugInfo,
  onDebugUpdate,
  onContextMenu,
  toolMode,
  placingEntity,
  onPlaceEntity
}: {
  mapData: MapData;
  selectedEntity: string | null;
  onEntitySelect: (id: string | null) => void;
  onEntityMove: (id: string, position: Point3D) => void;
  viewMode: ViewMode;
  onExitPlayMode: () => void;
  assets: Array<{ id: string; filename: string; url: string }>;
  debugInfo: any;
  onDebugUpdate: (info: any) => void;
  onContextMenu: (entityId: string | null, position: { x: number; y: number }) => void;
  toolMode: ToolMode;
  placingEntity: { type: string; modelUrl?: string; rotation: number } | null;
  onPlaceEntity: (position: Point3D) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const entitiesRef = useRef<Record<string, THREE.Object3D>>({});
  const clockRef = useRef(new THREE.Clock());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const viewModeRef = useRef<ViewMode>(viewMode);
  const mapDataRef = useRef(mapData);
  const [webglError, setWebglError] = useState<string | null>(null);
  const playControllerRef = useRef<PlayModeController | null>(null);
  
  // Ghost preview for placement mode
  const ghostPreviewRef = useRef<THREE.Object3D | null>(null);
  const ghostPositionRef = useRef<Point3D>({ x: 0, y: 0, z: 0 });
  const placingEntityRef = useRef(placingEntity);
  const onPlaceEntityRef = useRef(onPlaceEntity);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  
  // Keep refs updated
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { placingEntityRef.current = placingEntity; }, [placingEntity]);
  useEffect(() => { onPlaceEntityRef.current = onPlaceEntity; }, [onPlaceEntity]);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError('WebGL is not supported in this browser');
        return;
      }
    } catch {
      setWebglError('WebGL is not available');
      return;
    }
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 100, 500);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(mapData.width / 4, mapData.height / 2, mapData.depth / 4);
    camera.lookAt(mapData.width / 2, 0, mapData.depth / 2);
    cameraRef.current = camera;
    
    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      setWebglError('Failed to create WebGL renderer');
      return;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(mapData.width / 2, 0, mapData.depth / 2);
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(
      new THREE.Color(mapData.lighting.ambientColor),
      mapData.lighting.ambientIntensity
    );
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(
      new THREE.Color(mapData.lighting.sunColor),
      mapData.lighting.sunIntensity
    );
    sunLight.position.set(
      mapData.lighting.sunPosition.x,
      mapData.lighting.sunPosition.y,
      mapData.lighting.sunPosition.z
    );
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(
      Math.max(mapData.width, mapData.depth),
      Math.max(mapData.width, mapData.depth) / mapData.gridSize,
      0x444444,
      0x333333
    );
    gridHelper.position.set(mapData.width / 2, 0, mapData.depth / 2);
    scene.add(gridHelper);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(mapData.width, mapData.depth);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: getBiomeGroundColor(mapData.terrain.biome),
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(mapData.width / 2, 0, mapData.depth / 2);
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    
    // Initialize play mode controller
    playControllerRef.current = new PlayModeController(scene, camera, renderer);
    
    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const delta = clockRef.current.getDelta();
      const currentViewMode = viewModeRef.current;
      const currentMapData = mapDataRef.current;
      
      if (currentViewMode === 'play' || currentViewMode === 'debug') {
        // Update play mode controller
        if (playControllerRef.current?.isPlaying()) {
          playControllerRef.current.update(delta);
        }
      } else {
        // Editor mode - use orbit controls
        controls.update();
      }
      
      // Debug info always updated
      if (currentViewMode === 'debug') {
        onDebugUpdate({
          fps: Math.round(1 / delta),
          entities: currentMapData.entities.length,
          camera: {
            x: camera.position.x.toFixed(1),
            y: camera.position.y.toFixed(1),
            z: camera.position.z.toFixed(1)
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);
    
    // Create invisible ground plane for raycasting during placement
    const raycastPlaneGeometry = new THREE.PlaneGeometry(mapData.width * 2, mapData.depth * 2);
    const raycastPlaneMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const raycastPlane = new THREE.Mesh(raycastPlaneGeometry, raycastPlaneMaterial);
    raycastPlane.rotation.x = -Math.PI / 2;
    raycastPlane.position.set(mapData.width / 2, 0, mapData.depth / 2);
    scene.add(raycastPlane);
    groundPlaneRef.current = raycastPlane;
    
    // Handle mouse move for placement preview
    const handleMouseMove = (event: MouseEvent) => {
      if (viewModeRef.current === 'play') return;
      if (!placingEntityRef.current) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      // Raycast against ground plane
      if (groundPlaneRef.current) {
        const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          // Snap to grid
          const gridSize = mapDataRef.current.gridSize;
          const snappedX = Math.round(point.x / gridSize) * gridSize;
          const snappedZ = Math.round(point.z / gridSize) * gridSize;
          ghostPositionRef.current = { x: snappedX, y: 0, z: snappedZ };
          
          // Update ghost preview position
          if (ghostPreviewRef.current) {
            ghostPreviewRef.current.position.set(snappedX, 0, snappedZ);
          }
        }
      }
    };
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    
    // Handle click for selection or placement
    const handleClick = (event: MouseEvent) => {
      if (viewModeRef.current === 'play') return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      // If in placement mode, place the entity
      if (placingEntityRef.current) {
        // Raycast against ground plane
        if (groundPlaneRef.current) {
          const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);
          if (intersects.length > 0) {
            const point = intersects[0].point;
            // Snap to grid
            const gridSize = mapDataRef.current.gridSize;
            const snappedX = Math.round(point.x / gridSize) * gridSize;
            const snappedZ = Math.round(point.z / gridSize) * gridSize;
            onPlaceEntityRef.current({ x: snappedX, y: 0, z: snappedZ });
          }
        }
        return;
      }
      
      // Normal selection mode
      const entityObjects = Object.values(entitiesRef.current);
      const intersects = raycasterRef.current.intersectObjects(entityObjects, true);
      
      if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.userData.entityId) {
          object = object.parent;
        }
        if (object.userData.entityId) {
          onEntitySelect(object.userData.entityId);
        }
      } else {
        onEntitySelect(null);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);
    
    // Handle right-click for context menu
    const handleContextMenu = (event: MouseEvent) => {
      if (viewModeRef.current === 'play') return;
      event.preventDefault();
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      const entityObjects = Object.values(entitiesRef.current);
      const intersects = raycasterRef.current.intersectObjects(entityObjects, true);
      
      let entityId: string | null = null;
      if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.userData.entityId) {
          object = object.parent;
        }
        if (object.userData.entityId) {
          entityId = object.userData.entityId;
        }
      }
      
      onContextMenu(entityId, { x: event.clientX, y: event.clientY });
    };
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      
      // Cleanup raycast plane
      if (groundPlaneRef.current) {
        scene.remove(groundPlaneRef.current);
        groundPlaneRef.current.geometry?.dispose();
        (groundPlaneRef.current.material as THREE.Material)?.dispose();
        groundPlaneRef.current = null;
      }
      
      // Cleanup ghost preview
      if (ghostPreviewRef.current) {
        scene.remove(ghostPreviewRef.current);
        ghostPreviewRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        ghostPreviewRef.current = null;
      }
      
      // Cleanup entities
      Object.values(entitiesRef.current).forEach((obj) => {
        scene.remove(obj);
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      });
      entitiesRef.current = {};
      
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mapData.width, mapData.height, mapData.depth, mapData.gridSize]);
  
  // Update entities
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    const loader = new GLTFLoader();
    
    // Remove old entities
    const currentIds = new Set(mapData.entities.map(e => e.id));
    Object.entries(entitiesRef.current).forEach(([id, obj]) => {
      if (!currentIds.has(id)) {
        scene.remove(obj);
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(m => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        delete entitiesRef.current[id];
      }
    });
    
    // Add/update entities
    mapData.entities.forEach((entity) => {
      let obj = entitiesRef.current[entity.id];
      
      if (!obj) {
        // Create new entity representation
        const preset = ENTITY_PRESETS.find(p => p.id === entity.type);
        const color = preset?.color || '#888888';
        
        if (entity.modelUrl) {
          // Load 3D model
          loader.load(entity.modelUrl, (gltf) => {
            const model = gltf.scene;
            model.userData.entityId = entity.id;
            model.userData.isCollider = true;
            model.position.set(entity.position.x, entity.position.y, entity.position.z);
            model.rotation.set(
              THREE.MathUtils.degToRad(entity.rotation.x),
              THREE.MathUtils.degToRad(entity.rotation.y),
              THREE.MathUtils.degToRad(entity.rotation.z)
            );
            model.scale.set(entity.scale.x, entity.scale.y, entity.scale.z);
            
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData.isCollider = true;
              }
            });
            
            scene.add(model);
            entitiesRef.current[entity.id] = model;
          });
        } else {
          // Create placeholder geometry
          const geometry = getEntityGeometry(entity.type);
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: 0.5,
            metalness: 0.2
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData.entityId = entity.id;
          mesh.userData.isCollider = true;
          mesh.position.set(entity.position.x, entity.position.y, entity.position.z);
          mesh.rotation.set(
            THREE.MathUtils.degToRad(entity.rotation.x),
            THREE.MathUtils.degToRad(entity.rotation.y),
            THREE.MathUtils.degToRad(entity.rotation.z)
          );
          mesh.scale.set(entity.scale.x, entity.scale.y, entity.scale.z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          scene.add(mesh);
          entitiesRef.current[entity.id] = mesh;
          obj = mesh;
        }
      } else {
        // Update existing entity
        obj.position.set(entity.position.x, entity.position.y, entity.position.z);
        obj.rotation.set(
          THREE.MathUtils.degToRad(entity.rotation.x),
          THREE.MathUtils.degToRad(entity.rotation.y),
          THREE.MathUtils.degToRad(entity.rotation.z)
        );
        obj.scale.set(entity.scale.x, entity.scale.y, entity.scale.z);
      }
      
      // Highlight selected entity
      if (obj && selectedEntity === entity.id) {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material && 'emissive' in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xdc2626);
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
            }
          }
        });
      } else if (obj) {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material && 'emissive' in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
            }
          }
        });
      }
    });
  }, [mapData.entities, selectedEntity]);
  
  // Ghost preview for placement mode
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    // Remove existing ghost
    if (ghostPreviewRef.current) {
      scene.remove(ghostPreviewRef.current);
      ghostPreviewRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      ghostPreviewRef.current = null;
    }
    
    // Create new ghost if placing
    if (placingEntity) {
      const preset = ENTITY_PRESETS.find(p => p.id === placingEntity.type);
      const color = preset?.color || '#00ff00';
      
      if (placingEntity.modelUrl) {
        // Load model for ghost preview
        const loader = new GLTFLoader();
        loader.load(placingEntity.modelUrl, (gltf) => {
          const ghost = gltf.scene.clone();
          ghost.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              // Make it semi-transparent green
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5,
                wireframe: false
              });
            }
          });
          ghost.position.set(mapData.width / 2, 0, mapData.depth / 2);
          ghost.rotation.y = THREE.MathUtils.degToRad(placingEntity.rotation);
          scene.add(ghost);
          ghostPreviewRef.current = ghost;
        });
      } else {
        // Create geometry-based ghost
        const geometry = getEntityGeometry(placingEntity.type);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.5,
          wireframe: false
        });
        const ghost = new THREE.Mesh(geometry, material);
        ghost.position.set(mapData.width / 2, 0, mapData.depth / 2);
        ghost.rotation.y = THREE.MathUtils.degToRad(placingEntity.rotation);
        scene.add(ghost);
        ghostPreviewRef.current = ghost;
      }
    }
    
    return () => {
      if (ghostPreviewRef.current && scene) {
        scene.remove(ghostPreviewRef.current);
      }
    };
  }, [placingEntity, mapData.width, mapData.depth]);
  
  // Update ghost rotation when it changes
  useEffect(() => {
    if (ghostPreviewRef.current && placingEntity) {
      ghostPreviewRef.current.rotation.y = THREE.MathUtils.degToRad(placingEntity.rotation);
    }
  }, [placingEntity?.rotation]);
  
  // Handle play mode start/stop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    if (viewMode === 'play' || viewMode === 'debug') {
      // Find player spawn point
      const spawnEntity = mapData.entities.find(e => e.type === 'player_spawn');
      const spawnPosition = spawnEntity 
        ? new THREE.Vector3(spawnEntity.position.x, spawnEntity.position.y, spawnEntity.position.z)
        : new THREE.Vector3(mapData.width / 2, 0, mapData.depth / 2);
      
      // Disable orbit controls
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      // Start play mode controller
      if (playControllerRef.current) {
        playControllerRef.current.start(
          spawnPosition,
          () => {
            // On exit callback - switch back to editor mode
            if (controlsRef.current) {
              controlsRef.current.enabled = true;
            }
            onExitPlayMode();
          },
          onDebugUpdate
        );
      }
    } else {
      // Stop play mode controller
      if (playControllerRef.current?.isPlaying()) {
        playControllerRef.current.stop();
      }
      
      // Re-enable orbit controls
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
  }, [viewMode, mapData.entities, mapData.width, mapData.depth, onDebugUpdate]);
  
  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/90" data-testid="viewport-3d">
        <div className="text-center p-8 max-w-md">
          <Cuboid className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-white mb-2">3D Preview Unavailable</h3>
          <p className="text-muted-foreground mb-4">{webglError}</p>
          <div className="bg-card rounded-lg p-4 text-left text-sm">
            <p className="text-muted-foreground mb-2">Map Data Summary:</p>
            <div className="space-y-1 text-white">
              <div>Size: {mapData.width} x {mapData.depth}</div>
              <div>Entities: {mapData.entities.length}</div>
              <div>Game Type: {mapData.gameType}</div>
              <div>Biome: {mapData.terrain.biome}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return <div ref={containerRef} className="w-full h-full" data-testid="viewport-3d" />;
}

// Helper functions
function getBiomeGroundColor(biome: string): number {
  const colors: Record<string, number> = {
    grassland: 0x3d6b2e,
    forest: 0x2d5a1e,
    desert: 0xc2a645,
    snow: 0xe8e8e8,
    stone: 0x5a5a5a,
    dungeon: 0x2a2a2a,
    industrial: 0x4a4a4a,
    urban: 0x555555,
    tropical: 0x4a8b3d,
    fantasy: 0x3d5a8b,
    mixed: 0x4a6b4a
  };
  return colors[biome] || 0x3d6b2e;
}

function getEntityGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case 'player_spawn':
    case 'enemy_spawn':
      return new THREE.CylinderGeometry(1, 1, 3, 8);
    case 'prop_tree':
      return new THREE.ConeGeometry(2, 6, 8);
    case 'prop_rock':
      return new THREE.DodecahedronGeometry(2);
    case 'prop_building':
      return new THREE.BoxGeometry(8, 12, 8);
    case 'prop_crate':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'trigger_zone':
      return new THREE.BoxGeometry(4, 4, 4);
    case 'waypoint':
      return new THREE.SphereGeometry(0.5, 8, 8);
    case 'camera_point':
      return new THREE.ConeGeometry(0.5, 1, 4);
    default:
      return new THREE.BoxGeometry(2, 2, 2);
  }
}

// Map generation function
function generateMap(template: MapTemplate, seed: number): Partial<MapData> {
  const entities: Entity[] = [];
  const rng = seededRandom(seed);
  
  // Generate based on template type
  switch (template.id) {
    case 'arena':
      // Circular spawn points
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = template.defaultSize.width * 0.35;
        entities.push({
          id: generateId(),
          type: 'player_spawn',
          position: {
            x: template.defaultSize.width / 2 + Math.cos(angle) * radius,
            y: 0,
            z: template.defaultSize.depth / 2 + Math.sin(angle) * radius
          },
          rotation: { x: 0, y: -angle * 180 / Math.PI, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: {}
        });
      }
      // Center power-up
      entities.push({
        id: generateId(),
        type: 'item_weapon',
        position: { x: template.defaultSize.width / 2, y: 0, z: template.defaultSize.depth / 2 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        properties: {}
      });
      break;
      
    case 'moba':
      // Generate lanes and structures
      const lanePositions = [
        { x: 0.1, z: 0.1 }, { x: 0.5, z: 0.5 }, { x: 0.9, z: 0.9 }  // Top, mid, bot lanes
      ];
      lanePositions.forEach((pos, idx) => {
        for (let i = 0; i < 3; i++) {
          const t = (i + 1) / 4;
          entities.push({
            id: generateId(),
            type: 'prop_building',
            position: {
              x: pos.x * template.defaultSize.width * t + template.defaultSize.width * 0.1,
              y: 0,
              z: pos.z * template.defaultSize.depth * t + template.defaultSize.depth * 0.1
            },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            properties: { lane: idx, tower: i }
          });
        }
      });
      break;
      
    case 'forest':
    case 'survival':
      // Scatter trees and rocks
      for (let i = 0; i < 100; i++) {
        const x = rng() * template.defaultSize.width;
        const z = rng() * template.defaultSize.depth;
        entities.push({
          id: generateId(),
          type: rng() > 0.3 ? 'prop_tree' : 'prop_rock',
          position: { x, y: 0, z },
          rotation: { x: 0, y: rng() * 360, z: 0 },
          scale: { x: 0.8 + rng() * 0.4, y: 0.8 + rng() * 0.4, z: 0.8 + rng() * 0.4 },
          properties: {}
        });
      }
      // Add spawn points
      for (let i = 0; i < 4; i++) {
        entities.push({
          id: generateId(),
          type: 'player_spawn',
          position: {
            x: 50 + rng() * 100,
            y: 0,
            z: 50 + rng() * 100
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: {}
        });
      }
      break;
      
    case 'fps':
    case 'tps':
      // Create cover and weapon spawns
      const gridCount = 5;
      for (let gx = 0; gx < gridCount; gx++) {
        for (let gz = 0; gz < gridCount; gz++) {
          if (rng() > 0.6) {
            entities.push({
              id: generateId(),
              type: 'prop_crate',
              position: {
                x: (gx + 0.5) * template.defaultSize.width / gridCount,
                y: 0,
                z: (gz + 0.5) * template.defaultSize.depth / gridCount
              },
              rotation: { x: 0, y: rng() * 90, z: 0 },
              scale: { x: 1 + rng(), y: 1 + rng(), z: 1 + rng() },
              properties: {}
            });
          }
        }
      }
      // Spawn points at corners
      [
        { x: 0.1, z: 0.1 }, { x: 0.9, z: 0.1 },
        { x: 0.1, z: 0.9 }, { x: 0.9, z: 0.9 }
      ].forEach(pos => {
        entities.push({
          id: generateId(),
          type: 'player_spawn',
          position: {
            x: pos.x * template.defaultSize.width,
            y: 0,
            z: pos.z * template.defaultSize.depth
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: {}
        });
      });
      break;
      
    case 'town':
    case 'rpg_dungeon':
      // Generate buildings in a grid
      const buildingGrid = 4;
      for (let bx = 0; bx < buildingGrid; bx++) {
        for (let bz = 0; bz < buildingGrid; bz++) {
          if (rng() > 0.3) {
            entities.push({
              id: generateId(),
              type: 'prop_building',
              position: {
                x: (bx + 0.5) * template.defaultSize.width / buildingGrid,
                y: 0,
                z: (bz + 0.5) * template.defaultSize.depth / buildingGrid
              },
              rotation: { x: 0, y: Math.floor(rng() * 4) * 90, z: 0 },
              scale: { x: 1 + rng() * 0.5, y: 1 + rng() * 1.5, z: 1 + rng() * 0.5 },
              properties: {}
            });
          }
        }
      }
      // NPCs
      for (let i = 0; i < 5; i++) {
        entities.push({
          id: generateId(),
          type: 'npc_friendly',
          position: {
            x: rng() * template.defaultSize.width,
            y: 0,
            z: rng() * template.defaultSize.depth
          },
          rotation: { x: 0, y: rng() * 360, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: {}
        });
      }
      break;
      
    case 'race_track':
      // Create waypoints along a track
      const trackPoints = 12;
      for (let i = 0; i < trackPoints; i++) {
        const angle = (i / trackPoints) * Math.PI * 2;
        const radiusX = template.defaultSize.width * 0.35;
        const radiusZ = template.defaultSize.depth * 0.35;
        entities.push({
          id: generateId(),
          type: 'waypoint',
          position: {
            x: template.defaultSize.width / 2 + Math.cos(angle) * radiusX,
            y: 0,
            z: template.defaultSize.depth / 2 + Math.sin(angle) * radiusZ
          },
          rotation: { x: 0, y: -angle * 180 / Math.PI + 90, z: 0 },
          scale: { x: 5, y: 1, z: 20 },
          properties: { checkpoint: i }
        });
      }
      break;
      
    default:
      // Default: just spawn points
      for (let i = 0; i < 4; i++) {
        entities.push({
          id: generateId(),
          type: 'player_spawn',
          position: {
            x: template.defaultSize.width * (0.2 + (i % 2) * 0.6),
            y: 0,
            z: template.defaultSize.depth * (0.2 + Math.floor(i / 2) * 0.6)
          },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          properties: {}
        });
      }
  }
  
  return {
    width: template.defaultSize.width,
    height: template.defaultSize.height,
    depth: template.defaultSize.depth,
    terrain: {
      type: template.terrainType,
      biome: template.biome,
      seed
    },
    gameType: template.id,
    entities
  };
}

// Seeded random number generator
function seededRandom(seed: number) {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Main Map Editor Component
export default function MapEditor() {
  const { toast } = useToast();
  
  // Map state
  const [mapData, setMapData] = useState<MapData>({
    name: 'Untitled Map',
    width: 256,
    height: 64,
    depth: 256,
    gridSize: 8,
    segments: [],
    sectors: [],
    entities: [],
    spawnPoints: [{ x: 128, y: 0, z: 128 }],
    terrain: {
      type: 'flat',
      biome: 'grassland',
      seed: Date.now()
    },
    lighting: {
      ambientColor: '#404060',
      ambientIntensity: 0.4,
      sunColor: '#fffaf0',
      sunIntensity: 1.0,
      sunPosition: { x: 100, y: 200, z: 100 }
    },
    gameType: 'arena',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  // Editor state
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState('player_spawn');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Clipboard and undo/redo state
  const [clipboard, setClipboard] = useState<Entity | null>(null);
  const [undoHistory, setUndoHistory] = useState<MapData[]>([]);
  const [redoHistory, setRedoHistory] = useState<MapData[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuEntity, setContextMenuEntity] = useState<string | null>(null);
  const MAX_HISTORY = 50;
  
  // Placement mode state - entity follows mouse until placed
  const [placingEntity, setPlacingEntity] = useState<{
    type: string;
    modelUrl?: string;
    rotation: number; // Y-axis rotation in degrees
  } | null>(null);
  
  // Fetch assets from storage
  const { data: storageAssets } = useQuery<{ items: Array<{ name: string; path: string; fullPath: string; type: string; extension?: string }> }>({
    queryKey: ["/api/admin/storage", "game-assets"]
  });
  
  // Filter 3D models from storage
  const modelAssets = storageAssets?.items?.filter(item => 
    item.type === 'file' && ['glb', 'gltf'].includes(item.extension?.toLowerCase() || '')
  ).map(item => ({
    id: item.path,
    filename: item.name,
    url: `/api/admin/storage/download?path=${encodeURIComponent(item.fullPath)}`
  })) || [];
  
  // Selected entity data
  const selectedEntityData = mapData.entities.find(e => e.id === selectedEntity);
  
  // Generate map from template
  const handleGenerateMap = async (template: MapTemplate) => {
    setIsGenerating(true);
    
    await new Promise(r => setTimeout(r, 500)); // Simulate generation time
    
    const generatedData = generateMap(template, Date.now());
    
    setMapData(prev => ({
      ...prev,
      ...generatedData,
      name: `${template.name} Map`,
      updatedAt: new Date().toISOString()
    }));
    
    setShowTemplateDialog(false);
    setIsGenerating(false);
    toast({ title: "Map Generated", description: `Created ${template.name} with ${generatedData.entities?.length || 0} entities` });
  };
  
  // Start placing entity - attaches to mouse cursor
  const startPlacingEntity = (type: string, modelUrl?: string) => {
    setPlacingEntity({
      type,
      modelUrl,
      rotation: 0
    });
    setSelectedEntity(null);
    setToolMode('place');
    toast({ 
      title: "Placing Entity", 
      description: "Left-click to place, R to rotate, Esc to cancel" 
    });
  };
  
  // Rotate placing entity
  const rotatePlacingEntity = () => {
    if (!placingEntity) return;
    setPlacingEntity(prev => prev ? {
      ...prev,
      rotation: (prev.rotation + 45) % 360
    } : null);
  };
  
  // Cancel placement
  const cancelPlacement = () => {
    setPlacingEntity(null);
    setToolMode('select');
  };
  
  // Finalize placement at position
  const placeEntityAt = (position: Point3D) => {
    if (!placingEntity) return;
    
    // Save to undo history inline to avoid circular deps
    setUndoHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(mapData))];
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY);
      }
      return newHistory;
    });
    setRedoHistory([]);
    
    const newEntity: Entity = {
      id: generateId(),
      type: placingEntity.type,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: 0, y: placingEntity.rotation, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      properties: {},
      modelUrl: placingEntity.modelUrl
    };
    
    setMapData(prev => ({
      ...prev,
      entities: [...prev.entities, newEntity],
      updatedAt: new Date().toISOString()
    }));
    
    setSelectedEntity(newEntity.id);
    toast({ title: "Entity Placed", description: `${placingEntity.type} at (${position.x.toFixed(0)}, ${position.z.toFixed(0)})` });
    
    // Keep in placement mode for multiple placements
    // User can press Esc to exit
  };
  
  // Legacy add entity function (for direct add without placement mode)
  const addEntity = (type: string, position?: Point3D, modelUrl?: string) => {
    // Start placement mode instead of direct add
    startPlacingEntity(type, modelUrl);
  };
  
  // Update entity position
  const handleEntityMove = (id: string, position: Point3D) => {
    setMapData(prev => ({
      ...prev,
      entities: prev.entities.map(e => 
        e.id === id ? { ...e, position } : e
      ),
      updatedAt: new Date().toISOString()
    }));
  };
  
  // Delete selected entity
  const deleteSelectedEntity = () => {
    if (!selectedEntity) return;
    setMapData(prev => ({
      ...prev,
      entities: prev.entities.filter(e => e.id !== selectedEntity),
      updatedAt: new Date().toISOString()
    }));
    setSelectedEntity(null);
    toast({ title: "Entity Deleted" });
  };
  
  // Save map
  const saveMap = () => {
    const data = JSON.stringify(mapData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapData.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Map Saved", description: `Saved as ${mapData.name}.json` });
  };
  
  // Load map
  const loadMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setMapData(data);
        toast({ title: "Map Loaded", description: data.name });
      } catch {
        toast({ title: "Load Failed", description: "Invalid map file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };
  
  // Clear map
  const clearMap = () => {
    saveToHistory();
    setMapData(prev => ({
      ...prev,
      entities: [],
      segments: [],
      sectors: [],
      updatedAt: new Date().toISOString()
    }));
    setSelectedEntity(null);
    toast({ title: "Map Cleared" });
  };
  
  // Save current state to undo history
  const saveToHistory = useCallback(() => {
    setUndoHistory(prev => {
      const newHistory = [...prev, JSON.parse(JSON.stringify(mapData))];
      return newHistory.slice(-MAX_HISTORY);
    });
    setRedoHistory([]);
  }, [mapData]);
  
  // Undo action
  const undo = useCallback(() => {
    if (undoHistory.length === 0) return;
    const previousState = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [...prev, JSON.parse(JSON.stringify(mapData))]);
    setUndoHistory(prev => prev.slice(0, -1));
    setMapData(previousState);
    setSelectedEntity(null);
    toast({ title: "Undo", description: "Reverted last action" });
  }, [undoHistory, mapData, toast]);
  
  // Redo action
  const redo = useCallback(() => {
    if (redoHistory.length === 0) return;
    const nextState = redoHistory[redoHistory.length - 1];
    setUndoHistory(prev => [...prev, JSON.parse(JSON.stringify(mapData))]);
    setRedoHistory(prev => prev.slice(0, -1));
    setMapData(nextState);
    setSelectedEntity(null);
    toast({ title: "Redo", description: "Restored action" });
  }, [redoHistory, mapData, toast]);
  
  // Copy selected entity
  const copyEntity = useCallback(() => {
    if (!selectedEntity) return;
    const entity = mapData.entities.find(e => e.id === selectedEntity);
    if (entity) {
      setClipboard(JSON.parse(JSON.stringify(entity)));
      toast({ title: "Copied", description: entity.type });
    }
  }, [selectedEntity, mapData.entities, toast]);
  
  // Paste entity from clipboard
  const pasteEntity = useCallback(() => {
    if (!clipboard) return;
    saveToHistory();
    const newEntity: Entity = {
      ...JSON.parse(JSON.stringify(clipboard)),
      id: generateId(),
      position: {
        x: clipboard.position.x + 5,
        y: clipboard.position.y,
        z: clipboard.position.z + 5
      }
    };
    setMapData(prev => ({
      ...prev,
      entities: [...prev.entities, newEntity],
      updatedAt: new Date().toISOString()
    }));
    setSelectedEntity(newEntity.id);
    toast({ title: "Pasted", description: newEntity.type });
  }, [clipboard, saveToHistory, toast]);
  
  // Duplicate selected entity
  const duplicateEntity = useCallback(() => {
    if (!selectedEntity) return;
    const entity = mapData.entities.find(e => e.id === selectedEntity);
    if (!entity) return;
    saveToHistory();
    const newEntity: Entity = {
      ...JSON.parse(JSON.stringify(entity)),
      id: generateId(),
      position: {
        x: entity.position.x + 5,
        y: entity.position.y,
        z: entity.position.z + 5
      }
    };
    setMapData(prev => ({
      ...prev,
      entities: [...prev.entities, newEntity],
      updatedAt: new Date().toISOString()
    }));
    setSelectedEntity(newEntity.id);
    toast({ title: "Duplicated", description: entity.type });
  }, [selectedEntity, mapData.entities, saveToHistory, toast]);
  
  // Select all entities
  const selectAll = useCallback(() => {
    if (mapData.entities.length > 0) {
      setSelectedEntity(mapData.entities[0].id);
      toast({ title: "Selected", description: `${mapData.entities.length} entities` });
    }
  }, [mapData.entities, toast]);
  
  // Delete entity by ID
  const deleteEntity = useCallback((entityId: string) => {
    saveToHistory();
    setMapData(prev => ({
      ...prev,
      entities: prev.entities.filter(e => e.id !== entityId),
      updatedAt: new Date().toISOString()
    }));
    if (selectedEntity === entityId) {
      setSelectedEntity(null);
    }
    toast({ title: "Entity Deleted" });
  }, [saveToHistory, selectedEntity, toast]);
  
  // Handle context menu for entity
  const handleContextMenu = useCallback((entityId: string | null, position: { x: number; y: number }) => {
    setContextMenuEntity(entityId);
    setContextMenuPosition(position);
    if (entityId) {
      setSelectedEntity(entityId);
    }
  }, []);
  
  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setContextMenuEntity(null);
  }, []);
  
  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      
      // Tool shortcuts (single keys)
      if (!ctrl && !e.shiftKey && !e.altKey) {
        switch (key) {
          case 'v': 
            if (!placingEntity) setToolMode('select'); 
            break;
          case 'g': 
            if (!placingEntity) setToolMode('move'); 
            break;
          case 'r': 
            // R rotates during placement mode, otherwise switches to rotate tool
            if (placingEntity) {
              e.preventDefault();
              rotatePlacingEntity();
            } else {
              setToolMode('rotate');
            }
            break;
          case 's': 
            if (!placingEntity) setToolMode('scale'); 
            break;
          case 'e': 
            if (!placingEntity) setToolMode('place'); 
            break;
          case 't': 
            if (!placingEntity) setToolMode('terrain'); 
            break;
          case 'x': 
            if (!placingEntity) setToolMode('erase'); 
            break;
          case 'escape':
            // Cancel placement mode first, then deselect
            if (placingEntity) {
              cancelPlacement();
            } else {
              setSelectedEntity(null);
              closeContextMenu();
              if (viewMode !== 'editor') setViewMode('editor');
            }
            break;
          case 'delete':
          case 'backspace':
            if (selectedEntity && !placingEntity) {
              e.preventDefault();
              deleteEntity(selectedEntity);
            }
            break;
        }
      }
      
      // Ctrl shortcuts
      if (ctrl) {
        switch (key) {
          case 'c':
            e.preventDefault();
            copyEntity();
            break;
          case 'v':
            e.preventDefault();
            pasteEntity();
            break;
          case 'd':
            e.preventDefault();
            duplicateEntity();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 's':
            e.preventDefault();
            saveMap();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntity, viewMode, copyEntity, pasteEntity, duplicateEntity, undo, redo, selectAll, deleteEntity, closeContextMenu, placingEntity, cancelPlacement, rotatePlacingEntity, saveMap]);
  
  return (
    <div className="h-screen flex flex-col bg-background" data-testid="page-map-editor">
      {/* Header */}
      <div className="border-b bg-card px-4 py-2 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          <Cuboid className="w-5 h-5 text-red-500" />
          <Input
            value={mapData.name}
            onChange={(e) => setMapData(prev => ({ ...prev, name: e.target.value }))}
            className="w-48 h-8 text-sm font-medium"
            data-testid="input-map-name"
          />
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button
            variant={viewMode === 'editor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('editor')}
            className="h-7"
            data-testid="button-mode-editor"
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant={viewMode === 'play' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('play')}
            className="h-7"
            data-testid="button-mode-play"
          >
            <Play className="w-3 h-3 mr-1" />
            Play
          </Button>
          <Button
            variant={viewMode === 'debug' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('debug')}
            className="h-7"
            data-testid="button-mode-debug"
          >
            <Bug className="w-3 h-3 mr-1" />
            Debug
          </Button>
        </div>
        
        <div className="flex-1" />
        
        {/* Actions */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-generate">
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Generate Map</DialogTitle>
              <DialogDescription>Choose a template to auto-generate a playable map</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-3 gap-3 p-1">
                {MAP_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    className="text-left w-full"
                    onClick={() => handleGenerateMap(template)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <Card className="cursor-pointer hover-elevate h-full">
                      <CardHeader className="p-3">
                        <div className="flex items-center gap-2">
                          <template.icon className="w-5 h-5 text-red-500" />
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{template.biome}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {isGenerating && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <Button variant="outline" size="sm" onClick={saveMap} data-testid="button-save">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        
        <label>
          <Button variant="outline" size="sm" asChild data-testid="button-load">
            <span>
              <FolderOpen className="w-4 h-4 mr-2" />
              Load
            </span>
          </Button>
          <input type="file" accept=".json" onChange={loadMap} className="hidden" />
        </label>
        
        <Button variant="outline" size="sm" onClick={clearMap} data-testid="button-clear">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Tools */}
        {viewMode === 'editor' && (
          <div className="w-14 border-r bg-card flex flex-col items-center py-2 gap-1">
            <Button
              variant={toolMode === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('select')}
              title="Select (V)"
              data-testid="button-tool-select"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button
              variant={toolMode === 'move' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('move')}
              title="Move (G)"
              data-testid="button-tool-move"
            >
              <Move className="w-4 h-4" />
            </Button>
            <Button
              variant={toolMode === 'rotate' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('rotate')}
              title="Rotate (R)"
              data-testid="button-tool-rotate"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant={toolMode === 'scale' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('scale')}
              title="Scale (S)"
              data-testid="button-tool-scale"
            >
              <Maximize className="w-4 h-4" />
            </Button>
            
            <Separator className="w-8 my-2" />
            
            <Button
              variant={toolMode === 'place' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('place')}
              title="Place Entity (E)"
              data-testid="button-tool-place"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant={toolMode === 'terrain' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('terrain')}
              title="Terrain (T)"
              data-testid="button-tool-terrain"
            >
              <Mountain className="w-4 h-4" />
            </Button>
            <Button
              variant={toolMode === 'erase' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setToolMode('erase')}
              title="Erase (X)"
              data-testid="button-tool-erase"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* 3D Viewport */}
        <div className="flex-1 relative overflow-hidden bg-black">
          <Viewport3D
            mapData={mapData}
            selectedEntity={selectedEntity}
            onEntitySelect={setSelectedEntity}
            onEntityMove={handleEntityMove}
            viewMode={viewMode}
            onExitPlayMode={() => setViewMode('editor')}
            assets={modelAssets}
            debugInfo={debugInfo}
            onDebugUpdate={setDebugInfo}
            onContextMenu={handleContextMenu}
            toolMode={toolMode}
            placingEntity={placingEntity}
            onPlaceEntity={placeEntityAt}
          />
          
          {/* Floating info */}
          <div className="absolute top-2 left-2 bg-black/80 rounded px-3 py-2 text-xs text-white space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{viewMode.toUpperCase()}</Badge>
              <span className="text-muted-foreground">|</span>
              <span>{mapData.gameType}</span>
            </div>
            <div className="text-muted-foreground">
              Entities: {mapData.entities.length} | Size: {mapData.width}x{mapData.depth}
            </div>
          </div>
          
          {/* Placement mode indicator */}
          {placingEntity && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-900/90 border border-green-500 rounded-lg px-4 py-3 flex items-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-green-400" />
                <div>
                  <div className="font-medium">Placing: {placingEntity.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-green-300">Rotation: {placingEntity.rotation}°</div>
                </div>
              </div>
              <div className="border-l border-green-600 pl-4 text-xs space-y-0.5">
                <div><span className="text-green-400">Click</span> to place</div>
                <div><span className="text-green-400">R</span> to rotate 45°</div>
                <div><span className="text-green-400">Esc</span> to cancel</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 border-green-500 text-green-400 hover:bg-green-900"
                onClick={cancelPlacement}
                data-testid="button-cancel-placement"
              >
                Cancel
              </Button>
            </div>
          )}
          
          {/* Debug overlay */}
          {viewMode === 'debug' && (
            <div className="absolute top-2 right-2 bg-black/90 rounded p-3 text-xs text-white font-mono w-64">
              <div className="text-red-500 font-bold mb-2">DEBUG INFO</div>
              <div>FPS: {debugInfo.fps || 0}</div>
              <div>Entities: {debugInfo.entities || 0}</div>
              {debugInfo.camera && (
                <div>Camera: ({debugInfo.camera.x}, {debugInfo.camera.y}, {debugInfo.camera.z})</div>
              )}
              <Separator className="my-2" />
              <div className="text-muted-foreground">Press ESC to exit play mode</div>
            </div>
          )}
          
          {/* Play mode UI */}
          {viewMode === 'play' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 rounded-lg px-4 py-2 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('editor')}
                data-testid="button-stop-play"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <span className="text-white text-sm">WASD to move | Mouse to look</span>
            </div>
          )}
          
          {/* Floating Context Menu */}
          {contextMenuPosition && (
            <div 
              className="fixed z-50 bg-card border rounded-md shadow-lg py-1 min-w-[180px]"
              style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
              onClick={closeContextMenu}
              data-testid="context-menu"
            >
              {contextMenuEntity ? (
                <>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { copyEntity(); closeContextMenu(); }}
                    data-testid="context-copy"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { duplicateEntity(); closeContextMenu(); }}
                    data-testid="context-duplicate"
                  >
                    <CopyPlus className="w-4 h-4" />
                    Duplicate
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
                  </button>
                  <div className="border-t my-1" />
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { setToolMode('move'); closeContextMenu(); }}
                    data-testid="context-move"
                  >
                    <Move className="w-4 h-4" />
                    Move
                    <span className="ml-auto text-xs text-muted-foreground">G</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { setToolMode('rotate'); closeContextMenu(); }}
                    data-testid="context-rotate"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Rotate
                    <span className="ml-auto text-xs text-muted-foreground">R</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { setToolMode('scale'); closeContextMenu(); }}
                    data-testid="context-scale"
                  >
                    <Maximize className="w-4 h-4" />
                    Scale
                    <span className="ml-auto text-xs text-muted-foreground">S</span>
                  </button>
                  <div className="border-t my-1" />
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-red-500"
                    onClick={() => { deleteEntity(contextMenuEntity); closeContextMenu(); }}
                    data-testid="context-delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                    <span className="ml-auto text-xs text-muted-foreground">Del</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { pasteEntity(); closeContextMenu(); }}
                    disabled={!clipboard}
                    data-testid="context-paste"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Paste
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
                  </button>
                  <div className="border-t my-1" />
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { undo(); closeContextMenu(); }}
                    disabled={undoHistory.length === 0}
                    data-testid="context-undo"
                  >
                    <Undo className="w-4 h-4" />
                    Undo
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+Z</span>
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => { redo(); closeContextMenu(); }}
                    disabled={redoHistory.length === 0}
                    data-testid="context-redo"
                  >
                    <Redo className="w-4 h-4" />
                    Redo
                    <span className="ml-auto text-xs text-muted-foreground">Ctrl+Y</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Right panel */}
        <div className="w-80 border-l bg-card overflow-hidden flex flex-col">
          <Tabs defaultValue="entities" className="flex-1 flex flex-col">
            <TabsList className="mx-2 mt-2 grid grid-cols-4">
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="properties">Props</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1">
              <TabsContent value="entities" className="p-3">
                <div className="space-y-3">
                  {Object.entries(
                    ENTITY_PRESETS.reduce((acc, e) => {
                      if (!acc[e.category]) acc[e.category] = [];
                      acc[e.category].push(e);
                      return acc;
                    }, {} as Record<string, typeof ENTITY_PRESETS>)
                  ).map(([category, entities]) => (
                    <div key={category}>
                      <Label className="text-xs uppercase text-muted-foreground">{category}</Label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {entities.map(entity => (
                          <Button
                            key={entity.id}
                            variant={selectedEntityType === entity.id ? 'default' : 'outline'}
                            size="sm"
                            className="h-auto py-2 flex flex-col gap-1"
                            onClick={() => {
                              setSelectedEntityType(entity.id);
                              addEntity(entity.id);
                            }}
                            data-testid={`button-entity-${entity.id}`}
                          >
                            <entity.icon className="w-4 h-4" style={{ color: entity.color }} />
                            <span className="text-[10px]">{entity.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="assets" className="p-3">
                <div className="space-y-2">
                  <Label className="text-xs">3D Models from Storage</Label>
                  {modelAssets.length > 0 ? (
                    modelAssets.map(model => (
                      <Button
                        key={model.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => addEntity('custom_model', undefined, model.url)}
                        data-testid={`button-asset-${model.id}`}
                      >
                        <Box className="w-3 h-3 mr-2 text-blue-500" />
                        <span className="truncate">{model.filename}</span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No 3D models in storage. Upload GLB/GLTF files to /game-assets
                    </p>
                  )}
                  
                  <Separator className="my-3" />
                  
                  <Link href="/admin-storage">
                    <Button variant="outline" size="sm" className="w-full" data-testid="link-storage">
                      <FolderOpen className="w-3 h-3 mr-2" />
                      Open Storage Manager
                    </Button>
                  </Link>
                </div>
              </TabsContent>
              
              <TabsContent value="properties" className="p-3 space-y-4">
                {selectedEntityData ? (
                  <>
                    <div>
                      <Label className="text-xs text-red-500">Selected: {selectedEntityData.type}</Label>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Position</Label>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <Input
                          type="number"
                          value={selectedEntityData.position.x.toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, position: { ...ent.position, x: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="X"
                        />
                        <Input
                          type="number"
                          value={selectedEntityData.position.y.toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, position: { ...ent.position, y: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Y"
                        />
                        <Input
                          type="number"
                          value={selectedEntityData.position.z.toFixed(1)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, position: { ...ent.position, z: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Z"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Rotation</Label>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <Input
                          type="number"
                          value={selectedEntityData.rotation.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, rotation: { ...ent.rotation, x: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="X"
                        />
                        <Input
                          type="number"
                          value={selectedEntityData.rotation.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, rotation: { ...ent.rotation, y: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Y"
                        />
                        <Input
                          type="number"
                          value={selectedEntityData.rotation.z}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, rotation: { ...ent.rotation, z: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Z"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Scale</Label>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedEntityData.scale.x}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, scale: { ...ent.scale, x: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="X"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedEntityData.scale.y}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, scale: { ...ent.scale, y: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Y"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedEntityData.scale.z}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 1;
                            setMapData(prev => ({
                              ...prev,
                              entities: prev.entities.map(ent =>
                                ent.id === selectedEntity
                                  ? { ...ent, scale: { ...ent.scale, z: val } }
                                  : ent
                              )
                            }));
                          }}
                          className="h-7 text-xs"
                          placeholder="Z"
                        />
                      </div>
                    </div>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={deleteSelectedEntity}
                      data-testid="button-delete-entity"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete Entity
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Select an entity to edit its properties
                  </p>
                )}
              </TabsContent>
              
              <TabsContent value="settings" className="p-3 space-y-4">
                <div>
                  <Label className="text-xs">Map Size</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Width</Label>
                      <Input
                        type="number"
                        value={mapData.width}
                        onChange={(e) => setMapData(prev => ({ ...prev, width: parseInt(e.target.value) || 256 }))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Height</Label>
                      <Input
                        type="number"
                        value={mapData.height}
                        onChange={(e) => setMapData(prev => ({ ...prev, height: parseInt(e.target.value) || 64 }))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Depth</Label>
                      <Input
                        type="number"
                        value={mapData.depth}
                        onChange={(e) => setMapData(prev => ({ ...prev, depth: parseInt(e.target.value) || 256 }))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs">Grid Size: {mapData.gridSize}</Label>
                  <Slider
                    value={[mapData.gridSize]}
                    onValueChange={([v]) => setMapData(prev => ({ ...prev, gridSize: v }))}
                    min={4}
                    max={64}
                    step={4}
                    className="mt-2"
                  />
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-xs">Terrain Biome</Label>
                  <Select
                    value={mapData.terrain.biome}
                    onValueChange={(v) => setMapData(prev => ({
                      ...prev,
                      terrain: { ...prev.terrain, biome: v }
                    }))}
                  >
                    <SelectTrigger className="h-8 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grassland">Grassland</SelectItem>
                      <SelectItem value="forest">Forest</SelectItem>
                      <SelectItem value="desert">Desert</SelectItem>
                      <SelectItem value="snow">Snow</SelectItem>
                      <SelectItem value="stone">Stone</SelectItem>
                      <SelectItem value="dungeon">Dungeon</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="tropical">Tropical</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-xs">Lighting</Label>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Ambient Intensity</Label>
                      <Slider
                        value={[mapData.lighting.ambientIntensity * 100]}
                        onValueChange={([v]) => setMapData(prev => ({
                          ...prev,
                          lighting: { ...prev.lighting, ambientIntensity: v / 100 }
                        }))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Sun Intensity</Label>
                      <Slider
                        value={[mapData.lighting.sunIntensity * 100]}
                        onValueChange={([v]) => setMapData(prev => ({
                          ...prev,
                          lighting: { ...prev.lighting, sunIntensity: v / 100 }
                        }))}
                        min={0}
                        max={200}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
            
            {/* Keyboard shortcuts */}
            <div className="border-t p-2">
              <Label className="text-xs text-muted-foreground">Shortcuts</Label>
              <div className="text-[10px] text-muted-foreground mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span>V - Select</span>
                <span>G - Move</span>
                <span>R - Rotate{placingEntity ? ' 45°' : ''}</span>
                <span>S - Scale</span>
                <span>E - Place</span>
                <span>X - Erase</span>
                <span>Del - Delete</span>
                <span>Esc - {placingEntity ? 'Cancel' : 'Deselect'}</span>
                <span>Ctrl+C - Copy</span>
                <span>Ctrl+V - Paste</span>
                <span>Ctrl+D - Duplicate</span>
                <span>Ctrl+Z - Undo</span>
                <span>Ctrl+Y - Redo</span>
                <span>Ctrl+S - Save</span>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
