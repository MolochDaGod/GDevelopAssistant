import * as THREE from 'three';

export interface RTSCameraConfig {
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  panSpeed: number;
  rotationSpeed: number;
  smoothing: number;
  minPitch: number;
  maxPitch: number;
  initialPosition: THREE.Vector3;
  initialTarget: THREE.Vector3;
  bounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  edgePanEnabled: boolean;
  edgePanMargin: number;
  edgePanSpeed: number;
}

export const RTSCameraPresets = {
  classic: (): Partial<RTSCameraConfig> => ({
    minZoom: 10,
    maxZoom: 100,
    zoomSpeed: 5,
    panSpeed: 0.5,
    rotationSpeed: 0.3,
    smoothing: 0.1,
    minPitch: 30,
    maxPitch: 80,
    initialPosition: new THREE.Vector3(0, 40, 40),
    initialTarget: new THREE.Vector3(0, 0, 0),
    edgePanEnabled: true,
    edgePanMargin: 30,
    edgePanSpeed: 30
  }),
  
  closeUp: (): Partial<RTSCameraConfig> => ({
    minZoom: 5,
    maxZoom: 50,
    zoomSpeed: 3,
    panSpeed: 0.3,
    rotationSpeed: 0.2,
    smoothing: 0.15,
    minPitch: 20,
    maxPitch: 60,
    initialPosition: new THREE.Vector3(0, 20, 20),
    initialTarget: new THREE.Vector3(0, 0, 0),
    edgePanEnabled: true,
    edgePanMargin: 40,
    edgePanSpeed: 20
  }),
  
  strategic: (): Partial<RTSCameraConfig> => ({
    minZoom: 30,
    maxZoom: 200,
    zoomSpeed: 10,
    panSpeed: 1,
    rotationSpeed: 0.5,
    smoothing: 0.05,
    minPitch: 45,
    maxPitch: 90,
    initialPosition: new THREE.Vector3(0, 80, 80),
    initialTarget: new THREE.Vector3(0, 0, 0),
    edgePanEnabled: true,
    edgePanMargin: 20,
    edgePanSpeed: 50
  }),
  
  isometric: (): Partial<RTSCameraConfig> => ({
    minZoom: 15,
    maxZoom: 80,
    zoomSpeed: 4,
    panSpeed: 0.4,
    rotationSpeed: 0,
    smoothing: 0.08,
    minPitch: 45,
    maxPitch: 45,
    initialPosition: new THREE.Vector3(30, 30, 30),
    initialTarget: new THREE.Vector3(0, 0, 0),
    edgePanEnabled: true,
    edgePanMargin: 25,
    edgePanSpeed: 25
  }),
  
  grudgeBrawl: (): Partial<RTSCameraConfig> => ({
    minZoom: 8,
    maxZoom: 60,
    zoomSpeed: 4,
    panSpeed: 0.4,
    rotationSpeed: 0.25,
    smoothing: 0.12,
    minPitch: 25,
    maxPitch: 70,
    initialPosition: new THREE.Vector3(0, 35, 35),
    initialTarget: new THREE.Vector3(0, 0, 0),
    edgePanEnabled: true,
    edgePanMargin: 35,
    edgePanSpeed: 35
  })
};

export class RTSCamera {
  private camera: THREE.PerspectiveCamera;
  private config: RTSCameraConfig;
  
  private targetPosition: THREE.Vector3;
  private currentPosition: THREE.Vector3;
  private targetLookAt: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  
  private zoom: number;
  private targetZoom: number;
  private pitch: number;
  private yaw: number;
  
  private isDragging: boolean = false;
  private isRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  
  private keysPressed: Set<string> = new Set();
  private container: HTMLElement | null = null;

