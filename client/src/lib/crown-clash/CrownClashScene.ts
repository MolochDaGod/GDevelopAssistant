import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ArenaZones {
  playerTerritory: THREE.Box3;
  enemyTerritory: THREE.Box3;
  river: THREE.Box3;
  leftBridge: THREE.Box3;
  rightBridge: THREE.Box3;
  bounds: THREE.Box3;
}

export interface CrownClashSceneConfig {
  scene: THREE.Scene;
  onLoaded?: (zones: ArenaZones) => void;
}

const ARENA_WIDTH = 30;
const ARENA_DEPTH = 45;
const RIVER_Z = 0;
const RIVER_HALF_WIDTH = 2;
const BRIDGE_WIDTH = 4;
const BRIDGE_X_LEFT = -8;
const BRIDGE_X_RIGHT = 8;

export class CrownClashSceneManager {
  scene: THREE.Scene;
  environmentGroup: THREE.Group | null = null;
  zones: ArenaZones;
  private gltfLoader = new GLTFLoader();

  constructor(config: CrownClashSceneConfig) {
    this.scene = config.scene;
    
    // Define arena zones (player south/+Z, enemy north/-Z)
    this.zones = {
      playerTerritory: new THREE.Box3(
        new THREE.Vector3(-ARENA_WIDTH / 2, 0, RIVER_HALF_WIDTH),
        new THREE.Vector3(ARENA_WIDTH / 2, 20, ARENA_DEPTH / 2)
      ),
      enemyTerritory: new THREE.Box3(
        new THREE.Vector3(-ARENA_WIDTH / 2, 0, -ARENA_DEPTH / 2),
        new THREE.Vector3(ARENA_WIDTH / 2, 20, -RIVER_HALF_WIDTH)
      ),
      river: new THREE.Box3(
        new THREE.Vector3(-ARENA_WIDTH / 2, -1, -RIVER_HALF_WIDTH),
        new THREE.Vector3(ARENA_WIDTH / 2, 1, RIVER_HALF_WIDTH)
      ),
      leftBridge: new THREE.Box3(
        new THREE.Vector3(BRIDGE_X_LEFT - BRIDGE_WIDTH / 2, 0, -RIVER_HALF_WIDTH - 1),
        new THREE.Vector3(BRIDGE_X_LEFT + BRIDGE_WIDTH / 2, 1, RIVER_HALF_WIDTH + 1)
      ),
      rightBridge: new THREE.Box3(
        new THREE.Vector3(BRIDGE_X_RIGHT - BRIDGE_WIDTH / 2, 0, -RIVER_HALF_WIDTH - 1),
        new THREE.Vector3(BRIDGE_X_RIGHT + BRIDGE_WIDTH / 2, 1, RIVER_HALF_WIDTH + 1)
      ),
      bounds: new THREE.Box3(
        new THREE.Vector3(-ARENA_WIDTH / 2, -5, -ARENA_DEPTH / 2),
        new THREE.Vector3(ARENA_WIDTH / 2, 30, ARENA_DEPTH / 2)
      ),
    };

    this.setupLighting();
    this.setupFallbackGround();
  }

  private setupLighting(): void {
    // Warm sunlight for Clash Royale aesthetic
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.5);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
    sunLight.position.set(10, 25, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    this.scene.add(sunLight);

    // Slight blue fill from below
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.2);
    fillLight.position.set(-5, -3, -10);
    this.scene.add(fillLight);

