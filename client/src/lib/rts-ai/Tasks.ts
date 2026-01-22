import * as THREE from 'three';
import { BehaviorNode, BehaviorResult, AIEntity } from './BehaviorTree';

export class TaskWait extends BehaviorNode {
  duration: number;
  progress: number = 0;
  
  constructor(duration: number = 1) {
    super();
    this.duration = duration;
  }
  
  run(_entity: AIEntity, deltaTime: number): BehaviorResult {
    this.progress += deltaTime;
    if (this.progress >= this.duration) {
      return 'SUCCESS';
    }
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.progress = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskMoveTo extends BehaviorNode {
  arrivalThreshold: number;
  maxRetries: number;
  retryCount: number = 0;
  
  constructor(arrivalThreshold: number = 0.5, maxRetries: number = 5) {
    super();
    this.arrivalThreshold = arrivalThreshold;
    this.maxRetries = maxRetries;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const target = entity.blackboard.targetPosition;
    if (!target) return 'FAILED';
    
    const distance = entity.position.distanceTo(target);
    
    if (distance < this.arrivalThreshold) {
      entity.state = 'idle';
      return 'SUCCESS';
    }
    
    const direction = new THREE.Vector3()
      .subVectors(target, entity.position)
      .normalize();
    
    const movement = direction.multiplyScalar(entity.speed * deltaTime);
    entity.position.add(movement);
    entity.velocity.copy(direction.multiplyScalar(entity.speed));
    entity.state = 'moving';
    
    if (entity.mesh) {
      entity.mesh.position.copy(entity.position);
      const angle = Math.atan2(direction.x, direction.z);
      entity.mesh.rotation.y = angle;
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.retryCount = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskPickRandomSpot extends BehaviorNode {
  radius: number;
  
  constructor(radius: number = 10) {
    super();
    this.radius = radius;
  }
  
  run(entity: AIEntity, _deltaTime: number): BehaviorResult {
    const center = entity.blackboard.homePosition ?? entity.position;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.radius;
    
    const target = new THREE.Vector3(
      center.x + Math.cos(angle) * distance,
      center.y,
      center.z + Math.sin(angle) * distance
    );
    
    entity.blackboard.targetPosition = target;
    return 'SUCCESS';
  }
  
  reset(_entity: AIEntity): void {
    this.result = 'NOT_STARTED';
  }
}

export class TaskAttackMelee extends BehaviorNode {
  cooldown: number = 0;
  attackInterval: number;
  
  constructor(attackInterval: number = 1) {
    super();
    this.attackInterval = attackInterval;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const targetId = entity.blackboard.targetId;
    if (!targetId) return 'FAILED';
    
    this.cooldown -= deltaTime;
    
    if (this.cooldown <= 0) {
      entity.state = 'attacking';
      this.cooldown = this.attackInterval;
      return 'SUCCESS';
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.cooldown = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskAttackRanged extends BehaviorNode {
  cooldown: number = 0;
  attackInterval: number;
  projectileSpeed: number;
  
  constructor(attackInterval: number = 1.5, projectileSpeed: number = 20) {
    super();
    this.attackInterval = attackInterval;
    this.projectileSpeed = projectileSpeed;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const targetId = entity.blackboard.targetId;
    const targetPos = entity.blackboard.targetPosition;
    if (!targetId || !targetPos) return 'FAILED';
    
    const distance = entity.position.distanceTo(targetPos);
    if (distance > entity.attackRange) {
      return 'FAILED';
    }
    
    this.cooldown -= deltaTime;
    
    if (this.cooldown <= 0) {
      entity.state = 'attacking';
      this.cooldown = this.attackInterval;
      return 'SUCCESS';
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.cooldown = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskFlee extends BehaviorNode {
  fleeSpeed: number;
  
  constructor(fleeSpeed: number = 1.5) {
    super();
    this.fleeSpeed = fleeSpeed;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const threatPos = entity.blackboard.lastSeenEnemy?.position;
    if (!threatPos) return 'FAILED';
    
    const distance = entity.position.distanceTo(threatPos);
    const fleeDistance = entity.blackboard.fleeDistance ?? 15;
    
    if (distance >= fleeDistance) {
      entity.state = 'idle';
      return 'SUCCESS';
    }
    
    const direction = new THREE.Vector3()
      .subVectors(entity.position, threatPos)
      .normalize();
    
    const movement = direction.multiplyScalar(entity.speed * this.fleeSpeed * deltaTime);
    entity.position.add(movement);
    entity.state = 'fleeing';
    
    if (entity.mesh) {
      entity.mesh.position.copy(entity.position);
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.result = 'NOT_STARTED';
  }
}

export class TaskGatherResource extends BehaviorNode {
  gatherRate: number;
  progress: number = 0;
  
  constructor(gatherRate: number = 1) {
    super();
    this.gatherRate = gatherRate;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const resourceType = entity.blackboard.resourceType;
    if (!resourceType) return 'FAILED';
    
    this.progress += deltaTime * this.gatherRate;
    entity.state = 'gathering';
    
    const gatherAmount = entity.blackboard.gatherAmount ?? 10;
    
    if (this.progress >= gatherAmount) {
      return 'SUCCESS';
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.progress = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskPatrol extends BehaviorNode {
  waitTime: number;
  currentWait: number = 0;
  isWaiting: boolean = false;
  
  constructor(waitTime: number = 2) {
    super();
    this.waitTime = waitTime;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const patrolPoints = entity.blackboard.patrolPoints;
    if (!patrolPoints || patrolPoints.length === 0) return 'FAILED';
    
    if (entity.blackboard.currentPatrolIndex === undefined) {
      entity.blackboard.currentPatrolIndex = 0;
    }
    
    const targetIndex = entity.blackboard.currentPatrolIndex;
    const target = patrolPoints[targetIndex];
    const distance = entity.position.distanceTo(target);
    
    if (distance < 0.5) {
      if (!this.isWaiting) {
        this.isWaiting = true;
        this.currentWait = 0;
      }
      
      this.currentWait += deltaTime;
      
      if (this.currentWait >= this.waitTime) {
        this.isWaiting = false;
        entity.blackboard.currentPatrolIndex = (targetIndex + 1) % patrolPoints.length;
      }
      
      entity.state = 'idle';
      return 'RUNNING';
    }
    
    const direction = new THREE.Vector3()
      .subVectors(target, entity.position)
      .normalize();
    
    const movement = direction.multiplyScalar(entity.speed * deltaTime);
    entity.position.add(movement);
    entity.state = 'moving';
    
    if (entity.mesh) {
      entity.mesh.position.copy(entity.position);
      const angle = Math.atan2(direction.x, direction.z);
      entity.mesh.rotation.y = angle;
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.currentWait = 0;
    this.isWaiting = false;
    this.result = 'NOT_STARTED';
  }
}

export class TaskBuild extends BehaviorNode {
  buildProgress: number = 0;
  buildTime: number;
  
  constructor(buildTime: number = 5) {
    super();
    this.buildTime = buildTime;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const buildingType = entity.blackboard.buildingType;
    if (!buildingType) return 'FAILED';
    
    this.buildProgress += deltaTime;
    entity.state = 'building';
    
    if (this.buildProgress >= this.buildTime) {
      return 'SUCCESS';
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.buildProgress = 0;
    this.result = 'NOT_STARTED';
  }
}

export class TaskFindNearestEnemy extends BehaviorNode {
  searchRadius: number;
  enemies: AIEntity[] = [];
  
  constructor(searchRadius: number = 20, enemies?: AIEntity[]) {
    super();
    this.searchRadius = searchRadius;
    if (enemies) this.enemies = enemies;
  }
  
  setEnemies(enemies: AIEntity[]) {
    this.enemies = enemies;
  }
  
  run(entity: AIEntity, _deltaTime: number): BehaviorResult {
    let nearestEnemy: AIEntity | null = null;
    let nearestDistance = this.searchRadius;
    
    for (const enemy of this.enemies) {
      if (enemy.team === entity.team || enemy.state === 'dead') continue;
      
      const distance = entity.position.distanceTo(enemy.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }
    
    if (nearestEnemy) {
      entity.blackboard.targetId = nearestEnemy.id;
      entity.blackboard.targetPosition = nearestEnemy.position.clone();
      entity.blackboard.lastSeenEnemy = {
        id: nearestEnemy.id,
        position: nearestEnemy.position.clone(),
        time: Date.now()
      };
      return 'SUCCESS';
    }
    
    return 'FAILED';
  }
  
  reset(_entity: AIEntity): void {
    this.result = 'NOT_STARTED';
  }
}

export class TaskChaseTarget extends BehaviorNode {
  chaseSpeed: number;
  
  constructor(chaseSpeed: number = 1.2) {
    super();
    this.chaseSpeed = chaseSpeed;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const target = entity.blackboard.targetPosition;
    if (!target) return 'FAILED';
    
    const distance = entity.position.distanceTo(target);
    
    if (distance <= entity.attackRange) {
      return 'SUCCESS';
    }
    
    const direction = new THREE.Vector3()
      .subVectors(target, entity.position)
      .normalize();
    
    const movement = direction.multiplyScalar(entity.speed * this.chaseSpeed * deltaTime);
    entity.position.add(movement);
    entity.state = 'moving';
    
    if (entity.mesh) {
      entity.mesh.position.copy(entity.position);
      const angle = Math.atan2(direction.x, direction.z);
      entity.mesh.rotation.y = angle;
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.result = 'NOT_STARTED';
  }
}

export class TaskReturnHome extends BehaviorNode {
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const home = entity.blackboard.homePosition;
    if (!home) return 'FAILED';
    
    const distance = entity.position.distanceTo(home);
    
    if (distance < 1) {
      entity.state = 'idle';
      return 'SUCCESS';
    }
    
    const direction = new THREE.Vector3()
      .subVectors(home, entity.position)
      .normalize();
    
    const movement = direction.multiplyScalar(entity.speed * deltaTime);
    entity.position.add(movement);
    entity.state = 'moving';
    
    if (entity.mesh) {
      entity.mesh.position.copy(entity.position);
    }
    
    return 'RUNNING';
  }
  
  reset(_entity: AIEntity): void {
    this.result = 'NOT_STARTED';
  }
}
