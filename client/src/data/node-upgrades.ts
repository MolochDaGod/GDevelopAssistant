/**
 * Node Upgrade System
 * Defines upgrade tiers and unit unlocks per node level
 */

import type { UnitDefinition } from './faction-units';
import { FACTIONS } from './faction-units';

export type NodeType = 'start' | 'standard' | 'resource';
export type NodeLevel = 0 | 1 | 2 | 3;

export interface NodeUpgrade {
  level: NodeLevel;
  cost: number;
  unlockedUnits: string[]; // Unit IDs
  spawnRate: number;
  health: number;
  visionRadius: number;
}

export interface NodeDefinition {
  type: NodeType;
  upgrades: NodeUpgrade[];
  description: string;
  resourceBonus?: number; // For resource nodes
}

// Unit unlock tiers - organized by strength/complexity
export const UNIT_TIERS = {
  fabled: {
    tier0: ['fabled_archer', 'fabled_priest'], // Starting units
    tier1: ['fabled_armored_axeman', 'fabled_mage'], // Level 1 unlocks
    tier2: ['fabled_knight_templar', 'fabled_werebear'], // Level 2 unlocks
  },
  legion: {
    tier0: ['legion_skeleton', 'legion_skeleton_archer'],
    tier1: ['legion_armored_skeleton', 'legion_greatsword_skeleton'],
    tier2: ['legion_elite_orc', 'legion_orc_rider'],
  },
  crusade: {
    tier0: ['crusade_archer', 'crusade_soldier'],
    tier1: ['crusade_swordsman', 'crusade_priest'],
    tier2: ['crusade_knight', 'crusade_wizard', 'crusade_lancer'],
  },
};

export const NODE_TYPES: Record<NodeType, NodeDefinition> = {
  start: {
    type: 'start',
    description: 'Main base - Losing this node means defeat',
    upgrades: [
      {
        level: 0,
        cost: 0,
        unlockedUnits: [], // Set by faction tier0
        spawnRate: 0.15,
        health: 5000,
        visionRadius: 200,
      },
      {
        level: 1,
        cost: 500,
        unlockedUnits: [], // +tier1 units
        spawnRate: 0.18,
        health: 7500,
        visionRadius: 250,
      },
      {
        level: 2,
        cost: 1000,
        unlockedUnits: [], // +tier2 units
        spawnRate: 0.22,
        health: 10000,
        visionRadius: 300,
      },
      {
        level: 3,
        cost: 2000,
        unlockedUnits: [], // All units
        spawnRate: 0.28,
        health: 15000,
        visionRadius: 350,
      },
    ],
  },
  standard: {
    type: 'standard',
    description: 'Standard control point - Provides unit spawning',
    upgrades: [
      {
        level: 0,
        cost: 0,
        unlockedUnits: [], // tier0
        spawnRate: 0.08,
        health: 2000,
        visionRadius: 150,
      },
      {
        level: 1,
        cost: 300,
        unlockedUnits: [], // +tier1
        spawnRate: 0.12,
        health: 3500,
        visionRadius: 180,
      },
      {
        level: 2,
        cost: 600,
        unlockedUnits: [], // +tier2
        spawnRate: 0.16,
        health: 5000,
        visionRadius: 220,
      },
      {
        level: 3,
        cost: 1200,
        unlockedUnits: [], // All units
        spawnRate: 0.20,
        health: 7500,
        visionRadius: 280,
      },
    ],
  },
  resource: {
    type: 'resource',
    description: 'Resource node - Increases passive resource generation',
    resourceBonus: 0.25, // +25% resources per node held
    upgrades: [
      {
        level: 0,
        cost: 0,
        unlockedUnits: [], // tier0
        spawnRate: 0.05,
        health: 1500,
        visionRadius: 120,
      },
      {
        level: 1,
        cost: 200,
        unlockedUnits: [], // +tier1
        spawnRate: 0.08,
        health: 2500,
        visionRadius: 150,
      },
      {
        level: 2,
        cost: 400,
        unlockedUnits: [], // +tier2
        spawnRate: 0.12,
        health: 4000,
        visionRadius: 180,
      },
      {
        level: 3,
        cost: 800,
        unlockedUnits: [], // All units
        spawnRate: 0.16,
        health: 6000,
        visionRadius: 220,
      },
    ],
  },
};

/**
 * Get available units for a node at a specific level
 */
export function getNodeUnits(
  factionId: 'fabled' | 'legion' | 'crusade',
  nodeLevel: NodeLevel
): UnitDefinition[] {
  const faction = FACTIONS[factionId];
  const tiers = UNIT_TIERS[factionId];
  
  let availableIds: string[] = [...tiers.tier0];
  
  if (nodeLevel >= 1) {
    availableIds = [...availableIds, ...tiers.tier1];
  }
  if (nodeLevel >= 2) {
    availableIds = [...availableIds, ...tiers.tier2];
  }
  
  return faction.units.filter(u => availableIds.includes(u.id));
}

/**
 * Calculate total resource bonus from held resource nodes
 */
export function calculateResourceBonus(resourceNodesHeld: number): number {
  return 1.0 + (resourceNodesHeld * (NODE_TYPES.resource.resourceBonus || 0));
}

/**
 * Get upgrade cost for node
 */
export function getUpgradeCost(nodeType: NodeType, currentLevel: NodeLevel): number {
  if (currentLevel >= 3) return 0; // Max level
  const nextLevel = (currentLevel + 1) as NodeLevel;
  return NODE_TYPES[nodeType].upgrades[nextLevel].cost;
}

/**
 * Can afford upgrade?
 */
export function canAffordUpgrade(resources: number, nodeType: NodeType, currentLevel: NodeLevel): boolean {
  const cost = getUpgradeCost(nodeType, currentLevel);
  return resources >= cost && currentLevel < 3;
}