    // Hemisphere sky/ground
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.3);
    this.scene.add(hemiLight);

    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);
  }

  private setupFallbackGround(): void {
    // Fallback ground in case GLTF takes time to load
    const groundGeo = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_DEPTH);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5a8c3a,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'fallback_ground';
    this.scene.add(ground);

    // River plane
    const riverGeo = new THREE.PlaneGeometry(ARENA_WIDTH, RIVER_HALF_WIDTH * 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x2a6a9a,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.05, RIVER_Z);
    river.name = 'river';
    this.scene.add(river);

    // Bridges
    for (const bx of [BRIDGE_X_LEFT, BRIDGE_X_RIGHT]) {
      const bridgeGeo = new THREE.BoxGeometry(BRIDGE_WIDTH, 0.3, RIVER_HALF_WIDTH * 2 + 2);
      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.position.set(bx, 0.15, RIVER_Z);
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      bridge.name = `bridge_${bx > 0 ? 'right' : 'left'}`;
      this.scene.add(bridge);
    }

    // Territory divider lines
    const lineGeo = new THREE.PlaneGeometry(ARENA_WIDTH, 0.1);

    const playerLineMat = new THREE.MeshBasicMaterial({ color: 0x3366ff, transparent: true, opacity: 0.3 });
    const playerLine = new THREE.Mesh(lineGeo, playerLineMat);
    playerLine.rotation.x = -Math.PI / 2;
    playerLine.position.set(0, 0.06, RIVER_HALF_WIDTH + 0.5);
    this.scene.add(playerLine);

    const enemyLineMat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.3 });
    const enemyLine = new THREE.Mesh(lineGeo, enemyLineMat);
    enemyLine.rotation.x = -Math.PI / 2;
    enemyLine.position.set(0, 0.06, -RIVER_HALF_WIDTH - 0.5);
    this.scene.add(enemyLine);
  }

  async loadEnvironment(url: string = '/models/crown-clash/environment/scene.gltf'): Promise<void> {
    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      this.environmentGroup = gltf.scene;

      // Scale and position environment to fit arena
      const box = new THREE.Box3().setFromObject(this.environmentGroup);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.z);
      const scale = ARENA_WIDTH / maxDim;
      this.environmentGroup.scale.setScalar(scale);
      
      // Center it
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      this.environmentGroup.position.sub(center);
      this.environmentGroup.position.y = 0;

      // Enable shadows
      this.environmentGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove fallback ground since we have the real environment
      const fallback = this.scene.getObjectByName('fallback_ground');
      if (fallback) this.scene.remove(fallback);

      this.scene.add(this.environmentGroup);
      console.log('[CrownClashScene] Environment loaded');
    } catch (err) {
      console.warn('[CrownClashScene] Failed to load environment GLTF, using fallback:', err);
    }
  }

  isOnBridge(position: THREE.Vector3): boolean {
    return this.zones.leftBridge.containsPoint(position) || this.zones.rightBridge.containsPoint(position);
  }

  isInRiver(position: THREE.Vector3): boolean {
    return this.zones.river.containsPoint(position) && !this.isOnBridge(position);
  }

  getClosestBridge(position: THREE.Vector3): THREE.Vector3 {
    const leftCenter = new THREE.Vector3(BRIDGE_X_LEFT, 0, RIVER_Z);
    const rightCenter = new THREE.Vector3(BRIDGE_X_RIGHT, 0, RIVER_Z);
    return position.distanceTo(leftCenter) < position.distanceTo(rightCenter) ? leftCenter : rightCenter;
  }

  isPlayerTerritory(position: THREE.Vector3): boolean {
    return position.z > RIVER_HALF_WIDTH;
  }

  isEnemyTerritory(position: THREE.Vector3): boolean {
    return position.z < -RIVER_HALF_WIDTH;
  }

  getLane(position: THREE.Vector3): 'left' | 'right' | 'center' {
    if (position.x < -3) return 'left';
    if (position.x > 3) return 'right';
    return 'center';
  }

  dispose(): void {
    if (this.environmentGroup) {
      this.environmentGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }
  }
}

export const ARENA_CONSTANTS = {
  WIDTH: ARENA_WIDTH,
  DEPTH: ARENA_DEPTH,
  RIVER_Z,
  RIVER_HALF_WIDTH,
  BRIDGE_WIDTH,
  BRIDGE_X_LEFT,
  BRIDGE_X_RIGHT,
};
