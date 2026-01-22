import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RTSGameControls } from "./rts-game-controls";
import { GameSettingsDialog } from "./game-settings-dialog";
import { HotkeyReference } from "./hotkey-reference";
import { Settings, Keyboard } from "lucide-react";

interface RTSGameEngineEnhancedProps {
  projectId: string;
  mapData?: {
    width?: number;
    height?: number;
    units?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
      health?: number;
      speed?: number;
      attackDamage?: number;
      attackRange?: number;
    }>;
    buildings?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
      health?: number;
    }>;
  };
  gameSettings?: any;
  onSaveSettings?: (settings: any) => void;
}

interface Collider {
  type: 'sphere' | 'aabb';
  radius?: number;
  halfExtents?: { x: number; y: number; z: number };
}

interface UnitData {
  id: string;
  type: string;
  team: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  collider: Collider;
  targetPosition: THREE.Vector3 | null;
  attackTarget: string | null;
  isMoving: boolean;
  isAttacking: boolean;
}

interface BuildingData {
  id: string;
  type: string;
  team: number;
  health: number;
  maxHealth: number;
  collider: Collider;
}

interface GameState {
  resources: { gold: number; wood: number; food: number };
  selectedUnits: string[];
  unitGroups: Record<number, string[]>;
  isPaused: boolean;
}

