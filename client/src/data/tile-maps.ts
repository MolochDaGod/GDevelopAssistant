/**
 * Tile-Based Map System
 * Defines maps with tiles, roads, terrain colliders (trees, rocks, water)
 */

import type { FactionId } from './faction-units';
import type { NodeType, NodeLevel } from './node-upgrades';

export type TileType = 'grass' | 'road' | 'dirt' | 'water' | 'stone';
export type TerrainObjectType = 'tree' | 'rock' | 'bush' | 'water_area';

export interface TerrainObject {
  id: string;
  type: TerrainObjectType;
  x: number;
  y: number;
  radius: number; // Collision radius
  hasCollision: boolean;
}

export interface MapTile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
}

export interface GameNode {
  id: string;
  nodeType: NodeType;
  x: number;
  y: number;
  radius: number;
  capturedByFaction: FactionId | null;
  level: NodeLevel;
  health: number;
  maxHealth: number;
  selectedUnitId: string | null; // Currently selected unit to spawn
  lastSpawnTime: number;
}

export interface TileBasedMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: MapTile[];
  terrainObjects: TerrainObject[];
  nodes: GameNode[];
  startPositions: Record<FactionId, { x: number; y: number }>;
  difficulty: number;
  description: string;
}

// Helper to generate tile grid
function generateTileGrid(
  width: number,
  height: number,
  tileSize: number,
  baseType: TileType = 'grass'
): MapTile[] {
  const tiles: MapTile[] = [];
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  
  for (let y = 0; y < tilesY; y++) {
    for (let x = 0; x < tilesX; x++) {
      tiles.push({
        x: x * tileSize,
        y: y * tileSize,
        type: baseType,
        walkable: true,
      });
    }
  }
  
  return tiles;
}

// Helper to add road between two points
function addRoad(
  tiles: MapTile[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tileSize: number,
  width: number = 3
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / (tileSize / 2);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.floor((x1 + dx * t) / tileSize) * tileSize;
    const y = Math.floor((y1 + dy * t) / tileSize) * tileSize;
    
    for (let wy = -width; wy <= width; wy++) {
      for (let wx = -width; wx <= width; wx++) {
        const tile = tiles.find(t => t.x === x + wx * tileSize && t.y === y + wy * tileSize);
        if (tile) {
          tile.type = 'road';
        }
      }
    }
  }
}

/**
 * SMALL CONQUEST MAP
 * 2 start nodes (1 per team), 2 standard nodes, 1 resource node
 */
