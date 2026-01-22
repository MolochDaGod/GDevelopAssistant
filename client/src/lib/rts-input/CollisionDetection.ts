import * as THREE from 'three';

export interface CollisionTarget {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  radius: number;
}

export interface RaycastHitResult {
  hit: boolean;
  target: CollisionTarget | null;
  point: THREE.Vector3 | null;
  distance: number;
  normal: THREE.Vector3 | null;
}

export interface ProjectileConfig {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  maxDistance: number;
  radius?: number;
}

export class CollisionDetector {
  private raycaster: THREE.Raycaster;
  private targets: Map<string, CollisionTarget> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
  }

  registerTarget(target: CollisionTarget): void {
    this.targets.set(target.id, target);
  }

  unregisterTarget(id: string): void {
    this.targets.delete(id);
  }

  clearTargets(): void {
    this.targets.clear();
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 100): RaycastHitResult {
    this.raycaster.set(origin, direction.normalize());
    this.raycaster.far = maxDistance;
    
    const meshes: THREE.Object3D[] = [];
    const meshToTarget = new Map<THREE.Object3D, CollisionTarget>();
    
    const targetArray = Array.from(this.targets.values());
    for (const target of targetArray) {
      meshes.push(target.mesh);
      meshToTarget.set(target.mesh, target);
      target.mesh.traverse((child: THREE.Object3D) => {
        meshToTarget.set(child, target);
      });
    }
    
    const intersects = this.raycaster.intersectObjects(meshes, true);
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      let obj = intersection.object;
      while (obj && !meshToTarget.has(obj)) {
        obj = obj.parent as THREE.Object3D;
      }
      const target = meshToTarget.get(obj) ?? null;
      
      return {
        hit: true,
        target,
        point: intersection.point,
        distance: intersection.distance,
        normal: intersection.face?.normal ?? null
      };
    }
    
    return {
      hit: false,
      target: null,
      point: null,
      distance: maxDistance,
      normal: null
    };
  }

  sphereCast(origin: THREE.Vector3, direction: THREE.Vector3, radius: number, maxDistance: number = 100): RaycastHitResult {
    const targetArray = Array.from(this.targets.values());
    let closestHit: RaycastHitResult = {
      hit: false,
      target: null,
      point: null,
      distance: maxDistance,
      normal: null
    };
    
    const ray = new THREE.Ray(origin, direction.normalize());
    
    for (const target of targetArray) {
      const sphere = new THREE.Sphere(target.position, target.radius + radius);
      const intersectionPoint = new THREE.Vector3();
      
      if (ray.intersectSphere(sphere, intersectionPoint)) {
        const distance = origin.distanceTo(intersectionPoint);
        
        if (distance < maxDistance && distance < closestHit.distance) {
          closestHit = {
            hit: true,
            target,
            point: intersectionPoint,
            distance,
            normal: intersectionPoint.clone().sub(target.position).normalize()
          };
        }
      }
    }
    
    return closestHit;
  }

  checkCollisionWithVertices(mesh: THREE.Mesh, targetMeshes: THREE.Object3D[]): CollisionTarget | null {
    const vertices = this.getMeshVertices(mesh);
    const origin = mesh.position.clone();
    
    for (const vertex of vertices) {
      const direction = vertex.clone().sub(origin).normalize();
      const distance = vertex.distanceTo(origin);
      
      this.raycaster.set(origin, direction);
      this.raycaster.far = distance;
      
      const intersects = this.raycaster.intersectObjects(targetMeshes, true);
      
      if (intersects.length > 0 && intersects[0].distance < distance) {
        const targetArray = Array.from(this.targets.values());
        for (const target of targetArray) {
          if (this.isChildOf(intersects[0].object, target.mesh)) {
            return target;
          }
        }
      }
    }
    
    return null;
  }

  private getMeshVertices(mesh: THREE.Mesh): THREE.Vector3[] {
    const vertices: THREE.Vector3[] = [];
    const geometry = mesh.geometry;
    
    if (geometry instanceof THREE.BufferGeometry) {
      const positions = geometry.attributes.position;
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const vertex = new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
          );
          vertex.applyMatrix4(mesh.matrixWorld);
          vertices.push(vertex);
        }
      }
    }
    
    return vertices;
  }

  private isChildOf(child: THREE.Object3D, parent: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = child;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  checkSphereCollision(sphere1Pos: THREE.Vector3, radius1: number, sphere2Pos: THREE.Vector3, radius2: number): boolean {
    const distance = sphere1Pos.distanceTo(sphere2Pos);
    return distance < (radius1 + radius2);
  }

  checkAABBCollision(box1: THREE.Box3, box2: THREE.Box3): boolean {
    return box1.intersectsBox(box2);
  }

  findNearestTarget(position: THREE.Vector3, excludeId?: string): CollisionTarget | null {
    let nearest: CollisionTarget | null = null;
    let nearestDistance = Infinity;
    
    const targetArray = Array.from(this.targets.values());
    for (const target of targetArray) {
      if (excludeId && target.id === excludeId) continue;
      
      const distance = position.distanceTo(target.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = target;
      }
    }
    
    return nearest;
  }

  findTargetsInRange(position: THREE.Vector3, range: number, excludeId?: string): CollisionTarget[] {
    const inRange: CollisionTarget[] = [];
    
    const targetArray = Array.from(this.targets.values());
    for (const target of targetArray) {
      if (excludeId && target.id === excludeId) continue;
      
      const distance = position.distanceTo(target.position);
      if (distance <= range) {
        inRange.push(target);
      }
    }
    
    return inRange;
  }
}

