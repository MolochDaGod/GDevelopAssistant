import * as THREE from 'three';
import { AIEntity, BehaviorNode, Blackboard } from './BehaviorTree';
import { BehaviorPicker, AIContext, createDefaultBehaviorPicker, ResourceNode, BuildingNode } from './BehaviorScorer';

export interface AIManagerConfig {
  updateInterval?: number;
  maxEntitiesPerUpdate?: number;
  debugMode?: boolean;
}

export class AIManager {
  private entities: Map<string, AIEntity> = new Map();
  private activeBehaviors: Map<string, BehaviorNode> = new Map();
  private behaviorLabels: Map<string, string> = new Map();
  private behaviorPicker: BehaviorPicker;
  private resources: ResourceNode[] = [];
  private buildings: BuildingNode[] = [];
  private mapBounds: { min: THREE.Vector3; max: THREE.Vector3 };
  private config: AIManagerConfig;
  private lastUpdateTime: number = 0;
  private updateQueue: string[] = [];
  private debugCallbacks: ((entity: AIEntity, label: string) => void)[] = [];

  constructor(config: AIManagerConfig = {}) {
    this.config = {
      updateInterval: config.updateInterval ?? 0,
      maxEntitiesPerUpdate: config.maxEntitiesPerUpdate ?? 50,
      debugMode: config.debugMode ?? false
    };
    
    this.behaviorPicker = createDefaultBehaviorPicker();
    this.mapBounds = {
      min: new THREE.Vector3(-100, 0, -100),
      max: new THREE.Vector3(100, 50, 100)
    };
  }

  addEntity(entity: AIEntity): void {
    this.entities.set(entity.id, entity);
    this.updateQueue.push(entity.id);
  }

  removeEntity(id: string): void {
    this.entities.delete(id);
    this.activeBehaviors.delete(id);
    this.behaviorLabels.delete(id);
    this.updateQueue = this.updateQueue.filter(eid => eid !== id);
  }