export function RTSGameEngineEnhanced({ projectId, mapData, gameSettings, onSaveSettings }: RTSGameEngineEnhancedProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const keyboardRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>(0);
  const unitsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const unitDataRef = useRef<Map<string, UnitData>>(new Map());
  const buildingsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const buildingDataRef = useRef<Map<string, BuildingData>>(new Map());
  const moveIndicatorsRef = useRef<THREE.Object3D[]>([]);
  const attackIndicatorsRef = useRef<THREE.Object3D[]>([]);
  const selectionBoxRef = useRef<{ start: THREE.Vector2; end: THREE.Vector2; active: boolean }>({
    start: new THREE.Vector2(),
    end: new THREE.Vector2(),
    active: false,
  });
  const gameStateRef = useRef<GameState>({
    resources: gameSettings?.startingResources || { gold: 1000, wood: 500, food: 0 },
    selectedUnits: [],
    unitGroups: {},
    isPaused: false,
  });

  const [gameState, setGameState] = useState<GameState>({
    resources: gameSettings?.startingResources || { gold: 1000, wood: 500, food: 0 },
    selectedUnits: [],
    unitGroups: {},
    isPaused: false,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [currentGameSpeed, setCurrentGameSpeed] = useState(gameSettings?.gameSpeed || 1.0);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    const width = canvasRef.current.clientWidth || 800;
    const height = canvasRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 30, 30);
    cameraRef.current = camera;

    // Create renderer with error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      canvasRef.current.appendChild(renderer.domElement);
      setWebglError(false);
    } catch (error) {
      console.error("Failed to create WebGL renderer:", error);
      setWebglError(true);
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

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
    ground.userData = { isGround: true };
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(terrainWidth, terrainWidth / 2, 0x000000, 0x444444);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    const units = mapData?.units || [
      { id: "unit1", type: "infantry", position: { x: -5, y: 5 }, team: 0, health: 100, speed: 3, attackDamage: 10, attackRange: 1.5 },
      { id: "unit2", type: "infantry", position: { x: 5, y: -5 }, team: 1, health: 100, speed: 3, attackDamage: 10, attackRange: 1.5 },
      { id: "unit3", type: "cavalry", position: { x: -10, y: 0 }, team: 0, health: 150, speed: 5, attackDamage: 15, attackRange: 2 },
      { id: "unit4", type: "archer", position: { x: -8, y: 3 }, team: 0, health: 60, speed: 2.5, attackDamage: 20, attackRange: 8 },
      { id: "unit5", type: "infantry", position: { x: 8, y: -3 }, team: 1, health: 100, speed: 3, attackDamage: 10, attackRange: 1.5 },
    ];

    const buildings = (mapData as any)?.buildings || [
      { id: "building1", type: "barracks", position: { x: -15, y: 10 }, team: 0, health: 500 },
      { id: "building2", type: "barracks", position: { x: 15, y: -10 }, team: 1, health: 500 },
    ];

    units.forEach((unit) => {
      const unitGroup = new THREE.Group();
      const unitType = unit.type;
      const isRanged = unitType === 'archer';
      const isCavalry = unitType === 'cavalry';
      
      unitGroup.userData = { 
        id: unit.id, 
        type: unit.type, 
        team: unit.team,
        isUnit: true,
      };

      const height = isCavalry ? 2.5 : 2;
      const width = isCavalry ? 1.5 : 1;
      const unitGeometry = new THREE.BoxGeometry(width, height, width);
      const teamColor = unit.team === 0 ? 0x2563eb : 0xdc2626;
      const unitMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
      const unitMesh = new THREE.Mesh(unitGeometry, unitMaterial);
      unitMesh.castShadow = true;
      unitMesh.receiveShadow = true;
      unitMesh.userData = { isUnitMesh: true };
      unitGroup.add(unitMesh);

      if (isRanged) {
        const bowGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
        const bowMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const bow = new THREE.Mesh(bowGeom, bowMat);
        bow.rotation.z = Math.PI / 4;
        bow.position.set(0.5, 0.5, 0);
        unitGroup.add(bow);
      }

      const selectionRing = new THREE.Mesh(
        new THREE.RingGeometry(width * 0.7, width * 0.9, 32),
        new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      selectionRing.rotation.x = -Math.PI / 2;
      selectionRing.position.y = -height / 2 + 0.05;
      selectionRing.userData = { isSelectionRing: true };
      unitGroup.add(selectionRing);

      const healthBarBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      healthBarBg.position.set(0, height / 2 + 0.3, 0);
      healthBarBg.userData = { isHealthBar: true, isBackground: true };
      unitGroup.add(healthBarBg);

      const healthBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      healthBar.position.set(0, height / 2 + 0.3, 0.01);
      healthBar.userData = { isHealthBar: true, isForeground: true };
      unitGroup.add(healthBar);

      unitGroup.position.set(unit.position.x, height / 2, unit.position.y);
      scene.add(unitGroup);
      unitsRef.current.set(unit.id, unitGroup);

      const unitData: UnitData = {
        id: unit.id,
        type: unit.type,
        team: unit.team,
        health: unit.health || 100,
        maxHealth: unit.health || 100,
        speed: unit.speed || 3,
        attackDamage: unit.attackDamage || 10,
        attackRange: unit.attackRange || 1.5,
        collider: { type: 'sphere', radius: width * 0.6 },
        targetPosition: null,
        attackTarget: null,
        isMoving: false,
        isAttacking: false,
      };
      unitDataRef.current.set(unit.id, unitData);
    });

    buildings.forEach((building: { id: string; type: string; position: { x: number; y: number }; team: number; health?: number }) => {
      const buildingGroup = new THREE.Group();
      buildingGroup.userData = { 
        id: building.id, 
        type: building.type, 
        team: building.team,
        isBuilding: true,
      };

      const buildingGeometry = new THREE.BoxGeometry(4, 3, 4);
      const teamColor = building.team === 0 ? 0x1e40af : 0x991b1b;
      const buildingMaterial = new THREE.MeshStandardMaterial({ color: teamColor });
      const buildingMesh = new THREE.Mesh(buildingGeometry, buildingMaterial);
      buildingMesh.castShadow = true;
      buildingMesh.receiveShadow = true;
      buildingMesh.userData = { isBuildingMesh: true };
      buildingGroup.add(buildingMesh);

      const roofGeometry = new THREE.ConeGeometry(3, 2, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 2.5;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      buildingGroup.add(roof);

      buildingGroup.position.set(building.position.x, 1.5, building.position.y);
      scene.add(buildingGroup);
      buildingsRef.current.set(building.id, buildingGroup);

      const buildingData: BuildingData = {
        id: building.id,
        type: building.type,
        team: building.team,
        health: building.health || 500,
        maxHealth: building.health || 500,
        collider: { type: 'aabb', halfExtents: { x: 2, y: 1.5, z: 2 } },
      };
      buildingDataRef.current.set(building.id, buildingData);
    });

    const createMoveIndicator = (position: THREE.Vector3) => {
      const indicatorGroup = new THREE.Group();
      
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.5, 32),
        new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      indicatorGroup.add(ring);
      
      indicatorGroup.position.copy(position);
      indicatorGroup.userData = { createdAt: Date.now(), duration: 1500 };
      scene.add(indicatorGroup);
      moveIndicatorsRef.current.push(indicatorGroup);
      return indicatorGroup;
    };

    const createAttackIndicator = (position: THREE.Vector3) => {
      const indicatorGroup = new THREE.Group();
      
      const crossSize = 0.4;
      const crossGeom = new THREE.BufferGeometry();
      const crossVerts = new Float32Array([
        -crossSize, 0.1, -crossSize, crossSize, 0.1, crossSize,
        crossSize, 0.1, -crossSize, -crossSize, 0.1, crossSize,
      ]);
      crossGeom.setAttribute('position', new THREE.BufferAttribute(crossVerts, 3));
      const crossMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 });
      const cross = new THREE.LineSegments(crossGeom, crossMat);
      indicatorGroup.add(cross);
      
      indicatorGroup.position.copy(position);
      indicatorGroup.userData = { createdAt: Date.now(), duration: 1500 };
      scene.add(indicatorGroup);
      attackIndicatorsRef.current.push(indicatorGroup);
      return indicatorGroup;
    };

    const onMouseClick = (event: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
      if (event.button !== 0) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

      const clickedUnit = intersects.find((i) => {
        const parent = i.object.parent;
        return parent?.userData.isUnit && !i.object.userData.isSelectionRing && !i.object.userData.isHealthBar;
      });

      if (clickedUnit && clickedUnit.object.parent) {
        const unitId = clickedUnit.object.parent.userData.id;
        const unitData = unitDataRef.current.get(unitId);
        
        if (unitData && unitData.team === 0) {
          if (event.shiftKey) {
            setGameState((prev) => {
              const alreadySelected = prev.selectedUnits.includes(unitId);
              return {
                ...prev,
                selectedUnits: alreadySelected 
                  ? prev.selectedUnits.filter(id => id !== unitId)
                  : [...prev.selectedUnits, unitId],
              };
            });
          } else {
            setGameState((prev) => ({
              ...prev,
              selectedUnits: [unitId],
            }));
          }
        }
      } else {
        if (!event.shiftKey) {
          setGameState((prev) => ({
            ...prev,
            selectedUnits: [],
          }));
        }
      }
    };

    const onRightClick = (event: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
      event.preventDefault();

      const selectedUnits = gameStateRef.current.selectedUnits;
      if (selectedUnits.length === 0) return;

      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

      const clickedEnemy = intersects.find((i) => {
        const parent = i.object.parent;
        if (!parent) return false;
        const userData = parent.userData;
        if (userData.isUnit) {
          const unitData = unitDataRef.current.get(userData.id);
          return unitData && unitData.team !== 0;
        }
        if (userData.isBuilding) {
          const buildingData = buildingDataRef.current.get(userData.id);
          return buildingData && buildingData.team !== 0;
        }
        return false;
      });

      if (clickedEnemy && clickedEnemy.object.parent) {
        const targetId = clickedEnemy.object.parent.userData.id;
        const targetPos = clickedEnemy.object.parent.position.clone();
        createAttackIndicator(targetPos);
        
        selectedUnits.forEach((unitId) => {
          const unitData = unitDataRef.current.get(unitId);
          if (unitData && unitData.team === 0) {
            unitData.attackTarget = targetId;
            unitData.targetPosition = null;
            unitData.isAttacking = true;
            unitData.isMoving = false;
          }
        });
      } else {
        const groundHit = intersects.find((i) => i.object.userData.isGround);
        if (groundHit) {
          const targetPos = groundHit.point.clone();
          createMoveIndicator(targetPos);
          
          const formationSpacing = 1.5;
          const unitsCount = selectedUnits.length;
          const cols = Math.ceil(Math.sqrt(unitsCount));
          
          selectedUnits.forEach((unitId, index) => {
            const unitData = unitDataRef.current.get(unitId);
            if (unitData && unitData.team === 0) {
              const row = Math.floor(index / cols);
              const col = index % cols;
              const offsetX = (col - (cols - 1) / 2) * formationSpacing;
              const offsetZ = row * formationSpacing;
              
              const finalPos = new THREE.Vector3(
                targetPos.x + offsetX,
                0,
                targetPos.z + offsetZ
              );
              
              unitData.targetPosition = finalPos;
              unitData.attackTarget = null;
              unitData.isMoving = true;
              unitData.isAttacking = false;
            }
          });
        }
      }
    };

    let isMiddleMouseDown = false;
    let middleMouseStart = { x: 0, y: 0 };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault();
        isMiddleMouseDown = true;
        middleMouseStart = { x: event.clientX, y: event.clientY };
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isMiddleMouseDown && controlsRef.current && cameraRef.current) {
        const deltaX = event.clientX - middleMouseStart.x;
        const deltaY = event.clientY - middleMouseStart.y;

        const panSpeed = 0.05;
        controlsRef.current.target.x -= deltaX * panSpeed;
        controlsRef.current.target.z += deltaY * panSpeed;
        
        cameraRef.current.position.x -= deltaX * panSpeed;
        cameraRef.current.position.z += deltaY * panSpeed;

        middleMouseStart = { x: event.clientX, y: event.clientY };
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 1) {
        isMiddleMouseDown = false;
        renderer.domElement.style.cursor = 'default';
      }
    };

    renderer.domElement.addEventListener("click", onMouseClick);
    renderer.domElement.addEventListener("contextmenu", onRightClick);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseup", onMouseUp);

    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardRef.current.add(e.key.toLowerCase());
      
      if (e.key === "Escape") {
        setShowSettings(true);
      }
      
      if (e.key === "?") {
        setShowHotkeys(true);
      }
      
      if (e.key === " ") {
        e.preventDefault();
        setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
      }
      
      if (e.key >= "1" && e.key <= "9") {
        const groupNum = parseInt(e.key);
        if (e.ctrlKey || e.metaKey) {
          setGameState((prev) => ({
            ...prev,
            unitGroups: { ...prev.unitGroups, [groupNum]: [...prev.selectedUnits] },
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            selectedUnits: prev.unitGroups[groupNum] || [],
          }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyboardRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const cameraMoveSpeed = 0.5;
    const cameraRotateSpeed = 0.02;

    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (gameStateRef.current.isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const speedMultiplier = currentGameSpeed;

      if (controlsRef.current) {
        const effectiveSpeed = cameraMoveSpeed * speedMultiplier;
        
        if (keyboardRef.current.has("w")) {
          controlsRef.current.target.z -= effectiveSpeed;
          cameraRef.current!.position.z -= effectiveSpeed;
        }
        if (keyboardRef.current.has("s")) {
          controlsRef.current.target.z += effectiveSpeed;
          cameraRef.current!.position.z += effectiveSpeed;
        }
        if (keyboardRef.current.has("a")) {
          controlsRef.current.target.x -= effectiveSpeed;
          cameraRef.current!.position.x -= effectiveSpeed;
        }
        if (keyboardRef.current.has("d")) {
          controlsRef.current.target.x += effectiveSpeed;
          cameraRef.current!.position.x += effectiveSpeed;
        }
        if (keyboardRef.current.has("q")) {
          const pos = cameraRef.current!.position.clone().sub(controlsRef.current.target);
          pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotateSpeed);
          cameraRef.current!.position.copy(controlsRef.current.target.clone().add(pos));
        }
        if (keyboardRef.current.has("e")) {
          const pos = cameraRef.current!.position.clone().sub(controlsRef.current.target);
          pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -cameraRotateSpeed);
          cameraRef.current!.position.copy(controlsRef.current.target.clone().add(pos));
        }

        controlsRef.current.update();
      }

      const checkSphereCollision = (pos1: THREE.Vector3, radius1: number, pos2: THREE.Vector3, radius2: number): boolean => {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < radius1 + radius2;
      };

      const checkSphereAABBCollision = (spherePos: THREE.Vector3, sphereRadius: number, aabbPos: THREE.Vector3, halfExtents: { x: number; z: number }): boolean => {
        const closestX = Math.max(aabbPos.x - halfExtents.x, Math.min(spherePos.x, aabbPos.x + halfExtents.x));
        const closestZ = Math.max(aabbPos.z - halfExtents.z, Math.min(spherePos.z, aabbPos.z + halfExtents.z));
        const dx = spherePos.x - closestX;
        const dz = spherePos.z - closestZ;
        return (dx * dx + dz * dz) < (sphereRadius * sphereRadius);
      };

      unitsRef.current.forEach((unitObj, unitId) => {
        const unitData = unitDataRef.current.get(unitId);
        if (!unitData) return;

        if (unitData.targetPosition && unitData.isMoving) {
          const direction = new THREE.Vector3()
            .subVectors(unitData.targetPosition, unitObj.position)
            .setY(0);
          const distance = direction.length();

          if (distance > 0.3) {
            direction.normalize();
            const moveAmount = unitData.speed * deltaTime * speedMultiplier;
            const newPos = unitObj.position.clone().add(direction.multiplyScalar(Math.min(moveAmount, distance)));

            let canMove = true;
            const unitCollider = unitData.collider;

            buildingsRef.current.forEach((buildingObj) => {
              const buildingData = buildingDataRef.current.get(buildingObj.userData.id);
              if (buildingData && buildingData.collider.halfExtents) {
                if (checkSphereAABBCollision(
                  newPos,
                  unitCollider.radius || 0.5,
                  buildingObj.position,
                  { x: buildingData.collider.halfExtents.x, z: buildingData.collider.halfExtents.z }
                )) {
                  canMove = false;
                }
              }
            });

            unitsRef.current.forEach((otherUnitObj, otherUnitId) => {
              if (unitId === otherUnitId) return;
              const otherUnitData = unitDataRef.current.get(otherUnitId);
              if (!otherUnitData) return;

              if (checkSphereCollision(
                newPos,
                unitCollider.radius || 0.5,
                otherUnitObj.position,
                otherUnitData.collider.radius || 0.5
              )) {
                const pushDir = new THREE.Vector3().subVectors(newPos, otherUnitObj.position).normalize();
                newPos.add(pushDir.multiplyScalar(0.1));
              }
            });

            if (canMove) {
              unitObj.position.x = newPos.x;
              unitObj.position.z = newPos.z;

              const lookAtTarget = new THREE.Vector3(
                unitData.targetPosition.x,
                unitObj.position.y,
                unitData.targetPosition.z
              );
              unitObj.lookAt(lookAtTarget);
            }
          } else {
            unitData.isMoving = false;
            unitData.targetPosition = null;
          }
        }

        if (unitData.attackTarget && unitData.isAttacking) {
          const targetUnit = unitsRef.current.get(unitData.attackTarget);
          const targetBuilding = buildingsRef.current.get(unitData.attackTarget);
          const targetObj = targetUnit || targetBuilding;
          const targetData = targetUnit 
            ? unitDataRef.current.get(unitData.attackTarget)
            : buildingDataRef.current.get(unitData.attackTarget);

          if (targetObj && targetData) {
            const distToTarget = unitObj.position.distanceTo(targetObj.position);

            if (distToTarget > unitData.attackRange) {
              const direction = new THREE.Vector3()
                .subVectors(targetObj.position, unitObj.position)
                .setY(0)
                .normalize();
              const moveAmount = unitData.speed * deltaTime * speedMultiplier;
              unitObj.position.add(direction.multiplyScalar(moveAmount));

              const lookAtTarget = new THREE.Vector3(
                targetObj.position.x,
                unitObj.position.y,
                targetObj.position.z
              );
              unitObj.lookAt(lookAtTarget);
            } else {
              if (!unitObj.userData.lastAttackTime || currentTime - unitObj.userData.lastAttackTime > 1000) {
                targetData.health -= unitData.attackDamage;
                unitObj.userData.lastAttackTime = currentTime;

                if (targetData.health <= 0) {
                  if (targetUnit) {
                    scene.remove(targetUnit);
                    unitsRef.current.delete(unitData.attackTarget);
                    unitDataRef.current.delete(unitData.attackTarget);
                  } else if (targetBuilding) {
                    scene.remove(targetBuilding);
                    buildingsRef.current.delete(unitData.attackTarget);
                    buildingDataRef.current.delete(unitData.attackTarget);
                  }
                  unitData.attackTarget = null;
                  unitData.isAttacking = false;
                }
              }
            }
          } else {
            unitData.attackTarget = null;
            unitData.isAttacking = false;
          }
        }

        const healthBar = unitObj.children.find(c => c.userData.isHealthBar && c.userData.isForeground) as THREE.Mesh;
        if (healthBar) {
          const healthPercent = unitData.health / unitData.maxHealth;
          healthBar.scale.x = Math.max(0, healthPercent);
          healthBar.position.x = (1 - healthPercent) * -0.6;
          (healthBar.material as THREE.MeshBasicMaterial).color.setHex(
            healthPercent > 0.6 ? 0x22c55e : healthPercent > 0.3 ? 0xeab308 : 0xef4444
          );
        }

        const selectionRing = unitObj.children.find((child) => child.userData.isSelectionRing) as THREE.Mesh;
        if (selectionRing) {
          const isSelected = gameStateRef.current.selectedUnits.includes(unitId);
          (selectionRing.material as THREE.MeshBasicMaterial).opacity = isSelected ? 0.8 : 0;
        }
      });

      const now = Date.now();
      moveIndicatorsRef.current = moveIndicatorsRef.current.filter(indicator => {
        const age = now - indicator.userData.createdAt;
        if (age > indicator.userData.duration) {
          scene.remove(indicator);
          return false;
        }
        const opacity = 1 - (age / indicator.userData.duration);
        indicator.traverse(child => {
          if ((child as THREE.Mesh).material) {
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;
          }
        });
        return true;
      });

      attackIndicatorsRef.current = attackIndicatorsRef.current.filter(indicator => {
        const age = now - indicator.userData.createdAt;
        if (age > indicator.userData.duration) {
          scene.remove(indicator);
          return false;
        }
        return true;
      });

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
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      renderer.domElement.removeEventListener("click", onMouseClick);
      renderer.domElement.removeEventListener("contextmenu", onRightClick);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
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

      controlsRef.current?.dispose();
      
      if (rendererRef.current && canvasRef.current) {
        canvasRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      unitsRef.current.clear();
      unitDataRef.current.clear();
      buildingsRef.current.clear();
      buildingDataRef.current.clear();
      moveIndicatorsRef.current = [];
      attackIndicatorsRef.current = [];
    };
  }, [isPlaying, mapData, projectId, currentGameSpeed]);

  const handleRestart = () => {
    setGameState({
      resources: gameSettings?.startingResources || { gold: 1000, wood: 500, food: 0 },
      selectedUnits: [],
      unitGroups: {},
      isPaused: false,
    });
  };

  const handleSaveSettings = (newSettings: any) => {
    setCurrentGameSpeed(newSettings.gameSpeed || 1.0);
    if (onSaveSettings) {
      onSaveSettings(newSettings);
    }
  };

  if (!isPlaying) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 text-center">
          <h3 className="mb-4 text-xl font-semibold">Enhanced RTS Game Engine</h3>
          <p className="mb-6 text-muted-foreground">
            Full keyboard + mouse controls, FBX character loading, and terrain raycasting
          </p>
          <Button onClick={() => setIsPlaying(true)} size="lg" data-testid="button-play-enhanced-game">
            ▶ Play Game
          </Button>
        </Card>
      </div>
    );
  }

  if (webglError) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 text-center">
          <h3 className="mb-4 text-xl font-semibold text-destructive">WebGL Not Available</h3>
          <p className="mb-6 text-muted-foreground">
            Your browser or environment doesn't support WebGL. Please try using a modern browser with hardware acceleration enabled.
          </p>
          <Button onClick={() => { setIsPlaying(false); setWebglError(false); }} variant="outline" data-testid="button-close-webgl-error">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={canvasRef} className="h-full w-full" data-testid="canvas-enhanced-game" />

      <RTSGameControls
        onContinue={() => setGameState((prev) => ({ ...prev, isPaused: false }))}
        onRestart={handleRestart}
        onQuit={() => setIsPlaying(false)}
        stagesCleared={0}
      />

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
              {gameState.selectedUnits.map((unitId) => {
                const unit = unitsRef.current.get(unitId);
                return (
                  <div key={unitId} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: unit?.userData.team === 0 ? "#0000ff" : "#ff0000",
                      }}
                    />
                    <span className="text-muted-foreground">{unitId}</span>
                  </div>
                );
              })}
            </div>
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

      <div className="pointer-events-auto absolute right-4 top-4 z-10 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(true)}
          data-testid="button-open-settings"
          className="bg-background/80 backdrop-blur-sm"
          title="Settings (Esc)"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowHotkeys(true)}
          data-testid="button-open-hotkeys"
          className="bg-background/80 backdrop-blur-sm"
          title="Controls (?)"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(false)}
          data-testid="button-stop-enhanced-game"
          className="bg-background/80 backdrop-blur-sm"
          title="Stop Game"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>

      <GameSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={gameSettings || {}}
        onSave={handleSaveSettings}
      />

      <HotkeyReference
        open={showHotkeys}
        onOpenChange={setShowHotkeys}
      />
    </div>
  );
}