export class Projectile {
  id: string;
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  maxDistance: number;
  radius: number;
  distanceTraveled: number = 0;
  isActive: boolean = true;
  
  private scene: THREE.Scene;
  private onHit?: (target: CollisionTarget, point: THREE.Vector3) => void;
  private onMiss?: () => void;

  constructor(
    scene: THREE.Scene,
    config: ProjectileConfig,
    onHit?: (target: CollisionTarget, point: THREE.Vector3) => void,
    onMiss?: () => void
  ) {
    this.id = `projectile_${Date.now()}_${Math.random()}`;
    this.scene = scene;
    this.origin = config.origin.clone();
    this.direction = config.direction.normalize();
    this.speed = config.speed;
    this.maxDistance = config.maxDistance;
    this.radius = config.radius ?? 0.1;
    this.onHit = onHit;
    this.onMiss = onMiss;
    
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.origin);
    this.scene.add(this.mesh);
  }

  update(deltaTime: number, collisionDetector: CollisionDetector): boolean {
    if (!this.isActive) return false;
    
    const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
    this.mesh.position.add(movement);
    this.distanceTraveled += movement.length();
    
    const hitResult = collisionDetector.sphereCast(
      this.mesh.position,
      this.direction,
      this.radius,
      this.speed * deltaTime * 2
    );
    
    if (hitResult.hit && hitResult.target && hitResult.point) {
      this.onHit?.(hitResult.target, hitResult.point);
      this.destroy();
      return true;
    }
    
    if (this.distanceTraveled >= this.maxDistance) {
      this.onMiss?.();
      this.destroy();
      return false;
    }
    
    return false;
  }

  destroy(): void {
    this.isActive = false;
    this.scene.remove(this.mesh);
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class ProjectileManager {
  private scene: THREE.Scene;
  private collisionDetector: CollisionDetector;
  private projectiles: Projectile[] = [];

  constructor(scene: THREE.Scene, collisionDetector: CollisionDetector) {
    this.scene = scene;
    this.collisionDetector = collisionDetector;
  }

  spawnProjectile(
    config: ProjectileConfig,
    onHit?: (target: CollisionTarget, point: THREE.Vector3) => void,
    onMiss?: () => void
  ): Projectile {
    const projectile = new Projectile(this.scene, config, onHit, onMiss);
    this.projectiles.push(projectile);
    return projectile;
  }

  update(deltaTime: number): void {
    this.projectiles = this.projectiles.filter(p => {
      if (!p.isActive) return false;
      p.update(deltaTime, this.collisionDetector);
      return p.isActive;
    });
  }

  clear(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles = [];
  }
}