export const SMALL_CONQUEST_MAP: TileBasedMap = {
  id: 'small_conquest',
  name: 'Small Conquest',
  width: 2400,
  height: 1400,
  tileSize: 50,
  difficulty: 1,
  description: 'Small 2v2 map with resource control point',
  
  tiles: generateTileGrid(2400, 1400, 50, 'grass'),
  
  nodes: [
    // Player Start Node (LEFT)
    {
      id: 'start_left',
      nodeType: 'start',
      x: 300,
      y: 700,
      radius: 80,
      capturedByFaction: 'fabled',
      level: 0,
      health: 5000,
      maxHealth: 5000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Enemy Start Node (RIGHT)
    {
      id: 'start_right',
      nodeType: 'start',
      x: 2100,
      y: 700,
      radius: 80,
      capturedByFaction: 'legion',
      level: 0,
      health: 5000,
      maxHealth: 5000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Top Standard Node
    {
      id: 'node_top',
      nodeType: 'standard',
      x: 1200,
      y: 400,
      radius: 60,
      capturedByFaction: null,
      level: 0,
      health: 2000,
      maxHealth: 2000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Bottom Standard Node
    {
      id: 'node_bottom',
      nodeType: 'standard',
      x: 1200,
      y: 1000,
      radius: 60,
      capturedByFaction: null,
      level: 0,
      health: 2000,
      maxHealth: 2000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Center Resource Node
    {
      id: 'resource_center',
      nodeType: 'resource',
      x: 1200,
      y: 700,
      radius: 70,
      capturedByFaction: null,
      level: 0,
      health: 1500,
      maxHealth: 1500,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
  ],
  
  terrainObjects: [
    // Trees around edges
    { id: 'tree1', type: 'tree', x: 150, y: 200, radius: 25, hasCollision: true },
    { id: 'tree2', type: 'tree', x: 200, y: 250, radius: 25, hasCollision: true },
    { id: 'tree3', type: 'tree', x: 150, y: 1200, radius: 25, hasCollision: true },
    { id: 'tree4', type: 'tree', x: 200, y: 1150, radius: 25, hasCollision: true },
    { id: 'tree5', type: 'tree', x: 2250, y: 200, radius: 25, hasCollision: true },
    { id: 'tree6', type: 'tree', x: 2200, y: 250, radius: 25, hasCollision: true },
    { id: 'tree7', type: 'tree', x: 2250, y: 1200, radius: 25, hasCollision: true },
    { id: 'tree8', type: 'tree', x: 2200, y: 1150, radius: 25, hasCollision: true },
    
    // Rocks near center
    { id: 'rock1', type: 'rock', x: 1000, y: 600, radius: 30, hasCollision: true },
    { id: 'rock2', type: 'rock', x: 1400, y: 800, radius: 30, hasCollision: true },
    
    // Bushes (decorative, no collision)
    { id: 'bush1', type: 'bush', x: 500, y: 500, radius: 15, hasCollision: false },
    { id: 'bush2', type: 'bush', x: 1900, y: 900, radius: 15, hasCollision: false },
  ],
  
  startPositions: {
    fabled: { x: 300, y: 700 },
    legion: { x: 2100, y: 700 },
    crusade: { x: 1200, y: 700 },
  },
};

// Add roads to small conquest map
const smallMapTiles = SMALL_CONQUEST_MAP.tiles;
addRoad(smallMapTiles, 300, 700, 1200, 400, 50, 2); // Left start to top
addRoad(smallMapTiles, 300, 700, 1200, 1000, 50, 2); // Left start to bottom
addRoad(smallMapTiles, 2100, 700, 1200, 400, 50, 2); // Right start to top
addRoad(smallMapTiles, 2100, 700, 1200, 1000, 50, 2); // Right start to bottom
addRoad(smallMapTiles, 1200, 400, 1200, 1000, 50, 2); // Top to bottom (center road)

/**
 * MEDIUM TACTICAL MAP
 * More nodes, more terrain variety
 */
export const MEDIUM_TACTICAL_MAP: TileBasedMap = {
  id: 'medium_tactical',
  name: 'Tactical Warfare',
  width: 3000,
  height: 1800,
  tileSize: 50,
  difficulty: 2,
  description: 'Medium map with strategic chokepoints and resource nodes',
  
  tiles: generateTileGrid(3000, 1800, 50, 'grass'),
  
  nodes: [
    // Start nodes
    {
      id: 'start_left',
      nodeType: 'start',
      x: 400,
      y: 900,
      radius: 80,
      capturedByFaction: 'fabled',
      level: 0,
      health: 5000,
      maxHealth: 5000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    {
      id: 'start_right',
      nodeType: 'start',
      x: 2600,
      y: 900,
      radius: 80,
      capturedByFaction: 'crusade',
      level: 0,
      health: 5000,
      maxHealth: 5000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Resource nodes
    {
      id: 'resource_top',
      nodeType: 'resource',
      x: 1500,
      y: 400,
      radius: 65,
      capturedByFaction: null,
      level: 0,
      health: 1500,
      maxHealth: 1500,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    {
      id: 'resource_bottom',
      nodeType: 'resource',
      x: 1500,
      y: 1400,
      radius: 65,
      capturedByFaction: null,
      level: 0,
      health: 1500,
      maxHealth: 1500,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    // Standard control points
    {
      id: 'node_mid_left',
      nodeType: 'standard',
      x: 900,
      y: 600,
      radius: 60,
      capturedByFaction: null,
      level: 0,
      health: 2000,
      maxHealth: 2000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    {
      id: 'node_mid_right',
      nodeType: 'standard',
      x: 2100,
      y: 1200,
      radius: 60,
      capturedByFaction: null,
      level: 0,
      health: 2000,
      maxHealth: 2000,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
    {
      id: 'node_center',
      nodeType: 'standard',
      x: 1500,
      y: 900,
      radius: 70,
      capturedByFaction: null,
      level: 0,
      health: 2500,
      maxHealth: 2500,
      selectedUnitId: null,
      lastSpawnTime: 0,
    },
  ],
  
  terrainObjects: [
    // Forest clusters
    { id: 'forest1_1', type: 'tree', x: 600, y: 300, radius: 28, hasCollision: true },
    { id: 'forest1_2', type: 'tree', x: 650, y: 350, radius: 28, hasCollision: true },
    { id: 'forest1_3', type: 'tree', x: 700, y: 320, radius: 28, hasCollision: true },
    
    { id: 'forest2_1', type: 'tree', x: 2300, y: 1500, radius: 28, hasCollision: true },
    { id: 'forest2_2', type: 'tree', x: 2350, y: 1550, radius: 28, hasCollision: true },
    { id: 'forest2_3', type: 'tree', x: 2400, y: 1520, radius: 28, hasCollision: true },
    
    // Rock formations (chokepoints)
    { id: 'rocks1', type: 'rock', x: 1200, y: 700, radius: 35, hasCollision: true },
    { id: 'rocks2', type: 'rock', x: 1800, y: 1100, radius: 35, hasCollision: true },
    { id: 'rocks3', type: 'rock', x: 1300, y: 1200, radius: 30, hasCollision: true },
    
    // Decorative bushes
    { id: 'bush_dec1', type: 'bush', x: 800, y: 800, radius: 15, hasCollision: false },
    { id: 'bush_dec2', type: 'bush', x: 2200, y: 1000, radius: 15, hasCollision: false },
  ],
  
  startPositions: {
    fabled: { x: 400, y: 900 },
    legion: { x: 1500, y: 900 },
    crusade: { x: 2600, y: 900 },
  },
};

// Add roads to medium map
const mediumMapTiles = MEDIUM_TACTICAL_MAP.tiles;
addRoad(mediumMapTiles, 400, 900, 900, 600, 50, 2);
addRoad(mediumMapTiles, 900, 600, 1500, 400, 50, 2);
addRoad(mediumMapTiles, 1500, 900, 1500, 400, 50, 2);
addRoad(mediumMapTiles, 2600, 900, 2100, 1200, 50, 2);
addRoad(mediumMapTiles, 2100, 1200, 1500, 1400, 50, 2);
addRoad(mediumMapTiles, 1500, 900, 1500, 1400, 50, 2);

export const TILE_MAPS: TileBasedMap[] = [
  SMALL_CONQUEST_MAP,
  MEDIUM_TACTICAL_MAP,
];

/**
 * Check if position collides with terrain
 */
export function checkTerrainCollision(
  x: number,
  y: number,
  radius: number,
  terrainObjects: TerrainObject[]
): boolean {
  for (const obj of terrainObjects) {
    if (!obj.hasCollision) continue;
    
    const dx = x - obj.x;
    const dy = y - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < radius + obj.radius) {
      return true;
    }
  }
  return false;
}