  constructor(camera: THREE.PerspectiveCamera, config: Partial<RTSCameraConfig> = {}) {
    this.camera = camera;
    
    const defaultConfig: RTSCameraConfig = {
      minZoom: 10,
      maxZoom: 100,
      zoomSpeed: 5,
      panSpeed: 0.5,
      rotationSpeed: 0.3,
      smoothing: 0.1,
      minPitch: 30,
      maxPitch: 80,
      initialPosition: new THREE.Vector3(0, 40, 40),
      initialTarget: new THREE.Vector3(0, 0, 0),
      edgePanEnabled: true,
      edgePanMargin: 30,
      edgePanSpeed: 30
    };
    
    this.config = { ...defaultConfig, ...config };
    
    this.currentPosition = this.config.initialPosition.clone();
    this.targetPosition = this.config.initialPosition.clone();
    this.currentLookAt = this.config.initialTarget.clone();
    this.targetLookAt = this.config.initialTarget.clone();
    
    this.zoom = this.currentPosition.distanceTo(this.currentLookAt);
    this.targetZoom = this.zoom;
    
    const direction = new THREE.Vector3().subVectors(this.currentPosition, this.currentLookAt);
    this.pitch = Math.asin(direction.y / direction.length()) * (180 / Math.PI);
    this.yaw = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
    
    this.updateCameraPosition();
  }

  attach(container: HTMLElement): void {
    this.container = container;
    
    container.addEventListener('wheel', this.handleWheel);
    container.addEventListener('mousedown', this.handleMouseDown);
    container.addEventListener('mousemove', this.handleMouseMove);
    container.addEventListener('mouseup', this.handleMouseUp);
    container.addEventListener('mouseleave', this.handleMouseUp);
    container.addEventListener('contextmenu', (e) => e.preventDefault());
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach(): void {
    if (this.container) {
      this.container.removeEventListener('wheel', this.handleWheel);
      this.container.removeEventListener('mousedown', this.handleMouseDown);
      this.container.removeEventListener('mousemove', this.handleMouseMove);
      this.container.removeEventListener('mouseup', this.handleMouseUp);
      this.container.removeEventListener('mouseleave', this.handleMouseUp);
    }
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    this.container = null;
  }

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.targetZoom = THREE.MathUtils.clamp(
      this.targetZoom + delta * this.config.zoomSpeed,
      this.config.minZoom,
      this.config.maxZoom
    );
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (e.button === 2 || (e.button === 0 && e.altKey)) {
      this.isRotating = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    if (this.isDragging) {
      const panX = -deltaX * this.config.panSpeed * (this.zoom / 50);
      const panZ = -deltaY * this.config.panSpeed * (this.zoom / 50);
      
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.yaw * (Math.PI / 180)
      );
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.yaw * (Math.PI / 180)
      );
      
      this.targetLookAt.add(right.multiplyScalar(panX));
      this.targetLookAt.add(forward.multiplyScalar(panZ));
      
      this.applyBounds();
    }
    
