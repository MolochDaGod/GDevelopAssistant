import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, RotateCcw, Crosshair, Users, Building2, Settings, Brain } from "lucide-react";
import { AIManager, AIEntity, createDefaultBehaviorPicker, BehaviorPicker, BehaviorScorer } from "@/lib/rts-ai";
import { RTSCamera, RTSCameraPresets } from "@/lib/rts-camera";
import { ProceduralTerrain, TerrainPresets, createWaterPlane } from "@/lib/rts-terrain";

interface RTSGameEngineV2Props {
  projectId: string;
  mapConfig?: {
    width?: number;
    height?: number;
    terrainType?: 'plains' | 'mountains' | 'islands' | 'desert' | 'arena';
  };
  onEntitySelect?: (entity: AIEntity | null) => void;
  onGameStateChange?: (state: GameStateV2) => void;
}

interface GameStateV2 {
  isPlaying: boolean;
  isPaused: boolean;
  gameTime: number;
  selectedEntityId: string | null;
  resources: { gold: number; wood: number; food: number };
  playerUnits: number;
  enemyUnits: number;
  wave: number;
}

const UNIT_PRESETS = {
  warrior: { health: 100, attackPower: 15, attackRange: 2, speed: 4 },
  archer: { health: 60, attackPower: 12, attackRange: 15, speed: 5 },
  knight: { health: 150, attackPower: 20, attackRange: 2, speed: 3 },
  mage: { health: 50, attackPower: 25, attackRange: 12, speed: 4 },
  worker: { health: 40, attackPower: 5, attackRange: 1, speed: 6 },
};

