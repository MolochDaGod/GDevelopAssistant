import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  Move, 
  RotateCw, 
  Maximize2, 
  Grid3X3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Box,
  Users,
  Building2,
  TreePine,
  Mountain,
  Crosshair,
  Save,
  Undo,
  ChevronDown
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

interface SceneUnit {
  id: string;
  name: string;
  type: "unit" | "building" | "prop";
  mesh: THREE.Mesh | THREE.Group;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  stats?: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
  };
  team: "player" | "enemy" | "neutral";
}

interface UnitTemplate {
  id: string;
  name: string;
  type: "unit" | "building" | "prop";
  color: string;
  geometry: "box" | "sphere" | "cylinder" | "cone";
  scale: [number, number, number];
  stats?: {
    health: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

const UNIT_TEMPLATES: UnitTemplate[] = [
  { id: "warrior", name: "Warrior", type: "unit", color: "#3b82f6", geometry: "box", scale: [1, 2, 1], stats: { health: 100, attack: 15, defense: 10, speed: 5 } },
  { id: "archer", name: "Archer", type: "unit", color: "#22c55e", geometry: "cone", scale: [0.8, 2, 0.8], stats: { health: 60, attack: 20, defense: 5, speed: 7 } },
  { id: "mage", name: "Mage", type: "unit", color: "#a855f7", geometry: "sphere", scale: [1, 1.5, 1], stats: { health: 50, attack: 30, defense: 3, speed: 4 } },
  { id: "knight", name: "Knight", type: "unit", color: "#eab308", geometry: "box", scale: [1.2, 2.2, 1.2], stats: { health: 150, attack: 12, defense: 20, speed: 3 } },
  { id: "tower", name: "Tower", type: "building", color: "#71717a", geometry: "cylinder", scale: [2, 5, 2], stats: { health: 500, attack: 25, defense: 30, speed: 0 } },
  { id: "barracks", name: "Barracks", type: "building", color: "#b45309", geometry: "box", scale: [4, 3, 4], stats: { health: 400, attack: 0, defense: 25, speed: 0 } },
  { id: "tree", name: "Tree", type: "prop", color: "#166534", geometry: "cone", scale: [1.5, 4, 1.5] },
  { id: "rock", name: "Rock", type: "prop", color: "#52525b", geometry: "sphere", scale: [2, 1.5, 2] },
];

type TransformMode = "translate" | "rotate" | "scale";

export function RTSSceneEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  const [units, setUnits] = useState<SceneUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<SceneUnit | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [showGrid, setShowGrid] = useState(true);
  const [showHelpers, setShowHelpers] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UnitTemplate | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const selectableObjectsRef = useRef<THREE.Object3D[]>([]);

  const [webglError, setWebglError] = useState<string | null>(null);

  const initScene = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(
        60,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(30, 30, 30);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      });
      
