export interface TransformComponent {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
  speed: number;
  maxSpeed: number;
}

export interface StatsComponent {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  experience: number;
  attack: number;
  defense: number;
}

export interface SpriteComponent {
  spriteId: string;
  width: number;
  height: number;
  frame: number;
  animationState: string;
}

export interface InteractableComponent {
  type: string;
  range: number;
  cooldown: number;
  lastInteraction: number;
}

export interface NetworkedComponent {
  ownerId: string;
  lastSync: number;
  dirty: boolean;
}

export interface LootableComponent {
  items: string[];
  gold: number;
  experience: number;
}

export interface AIComponent {
  behavior: "idle" | "patrol" | "chase" | "attack" | "flee";
  targetId?: string;
  patrolPath?: { x: number; y: number }[];
  patrolIndex: number;
  aggroRange: number;
  attackRange: number;
}

export type EntityType = "player" | "npc" | "item" | "interactable" | "projectile";

export interface Entity {
  id: string;
  type: EntityType;
  transform: TransformComponent;
  velocity?: VelocityComponent;
  stats?: StatsComponent;
  sprite?: SpriteComponent;
  interactable?: InteractableComponent;
  networked?: NetworkedComponent;
  lootable?: LootableComponent;
  ai?: AIComponent;
  metadata: Record<string, unknown>;
}

export class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private entitiesByType: Map<EntityType, Set<string>> = new Map();
  private spatialHash: Map<string, Set<string>> = new Map();
  private cellSize = 64;

  constructor() {
    this.entitiesByType.set("player", new Set());
    this.entitiesByType.set("npc", new Set());
    this.entitiesByType.set("item", new Set());
    this.entitiesByType.set("interactable", new Set());
    this.entitiesByType.set("projectile", new Set());
  }

  private getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  private updateSpatialHash(entity: Entity, oldX?: number, oldY?: number) {
    if (oldX !== undefined && oldY !== undefined) {
      const oldKey = this.getCellKey(oldX, oldY);
      this.spatialHash.get(oldKey)?.delete(entity.id);
    }

    const newKey = this.getCellKey(entity.transform.x, entity.transform.y);
    if (!this.spatialHash.has(newKey)) {
      this.spatialHash.set(newKey, new Set());
    }
    this.spatialHash.get(newKey)!.add(entity.id);
  }

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.entitiesByType.get(entity.type)?.add(entity.id);
    this.updateSpatialHash(entity);
  }

  removeEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    this.entities.delete(id);
    this.entitiesByType.get(entity.type)?.delete(id);
    
    const cellKey = this.getCellKey(entity.transform.x, entity.transform.y);
    this.spatialHash.get(cellKey)?.delete(id);
    
    return true;
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getEntitiesByType(type: EntityType): Entity[] {
    const ids = this.entitiesByType.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.entities.get(id)!).filter(Boolean);
  }

  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {
    const results: Entity[] = [];
    const radiusSq = radius * radius;
    
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cellKey = `${cx},${cy}`;
        const cellEntities = this.spatialHash.get(cellKey);
        if (!cellEntities) continue;
        
        for (const id of Array.from(cellEntities)) {
          const entity = this.entities.get(id);
          if (!entity) continue;
          
          const dx = entity.transform.x - x;
          const dy = entity.transform.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entity);
          }
        }
      }
    }
    
    return results;
  }

  updateEntityPosition(id: string, x: number, y: number): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const oldX = entity.transform.x;
    const oldY = entity.transform.y;
    entity.transform.x = x;
    entity.transform.y = y;
    
    if (this.getCellKey(oldX, oldY) !== this.getCellKey(x, y)) {
      this.updateSpatialHash(entity, oldX, oldY);
    }
  }

  clear(): void {
    this.entities.clear();
    this.entitiesByType.forEach(set => set.clear());
    this.spatialHash.clear();
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  size(): number {
    return this.entities.size;
  }
}

export interface System {
  update(deltaTime: number, entityManager: EntityManager): void;
}