export function RTSGameEngineV2({
  projectId,
  mapConfig,
  onEntitySelect,
  onGameStateChange,
}: RTSGameEngineV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraControllerRef = useRef<RTSCamera | null>(null);
  const terrainRef = useRef<ProceduralTerrain | null>(null);
  const aiManagerRef = useRef<AIManager | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationFrameRef = useRef<number>(0);
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  
  const [gameState, setGameState] = useState<GameStateV2>({
    isPlaying: false,
    isPaused: false,
    gameTime: 0,
    selectedEntityId: null,
    resources: { gold: 1000, wood: 500, food: 200 },
    playerUnits: 0,
    enemyUnits: 0,
    wave: 0,
  });
  
  const [aiDebugInfo, setAiDebugInfo] = useState<{ entityId: string; behavior: string; state: string; health: number }[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [webglError, setWebglError] = useState(false);

  const createUnitMesh = useCallback((unitType: string, team: 'player' | 'enemy' | 'neutral'): THREE.Object3D => {
    const group = new THREE.Group();
    
    const colors = {
      player: 0x22c55e,
      enemy: 0xdc2626,
      neutral: 0xfbbf24
    };
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: colors[team],
      roughness: 0.6,
      metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xfbbf24,
      roughness: 0.5 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.1;
    head.castShadow = true;
    group.add(head);
    
    if (unitType === 'archer' || unitType === 'mage') {
      const weaponGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8);
      const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      weapon.position.set(0.4, 0.7, 0);
      weapon.rotation.z = Math.PI / 6;
      group.add(weapon);
    } else if (unitType === 'knight' || unitType === 'warrior') {
      const swordGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.02);
      const swordMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 });
      const sword = new THREE.Mesh(swordGeometry, swordMaterial);
      sword.position.set(0.35, 0.7, 0);
      group.add(sword);
    }
    
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    healthBarBg.position.y = 1.5;
    healthBarBg.rotation.x = -Math.PI / 4;
    group.add(healthBarBg);
    
    const healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    healthBar.position.y = 1.5;
    healthBar.position.z = 0.01;
    healthBar.rotation.x = -Math.PI / 4;
    healthBar.name = 'healthBar';
    group.add(healthBar);
    
    return group;
  }, []);

  const initGame = useCallback(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
    } catch {
      setWebglError(true);
      return;
    }
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    const terrainType = mapConfig?.terrainType ?? 'arena';
    const terrainConfig = TerrainPresets[terrainType]();
    const terrain = new ProceduralTerrain({
      ...terrainConfig,
      width: mapConfig?.width ?? 60,
      height: mapConfig?.height ?? 60,
      seed: Date.now()
    });
    scene.add(terrain.getMesh());
    terrainRef.current = terrain;
    
    if (terrainType === 'islands') {
      const water = createWaterPlane(terrain.getWidth(), terrain.getHeight(), 0.3);
      scene.add(water);
    }
    
    const cameraController = new RTSCamera(camera, {
      ...RTSCameraPresets.grudgeBrawl(),
      bounds: terrain.getBounds()
    });
    cameraController.attach(containerRef.current);
    cameraControllerRef.current = cameraController;
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(30, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);
    
    const rimLight = new THREE.DirectionalLight(0xdc2626, 0.3);
    rimLight.position.set(-20, 20, -20);
    scene.add(rimLight);
    
    const aiManager = new AIManager({
      updateInterval: 100,
      maxEntitiesPerUpdate: 50,
      debugMode: true
    });
    aiManagerRef.current = aiManager;
    
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      cameraController.detach();
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      terrain.dispose();
    };
  }, [mapConfig]);

  const spawnUnits = useCallback((count: number, team: 'player' | 'enemy', unitType: string = 'warrior') => {
    const scene = sceneRef.current;
    const aiManager = aiManagerRef.current;
    const terrain = terrainRef.current;
    
    if (!scene || !aiManager || !terrain) return;
    
    const preset = UNIT_PRESETS[unitType as keyof typeof UNIT_PRESETS] || UNIT_PRESETS.warrior;
    
    for (let i = 0; i < count; i++) {
      const pos = terrain.getRandomWalkablePosition();
      
      if (team === 'player') {
        pos.x = -Math.abs(pos.x) - 5;
      } else {
        pos.x = Math.abs(pos.x) + 5;
      }
      
      const mesh = createUnitMesh(unitType, team);
      mesh.position.copy(pos);
      scene.add(mesh);
      
      const entityId = `${team}_${unitType}_${Date.now()}_${i}`;
      meshesRef.current.set(entityId, mesh);
      
      const entity = aiManager.createEntity({
        id: entityId,
        position: pos,
        team,
        unitType,
        stats: {
          health: preset.health,
          maxHealth: preset.health,
          attackPower: preset.attackPower,
          attackRange: preset.attackRange,
          speed: preset.speed
        },
        mesh
      });
      
      if (team === 'player') {
        entity.blackboard.patrolPoints = [
          pos.clone(),
          new THREE.Vector3(pos.x + 10, pos.y, pos.z),
          new THREE.Vector3(pos.x + 10, pos.y, pos.z + 10),
          new THREE.Vector3(pos.x, pos.y, pos.z + 10)
        ];
      }
    }
    
    updateUnitCounts();
  }, [createUnitMesh]);

  const updateUnitCounts = useCallback(() => {
    const aiManager = aiManagerRef.current;
    if (!aiManager) return;
    
    const playerUnits = aiManager.getEntitiesByTeam('player').filter(e => e.state !== 'dead').length;
    const enemyUnits = aiManager.getEntitiesByTeam('enemy').filter(e => e.state !== 'dead').length;
    
    setGameState(prev => ({
      ...prev,
      playerUnits,
      enemyUnits
    }));
  }, []);

  const spawnWave = useCallback((waveNumber: number) => {
    const enemyCount = 3 + waveNumber * 2;
    const types = ['warrior', 'archer', 'knight'];
    
    for (let i = 0; i < enemyCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      spawnUnits(1, 'enemy', type);
    }
    
    setGameState(prev => ({ ...prev, wave: waveNumber }));
  }, [spawnUnits]);

  const startGame = useCallback(() => {
    const cleanup = initGame();
    
    if (webglError) return;
    
    spawnUnits(5, 'player', 'warrior');
    spawnUnits(3, 'player', 'archer');
    spawnWave(1);
    
    clockRef.current.start();
    
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      gameTime: 0
    }));
    
    return cleanup;
  }, [initGame, spawnUnits, spawnWave, webglError]);

  const updateHealthBars = useCallback(() => {
    const aiManager = aiManagerRef.current;
    if (!aiManager) return;
    
    for (const entity of aiManager.getAllEntities()) {
      const mesh = meshesRef.current.get(entity.id);
      if (!mesh) continue;
      
      const healthBar = mesh.getObjectByName('healthBar') as THREE.Mesh;
      if (healthBar) {
        const healthRatio = entity.health / entity.maxHealth;
        healthBar.scale.x = healthRatio;
        healthBar.position.x = (1 - healthRatio) * -0.38;
        
        const material = healthBar.material as THREE.MeshBasicMaterial;
        if (healthRatio > 0.6) {
          material.color.setHex(0x22c55e);
        } else if (healthRatio > 0.3) {
          material.color.setHex(0xfbbf24);
        } else {
          material.color.setHex(0xdc2626);
        }
      }
      
      if (entity.state === 'dead') {
        mesh.visible = false;
      }
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const deltaTime = clockRef.current.getDelta() * gameSpeed;
    const aiManager = aiManagerRef.current;
    const cameraController = cameraControllerRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    
    if (aiManager) {
      aiManager.update(deltaTime);
      
      for (const entity of aiManager.getAllEntities()) {
        if (entity.mesh) {
          entity.mesh.position.copy(entity.position);
        }
      }
      
      const debugInfo = aiManager.getDebugInfo();
      setAiDebugInfo(debugInfo);
    }
    
    if (cameraController) {
      cameraController.update(deltaTime);
    }
    
    updateHealthBars();
    updateUnitCounts();
    
    if (renderer && scene && cameraController) {
      renderer.render(scene, cameraController.getCamera());
    }
    
    setGameState(prev => ({
      ...prev,
      gameTime: prev.gameTime + deltaTime
    }));
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.isPlaying, gameState.isPaused, gameSpeed, updateHealthBars, updateUnitCounts]);

  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameLoop]);

  useEffect(() => {
    onGameStateChange?.(gameState);
  }, [gameState, onGameStateChange]);

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const resetGame = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    meshesRef.current.clear();
    
    setGameState({
      isPlaying: false,
      isPaused: false,
      gameTime: 0,
      selectedEntityId: null,
      resources: { gold: 1000, wood: 500, food: 200 },
      playerUnits: 0,
      enemyUnits: 0,
      wave: 0,
    });
  };

  if (webglError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">WebGL is not available. Please use a WebGL-compatible browser.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            Player: {gameState.playerUnits}
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <Crosshair className="w-3 h-3" />
            Enemy: {gameState.enemyUnits}
          </Badge>
          <Badge variant="secondary">
            Wave {gameState.wave}
          </Badge>
          <Badge variant="outline">
            Time: {Math.floor(gameState.gameTime)}s
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {!gameState.isPlaying ? (
            <Button onClick={startGame} size="sm" data-testid="button-start-game">
              <Play className="w-4 h-4 mr-1" />
              Start Game
            </Button>
          ) : (
            <>
              <Button onClick={togglePause} size="sm" variant="outline" data-testid="button-pause">
                {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button onClick={resetGame} size="sm" variant="outline" data-testid="button-reset">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => spawnWave(gameState.wave + 1)} 
                size="sm"
                disabled={gameState.isPaused}
                data-testid="button-spawn-wave"
              >
                Spawn Wave
              </Button>
            </>
          )}
          
          <Button 
            onClick={() => setShowAIPanel(!showAIPanel)} 
            size="sm" 
            variant={showAIPanel ? "default" : "outline"}
            data-testid="button-toggle-ai"
          >
            <Brain className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex gap-4 flex-1 min-h-0">
        <div 
          ref={containerRef}
          className="flex-1 bg-background rounded-lg overflow-hidden border"
          style={{ minHeight: '400px' }}
          data-testid="game-canvas"
        />
        
        {showAIPanel && (
          <Card className="w-80 p-4 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Behavior Debug
            </h3>
            
            <div className="mb-4">
              <label className="text-sm text-muted-foreground">Game Speed</label>
              <Slider
                value={[gameSpeed]}
                onValueChange={([v]) => setGameSpeed(v)}
                min={0.25}
                max={3}
                step={0.25}
                className="mt-2"
              />
              <span className="text-xs text-muted-foreground">{gameSpeed}x</span>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {aiDebugInfo.slice(0, 20).map((info) => (
                  <div 
                    key={info.entityId}
                    className="p-2 bg-muted/50 rounded text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="font-mono truncate">{info.entityId.slice(0, 20)}</span>
                      <Badge variant={info.state === 'dead' ? 'destructive' : 'outline'} className="text-[10px]">
                        {info.state}
                      </Badge>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">{info.behavior}</span>
                      <span>HP: {info.health}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
      
      <div className="flex gap-2 justify-center flex-wrap">
        <Badge variant="outline">Gold: {gameState.resources.gold}</Badge>
        <Badge variant="outline">Wood: {gameState.resources.wood}</Badge>
        <Badge variant="outline">Food: {gameState.resources.food}</Badge>
      </div>
    </div>
  );
}
