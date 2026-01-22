/**
 * Unit AI System
 * Intelligent behavior for ranged vs melee units
 */

import type { UnitType } from '@/data/faction-units';

interface Unit {
  id: string;
  x: number;
  y: number;
  unitDefId: string;
  faction: string;
  health: number;
  maxHealth: number;
  target: Unit | null;
  isDestroyed: boolean;
}

interface UnitStats {
  type: UnitType;
  attackRange: number;
  speed: number;
  health: number;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * AI Behavior: Kite and maintain optimal range for ranged units
 */
export function rangedAIBehavior(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): { shouldMove: boolean; destX: number; destY: number; shouldAttack: boolean } {
  if (!unit.target || unit.target.isDestroyed) {
    return { shouldMove: false, destX: unit.x, destY: unit.y, shouldAttack: false };
  }
  
  const dist = distance(unit.x, unit.y, unit.target.x, unit.target.y);
  const optimalRange = stats.attackRange * 0.8; // Stay at 80% of max range
  const minRange = stats.attackRange * 0.6; // Don't get closer than 60%
  const maxRange = stats.attackRange * 0.95; // Don't go further than 95%
  
  // Count nearby enemies
  const nearbyEnemies = allUnits.filter(other => 
    other.faction !== unit.faction &&
    !other.isDestroyed &&
    distance(unit.x, unit.y, other.x, other.y) < stats.attackRange * 1.5
  );
  
  // KITING BEHAVIOR: Enemy too close, back away
  if (dist < minRange || nearbyEnemies.length > 3) {
    const dx = unit.x - unit.target.x;
    const dy = unit.y - unit.target.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      // Move away from target
      const retreatDist = 100;
      const destX = unit.x + (dx / len) * retreatDist;
      const destY = unit.y + (dy / len) * retreatDist;
      
      return {
        shouldMove: true,
        destX,
        destY,
        shouldAttack: dist <= stats.attackRange, // Attack while retreating if in range
      };
    }
  }
  
  // POSITIONING: Enemy too far, advance to optimal range
  if (dist > maxRange) {
    const dx = unit.target.x - unit.x;
    const dy = unit.target.y - unit.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      // Move to optimal range
      const destX = unit.x + (dx / len) * (dist - optimalRange);
      const destY = unit.y + (dy / len) * (dist - optimalRange);
      
      return {
        shouldMove: true,
        destX,
        destY,
        shouldAttack: false,
      };
    }
  }
  
  // OPTIMAL RANGE: Hold position and attack
  return {
    shouldMove: false,
    destX: unit.x,
    destY: unit.y,
    shouldAttack: dist <= stats.attackRange,
  };
}

/**
 * AI Behavior: Chase and engage for melee units
 */
export function meleeAIBehavior(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): { shouldMove: boolean; destX: number; destY: number; shouldAttack: boolean } {
  if (!unit.target || unit.target.isDestroyed) {
    return { shouldMove: false, destX: unit.x, destY: unit.y, shouldAttack: false };
  }
  
  const dist = distance(unit.x, unit.y, unit.target.x, unit.target.y);
  
  // ENGAGE: Close enough to attack
  if (dist <= stats.attackRange) {
    return {
      shouldMove: false,
      destX: unit.x,
      destY: unit.y,
      shouldAttack: true,
    };
  }
  
  // CHASE: Move towards target
  return {
    shouldMove: true,
    destX: unit.target.x,
    destY: unit.target.y,
    shouldAttack: false,
  };
}

/**
 * AI Behavior: Support units stay behind frontline
 */