export class MovementSystem implements System {
  update(deltaTime: number, entityManager: EntityManager): void {
    for (const entity of entityManager.getAllEntities()) {
      if (!entity.velocity) continue;
      
      const { vx, vy, maxSpeed } = entity.velocity;
      const speed = Math.sqrt(vx * vx + vy * vy);
      
      if (speed > 0) {
        const factor = speed > maxSpeed ? maxSpeed / speed : 1;
        const newX = entity.transform.x + vx * factor * deltaTime;
        const newY = entity.transform.y + vy * factor * deltaTime;
        
        entityManager.updateEntityPosition(entity.id, newX, newY);
        
        entity.transform.rotation = Math.atan2(vy, vx);
      }
    }
  }
}

export class AISystem implements System {
  update(deltaTime: number, entityManager: EntityManager): void {
    const npcs = entityManager.getEntitiesByType("npc");
    const players = entityManager.getEntitiesByType("player");
    
    for (const npc of npcs) {
      if (!npc.ai || !npc.velocity) continue;
      
      switch (npc.ai.behavior) {
        case "idle":
          npc.velocity.vx = 0;
          npc.velocity.vy = 0;
          
          for (const player of players) {
            const dx = player.transform.x - npc.transform.x;
            const dy = player.transform.y - npc.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < npc.ai.aggroRange) {
              npc.ai.behavior = "chase";
              npc.ai.targetId = player.id;
              break;
            }
          }
          break;
          
        case "patrol":
          if (npc.ai.patrolPath && npc.ai.patrolPath.length > 0) {
            const target = npc.ai.patrolPath[npc.ai.patrolIndex];
            const dx = target.x - npc.transform.x;
            const dy = target.y - npc.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 5) {
              npc.ai.patrolIndex = (npc.ai.patrolIndex + 1) % npc.ai.patrolPath.length;
            } else {
              npc.velocity.vx = (dx / dist) * npc.velocity.speed;
              npc.velocity.vy = (dy / dist) * npc.velocity.speed;
            }
          }
          break;
          
        case "chase":
          if (npc.ai.targetId) {
            const target = entityManager.getEntity(npc.ai.targetId);
            if (target) {
              const dx = target.transform.x - npc.transform.x;
              const dy = target.transform.y - npc.transform.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist < npc.ai.attackRange) {
                npc.ai.behavior = "attack";
              } else if (dist > npc.ai.aggroRange * 1.5) {
                npc.ai.behavior = "idle";
                npc.ai.targetId = undefined;
              } else {
                npc.velocity.vx = (dx / dist) * npc.velocity.speed;
                npc.velocity.vy = (dy / dist) * npc.velocity.speed;
              }
            } else {
              npc.ai.behavior = "idle";
              npc.ai.targetId = undefined;
            }
          }
          break;
          
        case "attack":
          npc.velocity.vx = 0;
          npc.velocity.vy = 0;
          
          if (npc.ai.targetId) {
            const target = entityManager.getEntity(npc.ai.targetId);
            if (target) {
              const dx = target.transform.x - npc.transform.x;
              const dy = target.transform.y - npc.transform.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist > npc.ai.attackRange) {
                npc.ai.behavior = "chase";
              }
            } else {
              npc.ai.behavior = "idle";
              npc.ai.targetId = undefined;
            }
          }
          break;
      }
    }
  }
}

export class GameWorld {
  private entityManager: EntityManager;
  private systems: System[];
  private lastUpdate: number = 0;

  constructor() {
    this.entityManager = new EntityManager();
    this.systems = [
      new MovementSystem(),
      new AISystem()
    ];
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  update(timestamp: number): void {
    const deltaTime = this.lastUpdate ? (timestamp - this.lastUpdate) / 1000 : 0;
    this.lastUpdate = timestamp;
    
    for (const system of this.systems) {
      system.update(deltaTime, this.entityManager);
    }
  }

  reset(): void {
    this.entityManager.clear();
    this.lastUpdate = 0;
  }
}
