/**
 * A* Pathfinding System
 * Handles unit pathfinding with terrain collision avoidance
 */

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

interface TerrainCollider {
  x: number;
  y: number;
  radius: number;
  hasCollision: boolean;
}

/**
 * Manhattan distance heuristic
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Euclidean distance
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Check if position collides with terrain
 */
function collidesWithTerrain(
  x: number,
  y: number,
  radius: number,
  terrain: TerrainCollider[]
): boolean {
  for (const obj of terrain) {
    if (!obj.hasCollision) continue;
    
    const dist = distance(x, y, obj.x, obj.y);
    if (dist < radius + obj.radius) {
      return true;
    }
  }
  return false;
}

/**
 * Get neighboring grid positions (8-directional)
 */
function getNeighbors(x: number, y: number, gridSize: number): Array<{ x: number; y: number }> {
  return [
    { x: x + gridSize, y }, // Right
    { x: x - gridSize, y }, // Left
    { x, y: y + gridSize }, // Down
    { x, y: y - gridSize }, // Up
    { x: x + gridSize, y: y + gridSize }, // Down-Right
    { x: x - gridSize, y: y + gridSize }, // Down-Left
    { x: x + gridSize, y: y - gridSize }, // Up-Right
    { x: x - gridSize, y: y - gridSize }, // Up-Left
  ];
}

/**
 * A* pathfinding algorithm
 * Returns array of waypoints from start to goal
 */
export function findPath(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  unitRadius: number,
  terrain: TerrainCollider[],
  maxWidth: number,
  maxHeight: number,
  gridSize: number = 50
): Array<{ x: number; y: number }> {
  // Round to grid
  const roundToGrid = (val: number) => Math.round(val / gridSize) * gridSize;
  const sx = roundToGrid(startX);
  const sy = roundToGrid(startY);
  const gx = roundToGrid(goalX);
  const gy = roundToGrid(goalY);
  
  // If goal is too close, just return direct path
  if (distance(startX, startY, goalX, goalY) < gridSize * 2) {
    return [{ x: goalX, y: goalY }];
  }
  
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    x: sx,
    y: sy,
    g: 0,
    h: heuristic(sx, sy, gx, gy),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  
  openSet.push(startNode);
  
  let iterations = 0;
  const maxIterations = 1000; // Prevent infinite loops
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    const key = `${current.x},${current.y}`;
    closedSet.add(key);
    
    // Goal reached?
    if (distance(current.x, current.y, gx, gy) < gridSize) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      
      // Add final goal position
      path.push({ x: goalX, y: goalY });
      
      // Smooth path (remove redundant waypoints)
      return smoothPath(path, unitRadius, terrain);
    }
    
    // Check neighbors
    const neighbors = getNeighbors(current.x, current.y, gridSize);
    
    for (const neighbor of neighbors) {
      const nx = neighbor.x;
      const ny = neighbor.y;
      
      // Out of bounds?
      if (nx < 0 || nx > maxWidth || ny < 0 || ny > maxHeight) {
        continue;
      }
      
      const neighborKey = `${nx},${ny}`;
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      // Collision?
      if (collidesWithTerrain(nx, ny, unitRadius, terrain)) {
        continue;
      }
      
      const isDiagonal = nx !== current.x && ny !== current.y;
      const moveCost = isDiagonal ? 1.414 : 1.0; // Diagonal costs more
      const tentativeG = current.g + moveCost * gridSize;
      
      // Find existing node in open set
      const existingNode = openSet.find(n => n.x === nx && n.y === ny);
      
      if (!existingNode) {
        const newNode: PathNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h: heuristic(nx, ny, gx, gy),
          f: 0,
          parent: current,
        };
        newNode.f = newNode.g + newNode.h;
        openSet.push(newNode);
      } else if (tentativeG < existingNode.g) {
        // Better path found
        existingNode.g = tentativeG;
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = current;
      }
    }
  }
  
  // No path found, return direct line
  return [{ x: goalX, y: goalY }];
}

/**
 * Smooth path by removing unnecessary waypoints
 * Uses line-of-sight checking
 */
function smoothPath(
  path: Array<{ x: number; y: number }>,
  unitRadius: number,
  terrain: TerrainCollider[]
): Array<{ x: number; y: number }> {
  if (path.length <= 2) return path;
  
  const smoothed: Array<{ x: number; y: number }> = [path[0]];
  let currentIndex = 0;
  
  while (currentIndex < path.length - 1) {
    let farthestVisible = currentIndex + 1;
    
    // Find farthest visible waypoint
    for (let i = currentIndex + 2; i < path.length; i++) {
      if (hasLineOfSight(
        path[currentIndex].x,
        path[currentIndex].y,
        path[i].x,
        path[i].y,
        unitRadius,
        terrain
      )) {
        farthestVisible = i;
      }
    }
    
    smoothed.push(path[farthestVisible]);
    currentIndex = farthestVisible;
  }
  
  return smoothed;
}

/**
 * Check if there's a clear line of sight between two points
 */
function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  unitRadius: number,
  terrain: TerrainCollider[]
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / 20); // Check every 20 pixels
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    
    if (collidesWithTerrain(x, y, unitRadius, terrain)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Simple waypoint follower
 * Returns next immediate destination
 */
export function followPath(
  currentX: number,
  currentY: number,
  waypoints: Array<{ x: number; y: number }>,
  arrivalDistance: number = 5
): { x: number; y: number } | null {
  if (waypoints.length === 0) return null;
  
  const nextWaypoint = waypoints[0];
  const dist = distance(currentX, currentY, nextWaypoint.x, nextWaypoint.y);
  
  if (dist < arrivalDistance) {
    // Reached waypoint, move to next
    waypoints.shift();
    return waypoints.length > 0 ? waypoints[0] : null;
  }
  
  return nextWaypoint;
}
