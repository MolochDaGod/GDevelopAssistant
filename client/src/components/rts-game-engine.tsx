import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RTSGameEngineProps {
  projectId: string;
  mapData?: {
    terrain?: { width: number; height: number };
    units?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
    }>;
    buildings?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
    }>;
  };
}

interface GameState {
  resources: {
    gold: number;
    wood: number;
    food: number;
  };
  selectedUnits: string[];
  killFeed: Array<{ attacker: string; victim: string; time: number }>;
}

export function RTSGameEngine({ projectId, mapData }: RTSGameEngineProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>({
    resources: { gold: 1000, wood: 500, food: 0 },
    selectedUnits: [],
    killFeed: [],
  });

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 30, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    canvasRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const terrainWidth = (mapData as any)?.width || 40;
    const terrainHeight = (mapData as any)?.height || 40;

    const groundGeometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c59,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(terrainWidth, terrainWidth / 2, 0x000000, 0x444444);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    const units = mapData?.units || [
      { id: "unit1", type: "infantry", position: { x: -5, y: 5 }, team: 0 },
      { id: "unit2", type: "infantry", position: { x: 5, y: -5 }, team: 1 },
      { id: "unit3", type: "cavalry", position: { x: -10, y: 0 }, team: 0 },
    ];

    units.forEach((unit) => {
      const unitGeometry = new THREE.BoxGeometry(1, 2, 1);
      const teamColor = unit.team === 0 ? 0x0000ff : 0xff0000;
      const unitMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
      const unitMesh = new THREE.Mesh(unitGeometry, unitMaterial);
      unitMesh.position.set(unit.position.x, 1, unit.position.y);
      unitMesh.castShadow = true;
      unitMesh.receiveShadow = true;
      unitMesh.userData = { id: unit.id, type: unit.type, team: unit.team };
      scene.add(unitMesh);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      const clickedUnit = intersects.find((i) => i.object.userData.id);
      if (clickedUnit) {
        const unitId = clickedUnit.object.userData.id;
        setGameState((prev) => ({
          ...prev,
          selectedUnits: [unitId],
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          selectedUnits: [],
        }));
      }
    };

    renderer.domElement.addEventListener("click", onMouseClick);

    let cameraAngle = 0;
    let cameraDistance = 40;
    let cameraHeight = 30;

    const animate = () => {
      cameraAngle += 0.002;
      cameraDistance = 40;
      cameraHeight = 30;

      if (cameraRef.current) {
        cameraRef.current.position.x = Math.cos(cameraAngle) * cameraDistance;
        cameraRef.current.position.z = Math.sin(cameraAngle) * cameraDistance;
        cameraRef.current.position.y = cameraHeight;
        cameraRef.current.lookAt(0, 0, 0);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
      const newWidth = canvasRef.current.clientWidth;
      const newHeight = canvasRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onMouseClick);
      cancelAnimationFrame(animationFrameRef.current);
      
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            } else if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            }
          }
        });
      }
      
      if (rendererRef.current && canvasRef.current) {
        canvasRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [isPlaying, mapData, projectId]);

  if (!isPlaying) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 text-center">
          <h3 className="mb-4 text-xl font-semibold">RTS Game Engine</h3>
          <p className="mb-6 text-muted-foreground">
            Click Play to start your real-time strategy game
          </p>
          <Button onClick={() => setIsPlaying(true)} size="lg" data-testid="button-play-game">
            ▶ Play Game
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={canvasRef} className="h-full w-full" data-testid="canvas-game" />

      <section className="pointer-events-none absolute left-4 top-4 z-10">
        <Card className="pointer-events-auto bg-background/80 p-3 backdrop-blur-sm">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
              </svg>
              <span className="font-mono text-sm font-semibold">{gameState.resources.gold}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
              </svg>
              <span className="font-mono text-sm font-semibold">{gameState.resources.wood}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              <span className="font-mono text-sm font-semibold">{gameState.resources.food}</span>
            </div>
          </div>
        </Card>
      </section>

      {gameState.selectedUnits.length > 0 && (
        <section className="pointer-events-none absolute bottom-4 left-4 z-10">
          <Card className="pointer-events-auto bg-background/80 p-4 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Selected Units</h4>
              <Badge variant="secondary">{gameState.selectedUnits.length}</Badge>
            </div>
            <div className="space-y-1">
              {gameState.selectedUnits.map((unitId) => (
                <div key={unitId} className="text-xs text-muted-foreground">
                  {unitId}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {gameState.killFeed.length > 0 && (
        <section className="pointer-events-none absolute right-4 top-4 z-10">
          <Card className="pointer-events-auto max-w-xs bg-background/80 p-3 backdrop-blur-sm">
            <ul className="space-y-1">
              {gameState.killFeed.slice(-5).reverse().map((event, i) => (
                <li key={i} className="text-xs">
                  <span className="text-blue-500">{event.attacker}</span>
                  <span className="text-muted-foreground"> destroyed </span>
                  <span className="text-red-500">{event.victim}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="pointer-events-none absolute bottom-4 right-4 z-10">
        <Card className="pointer-events-auto bg-background/80 p-2 backdrop-blur-sm">
          <div className="h-32 w-32 border-2 border-border bg-muted">
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Minimap
            </div>
          </div>
        </Card>
      </section>

      <div className="pointer-events-auto absolute right-4 top-1/2 z-10 -translate-y-1/2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(false)}
          data-testid="button-stop-game"
          className="bg-background/80 backdrop-blur-sm"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
