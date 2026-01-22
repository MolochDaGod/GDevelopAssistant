import { useRef, useCallback, type RefObject } from 'react';
import * as THREE from 'three';
import type { GameEntity } from '../core/types';
import { updateEntityHealthBar } from '../entities/HealthBarFactory';
import { disposeEntity } from '../entities/EntityFactory';

export interface UseEntityManagerOptions {
  sceneRef: RefObject<THREE.Scene | null>;
  onEntityDeath?: (entity: GameEntity, killer?: GameEntity) => void;
  onEntitySpawn?: (entity: GameEntity) => void;
}

export interface UseEntityManagerReturn {
  entities: RefObject<GameEntity[]>;
  addEntity: (entity: GameEntity) => void;
  removeEntity: (entity: GameEntity | string) => void;
  getEntity: (id: string) => GameEntity | undefined;
  getEntitiesByType: (type: string) => GameEntity[];
  getEntitiesByTeam: (team: string) => GameEntity[];
  findNearestEnemy: (entity: GameEntity, range: number) => GameEntity | null;
  findEntitiesInRange: (position: THREE.Vector3, range: number, team?: string) => GameEntity[];
  damageEntity: (entity: GameEntity, damage: number, attacker?: GameEntity) => void;
  healEntity: (entity: GameEntity, amount: number) => void;
  updateEntities: (delta: number) => void;
  clearAllEntities: () => void;
}

export function useEntityManager(options: UseEntityManagerOptions): UseEntityManagerReturn {
  const { sceneRef, onEntityDeath, onEntitySpawn } = options;
  const entitiesRef = useRef<GameEntity[]>([]);

  const addEntity = useCallback((entity: GameEntity) => {
    entitiesRef.current.push(entity);
    sceneRef.current?.add(entity.mesh);
    onEntitySpawn?.(entity);
  }, [sceneRef, onEntitySpawn]);

  const removeEntity = useCallback((entityOrId: GameEntity | string) => {
    const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id;
    const index = entitiesRef.current.findIndex(e => e.id === id);
    
    if (index > -1) {
      const entity = entitiesRef.current[index];
      entitiesRef.current.splice(index, 1);
      sceneRef.current?.remove(entity.mesh);
      disposeEntity(entity);
    }
  }, [sceneRef]);

  const getEntity = useCallback((id: string) => {
    return entitiesRef.current.find(e => e.id === id);
  }, []);

  const getEntitiesByType = useCallback((type: string) => {
    return entitiesRef.current.filter(e => e.type === type);
  }, []);

  const getEntitiesByTeam = useCallback((team: string) => {
    return entitiesRef.current.filter(e => e.team === team);
  }, []);

  const findNearestEnemy = useCallback((entity: GameEntity, range: number): GameEntity | null => {
    let nearest: GameEntity | null = null;
    let nearestDist = Infinity;

    for (const other of entitiesRef.current) {
      if (other.team === entity.team || other.health <= 0 || !other.isAlive) continue;
      
      const dist = entity.position.distanceTo(other.position);
      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    return nearest;
  }, []);

  const findEntitiesInRange = useCallback((position: THREE.Vector3, range: number, team?: string): GameEntity[] => {
    return entitiesRef.current.filter(entity => {
      if (entity.health <= 0 || !entity.isAlive) return false;
      if (team && entity.team !== team) return false;
      return entity.position.distanceTo(position) <= range;
    });
  }, []);

  const damageEntity = useCallback((entity: GameEntity, damage: number, attacker?: GameEntity) => {
    entity.health = Math.max(0, entity.health - damage);
    updateEntityHealthBar(entity.mesh, entity.health, entity.maxHealth);

    if (entity.health <= 0 && entity.isAlive) {
      entity.isAlive = false;
      onEntityDeath?.(entity, attacker);
    }
  }, [onEntityDeath]);

  const healEntity = useCallback((entity: GameEntity, amount: number) => {
    entity.health = Math.min(entity.maxHealth, entity.health + amount);
    updateEntityHealthBar(entity.mesh, entity.health, entity.maxHealth);
  }, []);

  const updateEntities = useCallback((delta: number) => {
    for (const entity of entitiesRef.current) {
      if (!entity.isAlive) continue;

      if (entity.velocity && entity.speed) {
        entity.position.addScaledVector(entity.velocity, entity.speed * delta);
        entity.mesh.position.copy(entity.position);
      }

      if (entity.mixer) {
        entity.mixer.update(delta);
      }

      if (entity.attackCooldown !== undefined && entity.lastAttackTime !== undefined) {
        entity.lastAttackTime = Math.max(0, entity.lastAttackTime - delta);
      }
    }
  }, []);

  const clearAllEntities = useCallback(() => {
    for (const entity of entitiesRef.current) {
      sceneRef.current?.remove(entity.mesh);
      disposeEntity(entity);
    }
    entitiesRef.current = [];
  }, [sceneRef]);

  return {
    entities: entitiesRef,
    addEntity,
    removeEntity,
    getEntity,
    getEntitiesByType,
    getEntitiesByTeam,
    findNearestEnemy,
    findEntitiesInRange,
    damageEntity,
    healEntity,
    updateEntities,
    clearAllEntities,
  };
}
