import * as THREE from 'three';

export interface SelectableEntity {
  id: string;
  mesh: THREE.Object3D;
  team: 'player' | 'enemy' | 'neutral';
  type: 'unit' | 'building' | 'resource';
  position: THREE.Vector3;
  isSelected?: boolean;
}

export interface SelectionBoxStyle {
  borderColor: string;
  fillColor: string;
  borderWidth: number;
}

export interface RTSMouseControllerConfig {
  camera: THREE.Camera;
  scene: THREE.Scene;
  domElement: HTMLElement;
  groundPlane?: THREE.Plane;
  selectionBoxStyle?: SelectionBoxStyle;
  onSelect?: (entities: SelectableEntity[]) => void;
  onDeselect?: () => void;
  onMoveCommand?: (position: THREE.Vector3, entities: SelectableEntity[]) => void;
  onAttackCommand?: (target: SelectableEntity, attackers: SelectableEntity[]) => void;
  onGatherCommand?: (resource: SelectableEntity, gatherers: SelectableEntity[]) => void;
}

const DEFAULT_SELECTION_STYLE: SelectionBoxStyle = {
  borderColor: '#22c55e',
  fillColor: 'rgba(34, 197, 94, 0.15)',
  borderWidth: 2
};

export class RTSMouseController {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;
  private groundPlane: THREE.Plane;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectionStyle: SelectionBoxStyle;
  
  private entities: Map<string, SelectableEntity> = new Map();
  private selectedEntities: SelectableEntity[] = [];
  
  private isSelecting: boolean = false;
  private selectionStart: THREE.Vector2 = new THREE.Vector2();
  private selectionEnd: THREE.Vector2 = new THREE.Vector2();
  private selectionBox: HTMLDivElement | null = null;
  
  private onSelect?: (entities: SelectableEntity[]) => void;
  private onDeselect?: () => void;
  private onMoveCommand?: (position: THREE.Vector3, entities: SelectableEntity[]) => void;
  private onAttackCommand?: (target: SelectableEntity, attackers: SelectableEntity[]) => void;
  private onGatherCommand?: (resource: SelectableEntity, gatherers: SelectableEntity[]) => void;
  
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnContextMenu: (e: MouseEvent) => void;

  constructor(config: RTSMouseControllerConfig) {
    this.camera = config.camera;
    this.scene = config.scene;
    this.domElement = config.domElement;
    this.groundPlane = config.groundPlane ?? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.selectionStyle = config.selectionBoxStyle ?? DEFAULT_SELECTION_STYLE;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.onSelect = config.onSelect;
    this.onDeselect = config.onDeselect;
    this.onMoveCommand = config.onMoveCommand;
    this.onAttackCommand = config.onAttackCommand;
    this.onGatherCommand = config.onGatherCommand;
    
    this.boundOnMouseDown = this.handleMouseDown.bind(this);
    this.boundOnMouseMove = this.handleMouseMove.bind(this);
    this.boundOnMouseUp = this.handleMouseUp.bind(this);
    this.boundOnContextMenu = this.handleContextMenu.bind(this);
    
    this.createSelectionBox();
    this.attach();
  }

  private createSelectionBox(): void {
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'absolute';
    this.selectionBox.style.border = `${this.selectionStyle.borderWidth}px solid ${this.selectionStyle.borderColor}`;
    this.selectionBox.style.backgroundColor = this.selectionStyle.fillColor;
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.display = 'none';
    this.selectionBox.style.zIndex = '1000';
    this.domElement.style.position = 'relative';
    this.domElement.appendChild(this.selectionBox);
  }

  attach(): void {
    this.domElement.addEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.addEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.addEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.addEventListener('contextmenu', this.boundOnContextMenu);
  }

  detach(): void {
    this.domElement.removeEventListener('mousedown', this.boundOnMouseDown);
    this.domElement.removeEventListener('mousemove', this.boundOnMouseMove);
    this.domElement.removeEventListener('mouseup', this.boundOnMouseUp);
    this.domElement.removeEventListener('contextmenu', this.boundOnContextMenu);
    
    if (this.selectionBox && this.selectionBox.parentNode) {
      this.selectionBox.parentNode.removeChild(this.selectionBox);
    }
  }

  registerEntity(entity: SelectableEntity): void {
    this.entities.set(entity.id, entity);
  }

  unregisterEntity(id: string): void {
    this.entities.delete(id);
    this.selectedEntities = this.selectedEntities.filter(e => e.id !== id);
  }

  clearEntities(): void {
    this.entities.clear();
    this.selectedEntities = [];
  }

  getSelectedEntities(): SelectableEntity[] {
    return [...this.selectedEntities];
  }

  private getMousePosition(event: MouseEvent): THREE.Vector2 {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private getScreenPosition(event: MouseEvent): THREE.Vector2 {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
  }

  private raycastEntities(mousePos: THREE.Vector2): SelectableEntity | null {
    this.raycaster.setFromCamera(mousePos, this.camera);
    
    const meshes: THREE.Object3D[] = [];
    const meshToEntity = new Map<THREE.Object3D, SelectableEntity>();
    
    const entityArray = Array.from(this.entities.values());
    for (const entity of entityArray) {
      entity.mesh.traverse((child: THREE.Object3D) => {
        meshes.push(child);
        meshToEntity.set(child, entity);
      });
    }
    
    const intersects = this.raycaster.intersectObjects(meshes, false);
    
    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      return meshToEntity.get(hitObject) ?? null;
    }
    
    return null;
  }

