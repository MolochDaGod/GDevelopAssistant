import * as THREE from 'three';
import { BehaviorNode, AIEntity } from './BehaviorTree';

export interface BehaviorScore {
  behaviorId: string;
  label: string;
  score: number;
  behavior: BehaviorNode;
}

export abstract class BehaviorScorer {
  abstract behaviorId(): string;
  abstract label(): string;
  abstract score(entity: AIEntity, context: AIContext): number;
  abstract build(): BehaviorNode;
}

export interface AIContext {
  enemies: AIEntity[];
  allies: AIEntity[];
  resources: ResourceNode[];
  buildings: BuildingNode[];
  time: number;
  mapBounds: { min: THREE.Vector3; max: THREE.Vector3 };
}

export interface ResourceNode {
  id: string;
  type: 'gold' | 'wood' | 'stone' | 'food';
  position: THREE.Vector3;
  amount: number;
}

export interface BuildingNode {
  id: string;
  type: string;
  position: THREE.Vector3;
  team: 'player' | 'enemy' | 'neutral';
  health: number;
  maxHealth: number;
}

export class BehaviorPicker {
  scorers: BehaviorScorer[] = [];
  
  addScorer(scorer: BehaviorScorer): void {
    this.scorers.push(scorer);
  }
  
  removeScorer(behaviorId: string): void {
    this.scorers = this.scorers.filter(s => s.behaviorId() !== behaviorId);
  }
  
  pickBehavior(entity: AIEntity, context: AIContext): BehaviorScore | null {
    const scores: BehaviorScore[] = [];
    
    for (const scorer of this.scorers) {
      const score = scorer.score(entity, context);
      if (score > 0) {
        scores.push({
          behaviorId: scorer.behaviorId(),
          label: scorer.label(),
          score,
          behavior: scorer.build()
        });
      }
    }
    
    if (scores.length === 0) return null;
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0];
  }
  
  getAllScores(entity: AIEntity, context: AIContext): BehaviorScore[] {
    return this.scorers.map(scorer => ({
      behaviorId: scorer.behaviorId(),
      label: scorer.label(),
      score: scorer.score(entity, context),
      behavior: scorer.build()
    })).sort((a, b) => b.score - a.score);
  }
}

import { SequenceNode, SelectorNode, ConditionalNode, RepeatNode } from './BehaviorTree';
import { 
  TaskWait, 
  TaskMoveTo, 
  TaskPickRandomSpot, 
  TaskAttackMelee, 
  TaskFlee,
  TaskPatrol,
  TaskFindNearestEnemy,
  TaskChaseTarget,
  TaskReturnHome,
  TaskGatherResource
} from './Tasks';

export class IdleBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'idle'; }
  label() { return 'Idle'; }
  
  score(_entity: AIEntity, _context: AIContext): number {
    return 0.1;
  }
  
  build(): BehaviorNode {
    return new SequenceNode([
      new TaskPickRandomSpot(5),
      new TaskMoveTo(0.5),
      new TaskWait(2 + Math.random() * 3)
    ]);
  }
}

export class WanderBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'wander'; }
  label() { return 'Wandering'; }
  
  score(entity: AIEntity, context: AIContext): number {
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      entity.position.distanceTo(e.position) < 20
    );
    
    if (nearbyEnemies.length > 0) return 0;
    return 0.3;
  }
  
  build(): BehaviorNode {
    return new RepeatNode(
      new SequenceNode([
        new TaskPickRandomSpot(10),
        new TaskMoveTo(0.5),
        new TaskWait(1)
      ]),
      3
    );
  }
}

export class AggressiveBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'aggressive'; }
  label() { return 'Attacking'; }
  
  score(entity: AIEntity, context: AIContext): number {
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      e.state !== 'dead' &&
      entity.position.distanceTo(e.position) < 25
    );
    
    if (nearbyEnemies.length === 0) return 0;
    
    const healthRatio = entity.health / entity.maxHealth;
    if (healthRatio < 0.2) return 0;
    
    return 0.8 * healthRatio;
  }
  
  build(): BehaviorNode {
    return new SequenceNode([
      new TaskFindNearestEnemy(25),
      new TaskChaseTarget(1.2),
      new TaskAttackMelee(1)
    ]);
  }
}

