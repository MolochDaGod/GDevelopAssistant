import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export interface PlayModeConfig {
  moveSpeed: number;
  jumpForce: number;
  gravity: number;
  playerHeight: number;
  mouseSensitivity: number;
}

export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  onGround: boolean;
  health: number;
  canJump: boolean;
}

export class PlayModeController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls | null = null;
  
  private config: PlayModeConfig = {
    moveSpeed: 50,
    jumpForce: 15,
    gravity: 30,
    playerHeight: 1.7,
    mouseSensitivity: 0.002
  };
  
  private playerState: PlayerState = {
    position: new THREE.Vector3(0, 2, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    onGround: false,
    health: 100,
    canJump: true
  };
  
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false
  };
  
  private moveDirection = new THREE.Vector3();
  private isActive = false;
  private raycaster = new THREE.Raycaster();
  private groundObjects: THREE.Object3D[] = [];
  
  private playerMesh: THREE.Mesh | null = null;
  private crosshair: THREE.Sprite | null = null;
  
  private onExitCallback: (() => void) | null = null;
  private onDebugCallback: ((info: any) => void) | null = null;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }
  
  public start(spawnPosition?: THREE.Vector3, onExit?: () => void, onDebug?: (info: any) => void): void {
    if (this.isActive) return;
    
    this.onExitCallback = onExit || null;
    this.onDebugCallback = onDebug || null;
    
    // Set spawn position
    if (spawnPosition) {
      this.playerState.position.copy(spawnPosition);
      this.playerState.position.y += this.config.playerHeight;
    } else {
      this.playerState.position.set(64, this.config.playerHeight + 2, 64);
    }
    
    // Setup pointer lock controls
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    
    // Position camera at player
    this.camera.position.copy(this.playerState.position);
    
    // Collect ground objects for collision
    this.groundObjects = [];
    this.scene.traverse((obj) => {
      if (obj.name === 'ground' || obj.userData.isCollider) {
        this.groundObjects.push(obj);
      }
    });
    
    // Create crosshair
    this.createCrosshair();
    
    // Event listeners
    this.setupEventListeners();
    
    // Lock pointer
    this.controls.lock();
    
    this.isActive = true;
  }
  
  public stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Unlock pointer
    if (this.controls) {
      this.controls.unlock();
      this.controls.dispose();
      this.controls = null;
    }
    
    // Remove crosshair
    if (this.crosshair) {
      this.scene.remove(this.crosshair);
      this.crosshair = null;
    }
    
    // Remove player mesh
    if (this.playerMesh) {
      this.scene.remove(this.playerMesh);
      this.playerMesh = null;
    }
    
    // Reset keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false
    };
    
    // Remove event listeners
    this.removeEventListeners();
  }
  
  public update(delta: number): void {
    if (!this.isActive || !this.controls) return;
    
    // Handle movement
    this.handleMovement(delta);
    
    // Apply gravity
    this.applyGravity(delta);
    
    // Update camera position
    this.camera.position.copy(this.playerState.position);
    
    // Check ground collision
    this.checkGroundCollision();
    
    // Debug info
    if (this.onDebugCallback) {
      this.onDebugCallback({
        fps: Math.round(1 / delta),
        position: {
          x: this.playerState.position.x.toFixed(1),
          y: this.playerState.position.y.toFixed(1),
          z: this.playerState.position.z.toFixed(1)
        },
        velocity: {
          x: this.playerState.velocity.x.toFixed(1),
          y: this.playerState.velocity.y.toFixed(1),
          z: this.playerState.velocity.z.toFixed(1)
        },
        onGround: this.playerState.onGround,
        health: this.playerState.health
      });
    }
  }
  
  public isPlaying(): boolean {
    return this.isActive;
  }
  
  public getPlayerPosition(): THREE.Vector3 {
    return this.playerState.position.clone();
  }
  
  private handleMovement(delta: number): void {
    if (!this.controls) return;
    
    const speed = this.keys.sprint ? this.config.moveSpeed * 1.5 : this.config.moveSpeed;
    
    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    // Get right vector
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    
    // Calculate movement direction
    this.moveDirection.set(0, 0, 0);
    
    if (this.keys.forward) {
      this.moveDirection.add(cameraDirection);
    }
    if (this.keys.backward) {
      this.moveDirection.sub(cameraDirection);
    }
    if (this.keys.right) {
      this.moveDirection.add(rightVector);
    }
    if (this.keys.left) {
      this.moveDirection.sub(rightVector);
    }
    
    if (this.moveDirection.length() > 0) {
      this.moveDirection.normalize();
      this.moveDirection.multiplyScalar(speed * delta);
      
      // Check horizontal collision before applying movement
      const newPosition = this.playerState.position.clone().add(this.moveDirection);
      if (!this.checkHorizontalCollision(newPosition)) {
        this.playerState.position.add(this.moveDirection);
      } else {
        // Try sliding along walls
        const slideX = this.playerState.position.clone();
        slideX.x += this.moveDirection.x;
        if (!this.checkHorizontalCollision(slideX)) {
          this.playerState.position.x = slideX.x;
        }
        
        const slideZ = this.playerState.position.clone();
        slideZ.z += this.moveDirection.z;
        if (!this.checkHorizontalCollision(slideZ)) {
          this.playerState.position.z = slideZ.z;
        }
      }
    }
    
    // Jumping
    if (this.keys.jump && this.playerState.onGround && this.playerState.canJump) {
      this.playerState.velocity.y = this.config.jumpForce;
      this.playerState.onGround = false;
      this.playerState.canJump = false;
    }
    
    // Reset jump ability when key released
    if (!this.keys.jump) {
      this.playerState.canJump = true;
    }
  }
  
  private applyGravity(delta: number): void {
    if (!this.playerState.onGround) {
      this.playerState.velocity.y -= this.config.gravity * delta;
    }
    
    this.playerState.position.y += this.playerState.velocity.y * delta;
    
    // Floor limit
    const floorY = this.config.playerHeight;
    if (this.playerState.position.y < floorY) {
      this.playerState.position.y = floorY;
      this.playerState.velocity.y = 0;
      this.playerState.onGround = true;
    }
  }
  
  private checkGroundCollision(): void {
    // Raycast down to check for ground
    const rayOrigin = this.playerState.position.clone();
    rayOrigin.y += 0.5;
    
    this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = this.config.playerHeight + 0.5;
    
    const intersects = this.raycaster.intersectObjects(this.groundObjects, true);
    
    if (intersects.length > 0) {
      const groundY = intersects[0].point.y + this.config.playerHeight;
      if (this.playerState.position.y <= groundY + 0.1) {
        this.playerState.position.y = groundY;
        if (this.playerState.velocity.y < 0) {
          this.playerState.velocity.y = 0;
        }
        this.playerState.onGround = true;
      }
    }
  }
  
  private checkHorizontalCollision(targetPosition: THREE.Vector3): boolean {
    const playerRadius = 0.5;
    const rayHeight = this.config.playerHeight * 0.5;
    
    // Cast rays in 8 directions at player height
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.707, 0, 0.707),
      new THREE.Vector3(-0.707, 0, 0.707),
      new THREE.Vector3(0.707, 0, -0.707),
      new THREE.Vector3(-0.707, 0, -0.707)
    ];
    
    const rayOrigin = targetPosition.clone();
    rayOrigin.y = this.playerState.position.y - this.config.playerHeight + rayHeight;
    
    for (const dir of directions) {
      this.raycaster.set(rayOrigin, dir);
      this.raycaster.far = playerRadius;
      
      const intersects = this.raycaster.intersectObjects(this.groundObjects, true);
      if (intersects.length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  private createCrosshair(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(32, 20);
      ctx.lineTo(32, 28);
      ctx.moveTo(32, 36);
      ctx.lineTo(32, 44);
      ctx.moveTo(20, 32);
      ctx.lineTo(28, 32);
      ctx.moveTo(36, 32);
      ctx.lineTo(44, 32);
      ctx.stroke();
      
      // Center dot
      ctx.beginPath();
      ctx.arc(32, 32, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8
    });
    
    this.crosshair = new THREE.Sprite(material);
    this.crosshair.scale.set(0.05, 0.05, 1);
    this.crosshair.position.set(0, 0, -0.5);
    this.camera.add(this.crosshair);
    this.scene.add(this.camera);
  }
  
  private onKeyDown = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.jump = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Escape':
        // Exit play mode
        if (this.onExitCallback) {
          this.stop();
          this.onExitCallback();
        }
        break;
    }
  };
  
  private onKeyUp = (event: KeyboardEvent): void => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
    }
  };
  
  private onPointerLockChange = (): void => {
    if (!document.pointerLockElement && this.isActive) {
      // Pointer unlocked - don't auto-exit, just pause controls
    }
  };
  
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }
  
  private removeEventListeners(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
