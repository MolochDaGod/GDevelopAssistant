import * as THREE from 'three';

export type BehaviorResult = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'NOT_STARTED';

export interface Blackboard {
  targetId?: string;
  targetPosition?: THREE.Vector3;
  homePosition?: THREE.Vector3;
  goals?: THREE.Vector3[];
  wanderRadius?: number;
  attackRange?: number;
  gatherAmount?: number;
  fleeDistance?: number;
  patrolPoints?: THREE.Vector3[];
  currentPatrolIndex?: number;
  lastSeenEnemy?: { id: string; position: THREE.Vector3; time: number };
  resourceType?: 'gold' | 'wood' | 'stone' | 'food';
  buildingType?: string;
  customData?: Record<string, unknown>;
}

export interface AIEntity {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  attackPower: number;
  attackRange: number;
  speed: number;
  team: 'player' | 'enemy' | 'neutral';
  unitType: string;
  state: 'idle' | 'moving' | 'attacking' | 'gathering' | 'building' | 'fleeing' | 'dead';
  blackboard: Blackboard;
  mesh?: THREE.Object3D;
}

export abstract class BehaviorNode {
  result: BehaviorResult = 'NOT_STARTED';
  
  abstract run(entity: AIEntity, deltaTime: number): BehaviorResult;
  abstract reset(entity: AIEntity): void;
  
  execute(entity: AIEntity, deltaTime: number): BehaviorResult {
    this.result = this.run(entity, deltaTime);
    return this.result;
  }
}

export class SequenceNode extends BehaviorNode {
  children: BehaviorNode[];
  currentIndex: number = 0;
  
  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    while (this.currentIndex < this.children.length) {
      const child = this.children[this.currentIndex];
      const result = child.execute(entity, deltaTime);
      
      if (result === 'RUNNING') return 'RUNNING';
      if (result === 'FAILED') {
        this.reset(entity);
        return 'FAILED';
      }
      
      this.currentIndex++;
    }
    
    this.reset(entity);
    return 'SUCCESS';
  }
  
  reset(entity: AIEntity): void {
    this.currentIndex = 0;
    this.result = 'NOT_STARTED';
    this.children.forEach(c => c.reset(entity));
  }
}

export class SelectorNode extends BehaviorNode {
  children: BehaviorNode[];
  currentIndex: number = 0;
  
  constructor(children: BehaviorNode[]) {
    super();
    this.children = children;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    while (this.currentIndex < this.children.length) {
      const child = this.children[this.currentIndex];
      const result = child.execute(entity, deltaTime);
      
      if (result === 'RUNNING') return 'RUNNING';
      if (result === 'SUCCESS') {
        this.reset(entity);
        return 'SUCCESS';
      }
      
      this.currentIndex++;
    }
    
    this.reset(entity);
    return 'FAILED';
  }
  
  reset(entity: AIEntity): void {
    this.currentIndex = 0;
    this.result = 'NOT_STARTED';
    this.children.forEach(c => c.reset(entity));
  }
}

export class ConditionalNode extends BehaviorNode {
  condition: (entity: AIEntity) => boolean;
  trueNode: BehaviorNode;
  falseNode?: BehaviorNode;
  
  constructor(
    condition: (entity: AIEntity) => boolean,
    trueNode: BehaviorNode,
    falseNode?: BehaviorNode
  ) {
    super();
    this.condition = condition;
    this.trueNode = trueNode;
    this.falseNode = falseNode;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    if (this.condition(entity)) {
      return this.trueNode.execute(entity, deltaTime);
    } else if (this.falseNode) {
      return this.falseNode.execute(entity, deltaTime);
    }
    return 'FAILED';
  }
  
  reset(entity: AIEntity): void {
    this.result = 'NOT_STARTED';
    this.trueNode.reset(entity);
    this.falseNode?.reset(entity);
  }
}

export class RepeatNode extends BehaviorNode {
  child: BehaviorNode;
  times: number;
  currentCount: number = 0;
  
  constructor(child: BehaviorNode, times: number = Infinity) {
    super();
    this.child = child;
    this.times = times;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    if (this.currentCount >= this.times) {
      this.reset(entity);
      return 'SUCCESS';
    }
    
    const result = this.child.execute(entity, deltaTime);
    
    if (result === 'SUCCESS' || result === 'FAILED') {
      this.currentCount++;
      this.child.reset(entity);
      return 'RUNNING';
    }
    
    return result;
  }
  
  reset(entity: AIEntity): void {
    this.currentCount = 0;
    this.result = 'NOT_STARTED';
    this.child.reset(entity);
  }
}

export class InverterNode extends BehaviorNode {
  child: BehaviorNode;
  
  constructor(child: BehaviorNode) {
    super();
    this.child = child;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const result = this.child.execute(entity, deltaTime);
    
    if (result === 'SUCCESS') return 'FAILED';
    if (result === 'FAILED') return 'SUCCESS';
    return result;
  }
  
  reset(entity: AIEntity): void {
    this.result = 'NOT_STARTED';
    this.child.reset(entity);
  }
}

export class SucceederNode extends BehaviorNode {
  child: BehaviorNode;
  
  constructor(child: BehaviorNode) {
    super();
    this.child = child;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    const result = this.child.execute(entity, deltaTime);
    if (result === 'RUNNING') return 'RUNNING';
    return 'SUCCESS';
  }
  
  reset(entity: AIEntity): void {
    this.result = 'NOT_STARTED';
    this.child.reset(entity);
  }
}

export class ParallelNode extends BehaviorNode {
  children: BehaviorNode[];
  requiredSuccesses: number;
  
  constructor(children: BehaviorNode[], requiredSuccesses?: number) {
    super();
    this.children = children;
    this.requiredSuccesses = requiredSuccesses ?? children.length;
  }
  
  run(entity: AIEntity, deltaTime: number): BehaviorResult {
    let successes = 0;
    let failures = 0;
    let running = 0;
    
    for (const child of this.children) {
      const result = child.execute(entity, deltaTime);
      
      if (result === 'SUCCESS') successes++;
      else if (result === 'FAILED') failures++;
      else if (result === 'RUNNING') running++;
    }
    
    if (successes >= this.requiredSuccesses) {
      this.reset(entity);
      return 'SUCCESS';
    }
    
    if (failures > this.children.length - this.requiredSuccesses) {
      this.reset(entity);
      return 'FAILED';
    }
    
    return running > 0 ? 'RUNNING' : 'FAILED';
  }
  
  reset(entity: AIEntity): void {
    this.result = 'NOT_STARTED';
    this.children.forEach(c => c.reset(entity));
  }
}