export class DefensiveBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'defensive'; }
  label() { return 'Defending'; }
  
  score(entity: AIEntity, context: AIContext): number {
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      e.state !== 'dead' &&
      entity.position.distanceTo(e.position) < 15
    );
    
    if (nearbyEnemies.length === 0) return 0;
    
    const homePos = entity.blackboard.homePosition;
    if (!homePos) return 0;
    
    const distanceFromHome = entity.position.distanceTo(homePos);
    if (distanceFromHome > 20) return 0;
    
    return 0.7;
  }
  
  build(): BehaviorNode {
    return new SelectorNode([
      new ConditionalNode(
        (e) => {
          const home = e.blackboard.homePosition;
          return home ? e.position.distanceTo(home) > 15 : false;
        },
        new TaskReturnHome()
      ),
      new SequenceNode([
        new TaskFindNearestEnemy(15),
        new TaskChaseTarget(1),
        new TaskAttackMelee(1)
      ])
    ]);
  }
}

export class FleeBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'flee'; }
  label() { return 'Fleeing'; }
  
  score(entity: AIEntity, context: AIContext): number {
    const healthRatio = entity.health / entity.maxHealth;
    if (healthRatio > 0.3) return 0;
    
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      e.state !== 'dead' &&
      entity.position.distanceTo(e.position) < 10
    );
    
    if (nearbyEnemies.length === 0) return 0;
    
    return 0.95 * (1 - healthRatio);
  }
  
  build(): BehaviorNode {
    return new TaskFlee(1.5);
  }
}

export class PatrolBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'patrol'; }
  label() { return 'Patrolling'; }
  
  score(entity: AIEntity, context: AIContext): number {
    const patrolPoints = entity.blackboard.patrolPoints;
    if (!patrolPoints || patrolPoints.length < 2) return 0;
    
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      entity.position.distanceTo(e.position) < 15
    );
    
    if (nearbyEnemies.length > 0) return 0;
    
    return 0.5;
  }
  
  build(): BehaviorNode {
    return new TaskPatrol(2);
  }
}

export class GatherBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'gather'; }
  label() { return 'Gathering'; }
  
  score(entity: AIEntity, context: AIContext): number {
    if (entity.unitType !== 'worker' && entity.unitType !== 'peasant') {
      return 0;
    }
    
    const nearbyResources = context.resources.filter(
      r => entity.position.distanceTo(r.position) < 30 && r.amount > 0
    );
    
    if (nearbyResources.length === 0) return 0;
    
    const nearbyEnemies = context.enemies.filter(
      e => e.team !== entity.team && 
      entity.position.distanceTo(e.position) < 10
    );
    
    if (nearbyEnemies.length > 0) return 0.2;
    
    return 0.6;
  }
  
  build(): BehaviorNode {
    return new SequenceNode([
      new TaskMoveTo(1),
      new TaskGatherResource(1),
      new TaskReturnHome()
    ]);
  }
}

export class ReturnHomeBehaviorScorer extends BehaviorScorer {
  behaviorId() { return 'return_home'; }
  label() { return 'Returning Home'; }
  
  score(entity: AIEntity, _context: AIContext): number {
    const home = entity.blackboard.homePosition;
    if (!home) return 0;
    
    const distance = entity.position.distanceTo(home);
    if (distance < 5) return 0;
    if (distance > 50) return 0.7;
    
    return 0.2;
  }
  
  build(): BehaviorNode {
    return new TaskReturnHome();
  }
}

export function createDefaultBehaviorPicker(): BehaviorPicker {
  const picker = new BehaviorPicker();
  
  picker.addScorer(new IdleBehaviorScorer());
  picker.addScorer(new WanderBehaviorScorer());
  picker.addScorer(new AggressiveBehaviorScorer());
  picker.addScorer(new DefensiveBehaviorScorer());
  picker.addScorer(new FleeBehaviorScorer());
  picker.addScorer(new PatrolBehaviorScorer());
  picker.addScorer(new GatherBehaviorScorer());
  picker.addScorer(new ReturnHomeBehaviorScorer());
  
  return picker;
}
