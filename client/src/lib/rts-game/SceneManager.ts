import * as THREE from 'three';
import { AnimationLibrary } from '../rts-animation/AnimationLibrary';
import { RTSMouseController, SelectableEntity, createSelectionRing } from '../rts-input/RTSMouseController';
import { CollisionDetector, ProjectileManager } from '../rts-input/CollisionDetection';

export interface DynamicSubject {
  update(deltaTime: number): void;
  dispose?(): void;
}

export interface SceneManagerConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  animationLibraryUrl?: string;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  
  private container: HTMLElement;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private dynamicSubjects: DynamicSubject[] = [];
  private keyMap: Map<number, boolean> = new Map();
  
  animationLibrary: AnimationLibrary;
  mouseController: RTSMouseController | null = null;
  collisionDetector: CollisionDetector;
  projectileManager: ProjectileManager;
  
  private onUpdate?: (deltaTime: number) => void;
  private onKeyInput?: (keyMap: Map<number, boolean>) => void;

  constructor(config: SceneManagerConfig) {
    this.container = config.container;
    const width = config.width ?? config.container.clientWidth;
    const height = config.height ?? config.container.clientHeight;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 20, 20);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    this.clock = new THREE.Clock();
    
    this.animationLibrary = new AnimationLibrary();
    this.collisionDetector = new CollisionDetector(this.scene);
    this.projectileManager = new ProjectileManager(this.scene, this.collisionDetector);
    
    this.setupLighting();
    this.bindEventListeners();
    
    if (config.animationLibraryUrl) {
      this.loadAnimationLibrary(config.animationLibraryUrl);
    }
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
  }

  private bindEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keyMap.set(event.keyCode, true);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keyMap.set(event.keyCode, false);
  };

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    
    this.renderer.setSize(width, height);
  };

  async loadAnimationLibrary(url: string): Promise<void> {
    await this.animationLibrary.loadFromGLB(url);
    console.log('Animation library loaded:', this.animationLibrary.getAvailableAnimations());
  }

  enableMouseController(config?: {
    onSelect?: (entities: SelectableEntity[]) => void;
    onMoveCommand?: (position: THREE.Vector3, entities: SelectableEntity[]) => void;
    onAttackCommand?: (target: SelectableEntity, attackers: SelectableEntity[]) => void;
  }): void {
    this.mouseController = new RTSMouseController({
      camera: this.camera,
      scene: this.scene,
      domElement: this.renderer.domElement,
      onSelect: config?.onSelect,
      onMoveCommand: config?.onMoveCommand,
      onAttackCommand: config?.onAttackCommand
    });
  }

  addDynamicSubject(subject: DynamicSubject): void {
    this.dynamicSubjects.push(subject);
  }

  removeDynamicSubject(subject: DynamicSubject): void {
    const index = this.dynamicSubjects.indexOf(subject);
    if (index > -1) {
      this.dynamicSubjects.splice(index, 1);
      subject.dispose?.();
    }
  }

  setOnUpdate(callback: (deltaTime: number) => void): void {
    this.onUpdate = callback;
  }

  setOnKeyInput(callback: (keyMap: Map<number, boolean>) => void): void {
    this.onKeyInput = callback;
  }

  private update = (): void => {
    const deltaTime = this.clock.getDelta();
    
    this.onKeyInput?.(this.keyMap);
    
    for (const subject of this.dynamicSubjects) {
      subject.update(deltaTime);
    }
    
    this.animationLibrary.update(deltaTime);
    this.projectileManager.update(deltaTime);
    
    this.onUpdate?.(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.update);
  };

  start(): void {
    if (!this.animationId) {
      this.clock.start();
      this.update();
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stop();
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    
    this.mouseController?.detach();
    
    for (const subject of this.dynamicSubjects) {
      subject.dispose?.();
    }
    this.dynamicSubjects = [];
    
    this.projectileManager.clear();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  createGroundPlane(size: number = 50, color: number = 0x2d5a27): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({ 
      color, 
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    return ground;
  }

  createCharacter(
    id: string,
    mesh: THREE.Object3D,
    team: 'player' | 'enemy' | 'neutral' = 'player'
  ): SelectableEntity {
    const selectionRing = createSelectionRing(0.8, team === 'player' ? 0x22c55e : 0xdc2626);
    mesh.add(selectionRing);
    
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    this.scene.add(mesh);
    
    this.animationLibrary.registerCharacter(id, mesh);
    
    const entity: SelectableEntity = {
      id,
      mesh,
      team,
      type: 'unit',
      position: mesh.position
    };
    
    this.mouseController?.registerEntity(entity);
    this.collisionDetector.registerTarget({
      id,
      mesh,
      position: mesh.position,
      radius: 0.5
    });
    
    return entity;
  }
}

export function createSceneManager(config: SceneManagerConfig): SceneManager {
  return new SceneManager(config);
}
