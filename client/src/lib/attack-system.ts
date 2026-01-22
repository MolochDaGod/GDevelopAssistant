/**
 * Multi-Attack System
 * Each unit can have multiple attacks with different animations and cooldowns
 * AI decides which attack to use based on situation
 */

export type AttackType = 'basic' | 'heavy' | 'special' | 'aoe' | 'heal';

export interface Attack {
  id: string;
  name: string;
  type: AttackType;
  animation: string; // e.g. "Attack01", "Attack02", "Attack03"
  damage: number;
  range: number;
  cooldown: number;
  aoeRadius?: number;
  healAmount?: number;
  statusEffect?: {
    effect: 'stun' | 'slow' | 'poison' | 'burn' | 'freeze';
    chance: number;
    duration: number;
  };
  aiPriority: number; // Higher = AI prefers this attack
  aiCondition?: (context: AttackContext) => boolean;
}

export interface AttackContext {
  targetHealth: number;
  targetMaxHealth: number;
  distanceToTarget: number;
  nearbyEnemyCount: number;
  userHealth: number;
  userMaxHealth: number;
}

export interface AttackCooldown {
  attackId: string;
  lastUsedTime: number;
}

/**
 * Define attacks for each unit type
 */
export const UNIT_ATTACKS: Record<string, Attack[]> = {
  // Ranged units have 2 attacks
  ranged: [
    {
      id: 'arrow_shot',
      name: 'Arrow Shot',
      type: 'basic',
      animation: 'Attack01',
      damage: 20,
      range: 120,
      cooldown: 0.8,
      aiPriority: 5,
    },
    {
      id: 'piercing_shot',
      name: 'Piercing Shot',
      type: 'special',
      animation: 'Attack02',
      damage: 35,
      range: 140,
      cooldown: 3.0,
      aiPriority: 10,
      aiCondition: (ctx) => ctx.targetHealth > ctx.targetMaxHealth * 0.5, // Use on healthy targets
    },
  ],
  
  // Melee units have 3 attacks
  melee: [
    {
      id: 'slash',
      name: 'Slash',
      type: 'basic',
      animation: 'Attack01',
      damage: 18,
      range: 25,
      cooldown: 0.7,
      aiPriority: 5,
    },
    {
      id: 'heavy_strike',
      name: 'Heavy Strike',
      type: 'heavy',
      animation: 'Attack02',
      damage: 30,
      range: 25,
      cooldown: 2.0,
      statusEffect: {
        effect: 'stun',
        chance: 0.3,
        duration: 1.5,
      },
      aiPriority: 8,
      aiCondition: (ctx) => ctx.targetHealth < ctx.targetMaxHealth * 0.5, // Execute low targets
    },
    {
      id: 'whirlwind',
      name: 'Whirlwind',
      type: 'aoe',
      animation: 'Attack03',
      damage: 25,
      range: 30,
      cooldown: 4.0,
      aoeRadius: 40,
      aiPriority: 12,
      aiCondition: (ctx) => ctx.nearbyEnemyCount >= 3, // Use when surrounded
    },
  ],
  
  // Heavy units have 2 attacks
  heavy: [
    {
      id: 'crush',
      name: 'Crush',
      type: 'basic',
      animation: 'Attack01',
      damage: 40,
      range: 30,
      cooldown: 1.2,
      aiPriority: 5,
    },
    {
      id: 'ground_slam',
      name: 'Ground Slam',
      type: 'aoe',
      animation: 'Attack02',
      damage: 50,
      range: 35,
      cooldown: 5.0,
      aoeRadius: 50,
      statusEffect: {
        effect: 'slow',
        chance: 0.5,
        duration: 2.0,
      },
      aiPriority: 15,
      aiCondition: (ctx) => ctx.nearbyEnemyCount >= 2,
    },
  ],
  
  // Magic units have 2 attacks
  magic: [
    {
      id: 'magic_bolt',
      name: 'Magic Bolt',
      type: 'basic',
      animation: 'Attack',
      damage: 28,
      range: 140,
      cooldown: 1.5,
      aiPriority: 5,
    },
    {
      id: 'fireball',
      name: 'Fireball',
      type: 'special',
      animation: 'Attack',
      damage: 45,
      range: 160,
      cooldown: 4.0,
      aoeRadius: 30,
      statusEffect: {
        effect: 'burn',
        chance: 0.4,
        duration: 3.0,
      },
      aiPriority: 12,
      aiCondition: (ctx) => ctx.nearbyEnemyCount >= 2 || ctx.targetHealth > ctx.targetMaxHealth * 0.6,
    },
  ],
  
  // Support units have healing
  support: [
    {
      id: 'minor_heal',
      name: 'Minor Heal',
      type: 'heal',
      animation: 'Attack',
      damage: 0,
      range: 100,
      cooldown: 2.0,
      healAmount: 30,
      aiPriority: 10,
    },
    {
      id: 'mass_heal',
      name: 'Mass Heal',
      type: 'heal',
      animation: 'Attack',
      damage: 0,
      range: 120,
      cooldown: 8.0,
      healAmount: 50,
      aoeRadius: 80,
      aiPriority: 15,
      aiCondition: (ctx) => ctx.nearbyEnemyCount === 0, // Only when safe
    },
  ],
  
  // Cavalry units have 2 attacks
  cavalry: [
    {
      id: 'lance_thrust',
      name: 'Lance Thrust',
      type: 'basic',
      animation: 'Attack01',
      damage: 30,
      range: 35,
      cooldown: 1.0,
      aiPriority: 5,
    },
    {
      id: 'charge',
      name: 'Charge',
      type: 'special',
      animation: 'Attack02',
      damage: 50,
      range: 40,
      cooldown: 6.0,
      statusEffect: {
        effect: 'stun',
        chance: 0.6,
        duration: 1.0,
      },
      aiPriority: 15,
      aiCondition: (ctx) => ctx.distanceToTarget > 60, // Use when charging from distance
    },
  ],
};