  getEntity(id: string): AIEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): AIEntity[] {
    return Array.from(this.entities.values());
  }

  getEntitiesByTeam(team: 'player' | 'enemy' | 'neutral'): AIEntity[] {
    return Array.from(this.entities.values()).filter(e => e.team === team);
  }

  setResources(resources: ResourceNode[]): void {
    this.resources = resources;
  }

  setBuildings(buildings: BuildingNode[]): void {
    this.buildings = buildings;
  }

  setMapBounds(min: THREE.Vector3, max: THREE.Vector3): void {
    this.mapBounds = { min, max };
  }

  getBehaviorPicker(): BehaviorPicker {
    return this.behaviorPicker;
  }

  setBehaviorPicker(picker: BehaviorPicker): void {
    this.behaviorPicker = picker;
  }

  onBehaviorChange(callback: (entity: AIEntity, label: string) => void): void {
    this.debugCallbacks.push(callback);
  }

  getBehaviorLabel(entityId: string): string {
    return this.behaviorLabels.get(entityId) ?? 'Idle';
  }

  update(deltaTime: number): void {
    const currentTime = Date.now();
    
    if (currentTime - this.lastUpdateTime < this.config.updateInterval!) {
      for (const entity of Array.from(this.entities.values())) {
        if (entity.state === 'dead') continue;
        this.updateEntityBehavior(entity, deltaTime);
      }
      return;
    }
    
    this.lastUpdateTime = currentTime;
    
    const context = this.createContext();
    let processed = 0;
    
    for (const entity of Array.from(this.entities.values())) {
      if (entity.state === 'dead') continue;
      
      if (processed >= this.config.maxEntitiesPerUpdate!) {
        break;
      }
      
      this.processEntity(entity, context, deltaTime);
      processed++;
    }
  }

  private createContext(): AIContext {
    const allEntities = Array.from(this.entities.values());
    
    return {
      enemies: allEntities.filter(e => e.state !== 'dead'),
      allies: allEntities.filter(e => e.state !== 'dead'),
      resources: this.resources,
      buildings: this.buildings,
      time: Date.now(),
      mapBounds: this.mapBounds
    };
  }

  private processEntity(entity: AIEntity, context: AIContext, deltaTime: number): void {
    let behavior = this.activeBehaviors.get(entity.id);
    
    if (!behavior || behavior.result === 'SUCCESS' || behavior.result === 'FAILED') {
      const newBehavior = this.behaviorPicker.pickBehavior(entity, context);
      
      if (newBehavior) {
        behavior = newBehavior.behavior;
        this.activeBehaviors.set(entity.id, behavior);
        this.behaviorLabels.set(entity.id, newBehavior.label);
        
        if (this.config.debugMode) {
          this.debugCallbacks.forEach(cb => cb(entity, newBehavior.label));
        }
      }
    }
    
    if (behavior) {
      behavior.execute(entity, deltaTime);
    }
  }

  private updateEntityBehavior(entity: AIEntity, deltaTime: number): void {
    const behavior = this.activeBehaviors.get(entity.id);
    if (behavior && behavior.result === 'RUNNING') {
      behavior.execute(entity, deltaTime);
    }
  }

  createEntity(config: {
    id: string;
    position: THREE.Vector3;
    team: 'player' | 'enemy' | 'neutral';
    unitType: string;
    stats?: Partial<Pick<AIEntity, 'health' | 'maxHealth' | 'attackPower' | 'attackRange' | 'speed'>>;
    blackboard?: Partial<Blackboard>;
    mesh?: THREE.Object3D;
  }): AIEntity {
    const entity: AIEntity = {
      id: config.id,
      position: config.position.clone(),
      velocity: new THREE.Vector3(),
      health: config.stats?.health ?? 100,
      maxHealth: config.stats?.maxHealth ?? 100,
      attackPower: config.stats?.attackPower ?? 10,
      attackRange: config.stats?.attackRange ?? 2,
      speed: config.stats?.speed ?? 5,
      team: config.team,
      unitType: config.unitType,
      state: 'idle',
      blackboard: {
        homePosition: config.position.clone(),
        ...config.blackboard
      },
      mesh: config.mesh
    };
    
    this.addEntity(entity);
    return entity;
  }

  damageEntity(entityId: string, damage: number, attackerId?: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity || entity.state === 'dead') return false;
    
    entity.health -= damage;
    
    if (attackerId) {
      const attacker = this.entities.get(attackerId);
      if (attacker) {
        entity.blackboard.lastSeenEnemy = {
          id: attackerId,
          position: attacker.position.clone(),
          time: Date.now()
        };
      }
    }
    
    if (entity.health <= 0) {
      entity.health = 0;
      entity.state = 'dead';
      return true;
    }
    
    return false;
  }

  healEntity(entityId: string, amount: number): void {
    const entity = this.entities.get(entityId);
    if (!entity || entity.state === 'dead') return;
    
    entity.health = Math.min(entity.maxHealth, entity.health + amount);
  }

  setEntityPatrolPoints(entityId: string, points: THREE.Vector3[]): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.blackboard.patrolPoints = points;
      entity.blackboard.currentPatrolIndex = 0;
    }
  }

  setEntityTarget(entityId: string, targetId: string, targetPosition?: THREE.Vector3): void {
    const entity = this.entities.get(entityId);
    const target = this.entities.get(targetId);
    
    if (entity) {
      entity.blackboard.targetId = targetId;
      entity.blackboard.targetPosition = targetPosition ?? target?.position.clone();
    }
  }

  moveEntityTo(entityId: string, position: THREE.Vector3): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.blackboard.targetPosition = position.clone();
      entity.blackboard.targetId = undefined;
    }
  }

  getDebugInfo(): { entityId: string; behavior: string; state: string; health: number }[] {
    return Array.from(this.entities.values()).map(entity => ({
      entityId: entity.id,
      behavior: this.behaviorLabels.get(entity.id) ?? 'None',
      state: entity.state,
      health: entity.health
    }));
  }
}

export function createAIEntity(
  id: string,
  position: THREE.Vector3,
  team: 'player' | 'enemy' | 'neutral',
  unitType: string,
  mesh?: THREE.Object3D
): AIEntity {
  return {
    id,
    position: position.clone(),
    velocity: new THREE.Vector3(),
    health: 100,
    maxHealth: 100,
    attackPower: 10,
    attackRange: 2,
    speed: 5,
    team,
    unitType,
    state: 'idle',
    blackboard: {
      homePosition: position.clone()
    },
    mesh
  };
}