      if (!renderer.getContext()) {
        setWebglError("WebGL context could not be created. Please ensure your browser supports WebGL.");
        return;
      }
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2.1;
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = 100;
    orbitControlsRef.current = orbitControls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener("dragging-changed", (event) => {
      orbitControls.enabled = !event.value;
    });
    transformControls.addEventListener("objectChange", () => {
      if (selectedUnit && transformControls.object) {
        setUnits(prev => prev.map(u => 
          u.id === selectedUnit.id 
            ? { ...u, position: transformControls.object!.position.clone(), rotation: transformControls.object!.rotation.clone(), scale: transformControls.object!.scale.clone() }
            : u
        ));
      }
    });
    scene.add(transformControls as unknown as THREE.Object3D);
    transformControlsRef.current = transformControls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x333333);
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d4a3e,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "ground";
    scene.add(ground);
    groundPlaneRef.current = ground;

    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
    } catch (error) {
      console.error("Failed to initialize WebGL scene:", error);
      setWebglError("Failed to initialize 3D scene. Your browser may not support WebGL.");
      return undefined;
    }
  }, [selectedUnit]);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showHelpers;
    }
  }, [showHelpers]);

  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
    }
  }, [transformMode]);

  const createUnitMesh = useCallback((template: UnitTemplate, position: THREE.Vector3): THREE.Mesh => {
    let geometry: THREE.BufferGeometry;
    
    switch (template.geometry) {
      case "sphere":
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case "cylinder":
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
        break;
      case "cone":
        geometry = new THREE.ConeGeometry(0.5, 1, 16);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: template.color,
      roughness: 0.5,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = template.scale[1] / 2;
    mesh.scale.set(...template.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    if (placementMode && selectedTemplate && groundPlaneRef.current) {
      const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const mesh = createUnitMesh(selectedTemplate, point);
        
        const newUnit: SceneUnit = {
          id: `unit_${Date.now()}`,
          name: selectedTemplate.name,
          type: selectedTemplate.type,
          mesh,
          position: mesh.position.clone(),
          rotation: mesh.rotation.clone(),
          scale: mesh.scale.clone(),
          stats: selectedTemplate.stats,
          team: "player",
        };

        sceneRef.current.add(mesh);
        selectableObjectsRef.current.push(mesh);
        setUnits(prev => [...prev, newUnit]);
        setPlacementMode(false);
        setSelectedTemplate(null);
      }
    } else {
      const intersects = raycasterRef.current.intersectObjects(selectableObjectsRef.current, true);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const unit = units.find(u => u.mesh === clickedObject || u.mesh.children.includes(clickedObject));
        
        if (unit) {
          setSelectedUnit(unit);
          if (transformControlsRef.current) {
            transformControlsRef.current.attach(unit.mesh);
          }
        }
      } else {
        setSelectedUnit(null);
        if (transformControlsRef.current) {
          transformControlsRef.current.detach();
        }
      }
    }
  }, [placementMode, selectedTemplate, units, createUnitMesh]);

  const deleteSelectedUnit = useCallback(() => {
    if (!selectedUnit || !sceneRef.current) return;
    
    sceneRef.current.remove(selectedUnit.mesh);
    selectableObjectsRef.current = selectableObjectsRef.current.filter(obj => obj !== selectedUnit.mesh);
    setUnits(prev => prev.filter(u => u.id !== selectedUnit.id));
    setSelectedUnit(null);
    
    if (transformControlsRef.current) {
      transformControlsRef.current.detach();
    }
  }, [selectedUnit]);

  const duplicateSelectedUnit = useCallback(() => {
    if (!selectedUnit || !sceneRef.current) return;

    const template = UNIT_TEMPLATES.find(t => t.name === selectedUnit.name);
    if (!template) return;

    const newPosition = selectedUnit.position.clone();
    newPosition.x += 3;

    const mesh = createUnitMesh(template, newPosition);
    
    const newUnit: SceneUnit = {
      id: `unit_${Date.now()}`,
      name: selectedUnit.name,
      type: selectedUnit.type,
      mesh,
      position: mesh.position.clone(),
      rotation: mesh.rotation.clone(),
      scale: mesh.scale.clone(),
      stats: selectedUnit.stats ? { ...selectedUnit.stats } : undefined,
      team: selectedUnit.team,
    };

    sceneRef.current.add(mesh);
    selectableObjectsRef.current.push(mesh);
    setUnits(prev => [...prev, newUnit]);
  }, [selectedUnit, createUnitMesh]);

  const startPlacement = useCallback((template: UnitTemplate) => {
    setSelectedTemplate(template);
    setPlacementMode(true);
    setSelectedUnit(null);
    if (transformControlsRef.current) {
      transformControlsRef.current.detach();
    }
  }, []);

  const focusOnUnit = useCallback(() => {
    if (!selectedUnit || !orbitControlsRef.current) return;
    orbitControlsRef.current.target.copy(selectedUnit.position);
  }, [selectedUnit]);

  return (
    <div className="flex h-full gap-4" data-testid="rts-scene-editor">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 bg-card/50 rounded-t-lg border border-b-0">
          <div className="flex items-center gap-2">
            <Tabs value={transformMode} onValueChange={(v) => setTransformMode(v as TransformMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="translate" className="h-7 px-2" data-testid="tool-translate">
                  <Move className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="rotate" className="h-7 px-2" data-testid="tool-rotate">
                  <RotateCw className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="scale" className="h-7 px-2" data-testid="tool-scale">
                  <Maximize2 className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="h-6 w-px bg-border" />
            
            <Button 
              size="sm" 
              variant={showGrid ? "default" : "outline"}
              onClick={() => setShowGrid(!showGrid)}
              data-testid="button-toggle-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant={showHelpers ? "default" : "outline"}
              onClick={() => setShowHelpers(!showHelpers)}
              data-testid="button-toggle-helpers"
            >
              {showHelpers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {placementMode && (
              <Badge className="bg-green-600">
                Placing: {selectedTemplate?.name}
              </Badge>
            )}
            
            <Button 
              size="sm"
              variant={isPlaying ? "destructive" : "default"}
              onClick={() => setIsPlaying(!isPlaying)}
              data-testid="button-play-stop"
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isPlaying ? "Stop" : "Play"}
            </Button>
            
            <Button size="sm" variant="outline" data-testid="button-save-scene">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        
        <div 
          ref={containerRef} 
          className="flex-1 relative border rounded-b-lg overflow-hidden bg-black"
          style={{ minHeight: "500px" }}
        >
          {webglError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 p-8">
              <Box className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">3D Scene Not Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {webglError}
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Try using a different browser or enabling hardware acceleration.
              </p>
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            onClick={handleCanvasClick}
            className={placementMode ? "cursor-crosshair" : "cursor-default"}
            data-testid="canvas-3d-scene"
          />
          
          {selectedUnit && (
            <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {selectedUnit.type}
                </Badge>
                <span className="font-semibold text-white">{selectedUnit.name}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={focusOnUnit} title="Focus">
                  <Crosshair className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={duplicateSelectedUnit} title="Duplicate">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={deleteSelectedUnit} title="Delete">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 space-y-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="grid grid-cols-2 gap-1">
                {UNIT_TEMPLATES.filter(t => t.type === "unit").map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col items-center gap-1"
                    onClick={() => startPlacement(template)}
                    data-testid={`place-unit-${template.id}`}
                  >
                    <div 
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="text-xs">{template.name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Buildings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1">
              {UNIT_TEMPLATES.filter(t => t.type === "building").map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex flex-col items-center gap-1"
                  onClick={() => startPlacement(template)}
                  data-testid={`place-building-${template.id}`}
                >
                  <div 
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: template.color }}
                  />
                  <span className="text-xs">{template.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Props
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1">
              {UNIT_TEMPLATES.filter(t => t.type === "prop").map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex flex-col items-center gap-1"
                  onClick={() => startPlacement(template)}
                  data-testid={`place-prop-${template.id}`}
                >
                  <div 
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: template.color }}
                  />
                  <span className="text-xs">{template.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedUnit && selectedUnit.stats && (
          <Card className="bg-card/50 border-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{selectedUnit.name} Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Health</span>
                  <span className="text-green-400">{selectedUnit.stats.health}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, selectedUnit.stats.health / 2)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Attack</span>
                  <span className="text-red-400">{selectedUnit.stats.attack}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${Math.min(100, selectedUnit.stats.attack * 3)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Defense</span>
                  <span className="text-blue-400">{selectedUnit.stats.defense}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, selectedUnit.stats.defense * 3)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="text-yellow-400">{selectedUnit.stats.speed}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${Math.min(100, selectedUnit.stats.speed * 10)}%` }}
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Position</div>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <div className="bg-muted rounded px-2 py-1">
                    X: {selectedUnit.position.x.toFixed(1)}
                  </div>
                  <div className="bg-muted rounded px-2 py-1">
                    Y: {selectedUnit.position.y.toFixed(1)}
                  </div>
                  <div className="bg-muted rounded px-2 py-1">
                    Z: {selectedUnit.position.z.toFixed(1)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Scene Objects ({units.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              {units.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Click a unit above to place it on the map
                </div>
              ) : (
                <div className="space-y-1">
                  {units.map((unit) => (
                    <div
                      key={unit.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedUnit?.id === unit.id 
                          ? "bg-primary/20 border border-primary/50" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        setSelectedUnit(unit);
                        if (transformControlsRef.current) {
                          transformControlsRef.current.attach(unit.mesh);
                        }
                      }}
                      data-testid={`scene-object-${unit.id}`}
                    >
                      <div 
                        className="w-3 h-3 rounded-sm"
                        style={{ 
                          backgroundColor: UNIT_TEMPLATES.find(t => t.name === unit.name)?.color || "#888"
                        }}
                      />
                      <span className="text-xs flex-1 truncate">{unit.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {unit.team}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