/**
 * Get available attacks for a unit type
 */
export function getAttacksForUnitType(unitType: string): Attack[] {
  return UNIT_ATTACKS[unitType] || UNIT_ATTACKS['melee'];
}

/**
 * Check if attack is off cooldown
 */
export function isAttackReady(
  attack: Attack,
  cooldowns: AttackCooldown[],
  currentTime: number
): boolean {
  const cd = cooldowns.find(c => c.attackId === attack.id);
  if (!cd) return true;
  
  return currentTime - cd.lastUsedTime >= attack.cooldown;
}

/**
 * AI: Select best attack to use
 */
export function selectAttackAI(
  attacks: Attack[],
  cooldowns: AttackCooldown[],
  context: AttackContext,
  currentTime: number
): Attack | null {
  // Filter to ready attacks
  const readyAttacks = attacks.filter(a => isAttackReady(a, cooldowns, currentTime));
  
  if (readyAttacks.length === 0) return null;
  
  // Filter by AI condition
  const validAttacks = readyAttacks.filter(a => {
    if (!a.aiCondition) return true;
    return a.aiCondition(context);
  });
  
  if (validAttacks.length === 0) {
    // No valid conditional attacks, use basic attack
    return readyAttacks[0];
  }
  
  // Sort by AI priority (highest first)
  validAttacks.sort((a, b) => b.aiPriority - a.aiPriority);
  
  return validAttacks[0];
}

/**
 * Record attack usage for cooldown tracking
 */
export function useAttack(
  attack: Attack,
  cooldowns: AttackCooldown[],
  currentTime: number
): void {
  const existing = cooldowns.find(c => c.attackId === attack.id);
  
  if (existing) {
    existing.lastUsedTime = currentTime;
  } else {
    cooldowns.push({
      attackId: attack.id,
      lastUsedTime: currentTime,
    });
  }
}

/**
 * Get attack cooldown remaining time
 */
export function getCooldownRemaining(
  attack: Attack,
  cooldowns: AttackCooldown[],
  currentTime: number
): number {
  const cd = cooldowns.find(c => c.attackId === attack.id);
  if (!cd) return 0;
  
  const elapsed = currentTime - cd.lastUsedTime;
  const remaining = attack.cooldown - elapsed;
  
  return Math.max(0, remaining);
}