    if (this.isRotating && this.config.rotationSpeed > 0) {
      this.yaw += deltaX * this.config.rotationSpeed;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - deltaY * this.config.rotationSpeed,
        this.config.minPitch,
        this.config.maxPitch
      );
    }
    
    if (this.config.edgePanEnabled && !this.isDragging && !this.isRotating && this.container) {
      const rect = this.container.getBoundingClientRect();
      const margin = this.config.edgePanMargin;
      
      if (e.clientX < rect.left + margin) {
        this.keysPressed.add('EdgeLeft');
      } else {
        this.keysPressed.delete('EdgeLeft');
      }
      
      if (e.clientX > rect.right - margin) {
        this.keysPressed.add('EdgeRight');
      } else {
        this.keysPressed.delete('EdgeRight');
      }
      
      if (e.clientY < rect.top + margin) {
        this.keysPressed.add('EdgeUp');
      } else {
        this.keysPressed.delete('EdgeUp');
      }
      
      if (e.clientY > rect.bottom - margin) {
        this.keysPressed.add('EdgeDown');
      } else {
        this.keysPressed.delete('EdgeDown');
      }
    }
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleMouseUp = (): void => {
    this.isDragging = false;
    this.isRotating = false;
    this.keysPressed.delete('EdgeLeft');
    this.keysPressed.delete('EdgeRight');
    this.keysPressed.delete('EdgeUp');
    this.keysPressed.delete('EdgeDown');
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keysPressed.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
  };

  private applyBounds(): void {
    if (this.config.bounds) {
      this.targetLookAt.x = THREE.MathUtils.clamp(
        this.targetLookAt.x,
        this.config.bounds.minX,
        this.config.bounds.maxX
      );
      this.targetLookAt.z = THREE.MathUtils.clamp(
        this.targetLookAt.z,
        this.config.bounds.minZ,
        this.config.bounds.maxZ
      );
    }
  }

  private updateCameraPosition(): void {
    const pitchRad = this.pitch * (Math.PI / 180);
    const yawRad = this.yaw * (Math.PI / 180);
    
    const x = this.zoom * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = this.zoom * Math.sin(pitchRad);
    const z = this.zoom * Math.cos(pitchRad) * Math.cos(yawRad);
    
    this.targetPosition.set(
      this.targetLookAt.x + x,
      this.targetLookAt.y + y,
      this.targetLookAt.z + z
    );
  }

  update(deltaTime: number): void {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw * (Math.PI / 180)
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw * (Math.PI / 180)
    );
    
    const panSpeed = this.config.panSpeed * (this.zoom / 30) * deltaTime * 60;
    const edgePanSpeed = this.config.edgePanSpeed * deltaTime;
    
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp') || this.keysPressed.has('EdgeUp')) {
      const speed = this.keysPressed.has('EdgeUp') ? edgePanSpeed : panSpeed;
      this.targetLookAt.add(forward.clone().multiplyScalar(speed));
    }
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown') || this.keysPressed.has('EdgeDown')) {
      const speed = this.keysPressed.has('EdgeDown') ? edgePanSpeed : panSpeed;
      this.targetLookAt.add(forward.clone().multiplyScalar(-speed));
    }
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft') || this.keysPressed.has('EdgeLeft')) {
      const speed = this.keysPressed.has('EdgeLeft') ? edgePanSpeed : panSpeed;
      this.targetLookAt.add(right.clone().multiplyScalar(-speed));
    }
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight') || this.keysPressed.has('EdgeRight')) {
      const speed = this.keysPressed.has('EdgeRight') ? edgePanSpeed : panSpeed;
      this.targetLookAt.add(right.clone().multiplyScalar(speed));
    }
    
    if (this.keysPressed.has('KeyQ')) {
      this.yaw -= this.config.rotationSpeed * deltaTime * 60;
    }
    if (this.keysPressed.has('KeyE')) {
      this.yaw += this.config.rotationSpeed * deltaTime * 60;
    }
    
    this.applyBounds();
    
    this.zoom = THREE.MathUtils.lerp(this.zoom, this.targetZoom, this.config.smoothing);
    
    this.updateCameraPosition();
    
    this.currentPosition.lerp(this.targetPosition, this.config.smoothing);
    this.currentLookAt.lerp(this.targetLookAt, this.config.smoothing);
    
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  focusOn(target: THREE.Vector3, instant: boolean = false): void {
    this.targetLookAt.copy(target);
    
    if (instant) {
      this.currentLookAt.copy(target);
      this.updateCameraPosition();
      this.currentPosition.copy(this.targetPosition);
      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookAt);
    }
  }

  setZoom(zoom: number, instant: boolean = false): void {
    this.targetZoom = THREE.MathUtils.clamp(zoom, this.config.minZoom, this.config.maxZoom);
    
    if (instant) {
      this.zoom = this.targetZoom;
      this.updateCameraPosition();
      this.currentPosition.copy(this.targetPosition);
      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookAt);
    }
  }

  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.config.bounds = { minX, maxX, minZ, maxZ };
    this.applyBounds();
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  getLookAt(): THREE.Vector3 {
    return this.currentLookAt.clone();
  }

  getZoom(): number {
    return this.zoom;
  }

  getPitch(): number {
    return this.pitch;
  }

  getYaw(): number {
    return this.yaw;
  }

  screenToWorld(screenX: number, screenY: number): THREE.Vector3 | null {
    if (!this.container) return null;
    
    const rect = this.container.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    
    return null;
  }
}