  private getGroundPosition(mousePos: THREE.Vector2): THREE.Vector3 | null {
    this.raycaster.setFromCamera(mousePos, this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return hit ? target : null;
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      const screenPos = this.getScreenPosition(event);
      this.isSelecting = true;
      this.selectionStart.copy(screenPos);
      this.selectionEnd.copy(screenPos);
      
      if (this.selectionBox) {
        this.selectionBox.style.display = 'block';
        this.updateSelectionBox();
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isSelecting) {
      const screenPos = this.getScreenPosition(event);
      this.selectionEnd.copy(screenPos);
      this.updateSelectionBox();
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button === 0 && this.isSelecting) {
      this.isSelecting = false;
      
      if (this.selectionBox) {
        this.selectionBox.style.display = 'none';
      }
      
      const dragDistance = this.selectionStart.distanceTo(this.selectionEnd);
      
      if (dragDistance < 5) {
        const mousePos = this.getMousePosition(event);
        const clicked = this.raycastEntities(mousePos);
        
        if (clicked && clicked.team === 'player') {
          this.selectEntities([clicked]);
        } else {
          this.deselectAll();
        }
      } else {
        const selected = this.getEntitiesInSelectionBox();
        if (selected.length > 0) {
          this.selectEntities(selected);
        } else {
          this.deselectAll();
        }
      }
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    
    if (this.selectedEntities.length === 0) return;
    
    const mousePos = this.getMousePosition(event);
    const target = this.raycastEntities(mousePos);
    
    if (target) {
      if (target.team === 'enemy') {
        this.onAttackCommand?.(target, this.selectedEntities);
        this.showAttackIndicator(target.position);
      } else if (target.type === 'resource') {
        this.onGatherCommand?.(target, this.selectedEntities);
        this.showGatherIndicator(target.position);
      } else {
        const groundPos = this.getGroundPosition(mousePos);
        if (groundPos) {
          this.onMoveCommand?.(groundPos, this.selectedEntities);
          this.showMoveIndicator(groundPos);
        }
      }
    } else {
      const groundPos = this.getGroundPosition(mousePos);
      if (groundPos) {
        this.onMoveCommand?.(groundPos, this.selectedEntities);
        this.showMoveIndicator(groundPos);
      }
    }
  }

  private updateSelectionBox(): void {
    if (!this.selectionBox) return;
    
    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
    
    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  private getEntitiesInSelectionBox(): SelectableEntity[] {
    const selected: SelectableEntity[] = [];
    const rect = this.domElement.getBoundingClientRect();
    
    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const right = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const bottom = Math.max(this.selectionStart.y, this.selectionEnd.y);
    
    const allEntities = Array.from(this.entities.values());
    for (const entity of allEntities) {
      if (entity.team !== 'player') continue;
      
      const screenPos = entity.position.clone().project(this.camera);
      const x = (screenPos.x + 1) / 2 * rect.width;
      const y = (-screenPos.y + 1) / 2 * rect.height;
      
      if (x >= left && x <= right && y >= top && y <= bottom) {
        selected.push(entity);
      }
    }
    
    return selected;
  }

  private selectEntities(entities: SelectableEntity[]): void {
    for (const entity of this.selectedEntities) {
      entity.isSelected = false;
      this.updateEntityVisual(entity, false);
    }
    
    this.selectedEntities = entities.filter(e => e.team === 'player');
    
    for (const entity of this.selectedEntities) {
      entity.isSelected = true;
      this.updateEntityVisual(entity, true);
    }
    
    this.onSelect?.(this.selectedEntities);
  }

  private deselectAll(): void {
    for (const entity of this.selectedEntities) {
      entity.isSelected = false;
      this.updateEntityVisual(entity, false);
    }
    this.selectedEntities = [];
    this.onDeselect?.();
  }

  private updateEntityVisual(entity: SelectableEntity, selected: boolean): void {
    const selectionRing = entity.mesh.getObjectByName('selectionRing');
    if (selectionRing) {
      selectionRing.visible = selected;
    }
  }

  private showMoveIndicator(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.3, 0.5, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x22c55e, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    
    let scale = 1;
    const animate = () => {
      scale -= 0.02;
      if (scale <= 0) {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
        return;
      }
      ring.scale.set(scale, scale, scale);
      material.opacity = scale * 0.8;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private showAttackIndicator(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.3, 0.5, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xdc2626, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    
    let scale = 1;
    const animate = () => {
      scale -= 0.03;
      if (scale <= 0) {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
        return;
      }
      ring.scale.set(scale, scale, scale);
      material.opacity = scale * 0.8;
      requestAnimationFrame(animate);
    };
    animate();
  }

  private showGatherIndicator(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.3, 0.5, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xfbbf24, 
      transparent: true, 
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    
    let scale = 1;
    const animate = () => {
      scale -= 0.025;
      if (scale <= 0) {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
        return;
      }
      ring.scale.set(scale, scale, scale);
      material.opacity = scale * 0.8;
      requestAnimationFrame(animate);
    };
    animate();
  }
}

export function createSelectionRing(radius: number = 0.5, color: number = 0x22c55e): THREE.Object3D {
  const geometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color, 
    transparent: true, 
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.name = 'selectionRing';
  ring.visible = false;
  return ring;
}