export function supportAIBehavior(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): { shouldMove: boolean; destX: number; destY: number; shouldAttack: boolean } {
  // Find friendly frontline units
  const friendlies = allUnits.filter(other =>
    other.faction === unit.faction &&
    !other.isDestroyed &&
    other.id !== unit.id
  );
  
  if (friendlies.length === 0) {
    return { shouldMove: false, destX: unit.x, destY: unit.y, shouldAttack: false };
  }
  
  // Calculate center of friendly army
  const avgX = friendlies.reduce((sum, u) => sum + u.x, 0) / friendlies.length;
  const avgY = friendlies.reduce((sum, u) => sum + u.y, 0) / friendlies.length;
  
  const dist = distance(unit.x, unit.y, avgX, avgY);
  const idealDist = 80; // Stay 80 pixels from center
  
  // REPOSITION: Stay with army
  if (dist > idealDist + 50 || dist < idealDist - 50) {
    const dx = avgX - unit.x;
    const dy = avgY - unit.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      const destX = unit.x + (dx / len) * (dist - idealDist);
      const destY = unit.y + (dy / len) * (dist - idealDist);
      
      return {
        shouldMove: true,
        destX,
        destY,
        shouldAttack: false,
      };
    }
  }
  
  // SUPPORT: Heal/buff nearby allies (attack command used for abilities)
  const woundedAlly = friendlies.find(other =>
    other.health < other.maxHealth * 0.5 &&
    distance(unit.x, unit.y, other.x, other.y) < stats.attackRange
  );
  
  return {
    shouldMove: false,
    destX: unit.x,
    destY: unit.y,
    shouldAttack: woundedAlly !== undefined,
  };
}

/**
 * Target selection: Choose best target based on unit type
 */
export function selectTarget(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): Unit | null {
  const enemies = allUnits.filter(other =>
    other.faction !== unit.faction &&
    !other.isDestroyed &&
    other.health > 0
  );
  
  if (enemies.length === 0) return null;
  
  // Ranged units: Target weakest enemy in range
  if (stats.type === 'ranged' || stats.type === 'magic') {
    const inRange = enemies.filter(e =>
      distance(unit.x, unit.y, e.x, e.y) <= stats.attackRange * 1.2
    );
    
    if (inRange.length > 0) {
      inRange.sort((a, b) => a.health - b.health);
      return inRange[0]; // Weakest
    }
    
    // No targets in range, target nearest
    enemies.sort((a, b) =>
      distance(unit.x, unit.y, a.x, a.y) - distance(unit.x, unit.y, b.x, b.y)
    );
    return enemies[0];
  }
  
  // Melee units: Target nearest enemy
  if (stats.type === 'melee' || stats.type === 'heavy' || stats.type === 'cavalry') {
    enemies.sort((a, b) =>
      distance(unit.x, unit.y, a.x, a.y) - distance(unit.x, unit.y, b.x, b.y)
    );
    return enemies[0];
  }
  
  // Support units: Don't attack enemies
  if (stats.type === 'support') {
    return null;
  }
  
  // Default: nearest enemy
  enemies.sort((a, b) =>
    distance(unit.x, unit.y, a.x, a.y) - distance(unit.x, unit.y, b.x, b.y)
  );
  return enemies[0];
}

/**
 * Get AI behavior based on unit type
 */
export function getAIBehavior(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): { shouldMove: boolean; destX: number; destY: number; shouldAttack: boolean } {
  switch (stats.type) {
    case 'ranged':
    case 'magic':
      return rangedAIBehavior(unit, stats, allUnits);
    
    case 'melee':
    case 'heavy':
    case 'cavalry':
      return meleeAIBehavior(unit, stats, allUnits);
    
    case 'support':
      return supportAIBehavior(unit, stats, allUnits);
    
    default:
      return meleeAIBehavior(unit, stats, allUnits);
  }
}

/**
 * Threat assessment: Determine if unit should retreat
 */
export function shouldRetreat(
  unit: Unit,
  stats: UnitStats,
  allUnits: Unit[]
): boolean {
  // Low health?
  if (unit.health < stats.health * 0.25) {
    return true;
  }
  
  // Outnumbered?
  const nearbyFriendlies = allUnits.filter(other =>
    other.faction === unit.faction &&
    !other.isDestroyed &&
    distance(unit.x, unit.y, other.x, other.y) < 200
  ).length;
  
  const nearbyEnemies = allUnits.filter(other =>
    other.faction !== unit.faction &&
    !other.isDestroyed &&
    distance(unit.x, unit.y, other.x, other.y) < 200
  ).length;
  
  return nearbyEnemies > nearbyFriendlies * 2;
}
