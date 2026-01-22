import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, Zap, Coins, Play, RotateCcw, Home } from 'lucide-react';
import { Link } from 'wouter';

interface Vector2 {
  x: number;
  y: number;
}

interface Unit {
  id: string;
  faction: number;
  x: number;
  y: number;
  destX: number;
  destY: number;
  health: number;
  maxHealth: number;
  size: number;
  moveSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  nextAttackTime: number;
  target: Unit | null;
  type: 'fighter' | 'destroyer' | 'ranger';
  isDestroyed: boolean;
  isHolding: boolean;
  holdX: number;
  holdY: number;
  holdRadius: number;
}

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  capturedByFaction: number;
  captureProgress: number;
  maxCaptureProgress: number;
  isHQ: boolean;
  spawnRate: number;
  lastSpawnTime: number;
  selectedUnitType: 'fighter' | 'destroyer' | 'ranger';
}

interface GameState {
  units: Unit[];
  circles: Circle[];
  gameStatus: 'menu' | 'playing' | 'paused' | 'won' | 'lost';
  playerFaction: number;
  coins: number;
  upgrades: {
    attack: number;
    defense: number;
    spawnSpeed: number;
  };
  time: number;
  selection: { x1: number; y1: number; x2: number; y2: number } | null;
  selectedUnits: Set<string>;
}

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 700;
const SPAWN_RATE_MULTIPLIER = 0.25;
const BASE_SPAWN_RATE = 2;

const UNIT_TYPES = {
  fighter: {
    health: 100,
    damage: 15,
    speed: 60,
    range: 25,
    cooldown: 0.5,
    size: 4,
    color: '#06F',
  },
  destroyer: {
    health: 300,
    damage: 50,
    speed: 35,
    range: 40,
    cooldown: 1.2,
    size: 8,
    color: '#06F',
  },
  ranger: {
    health: 60,
    damage: 25,
    speed: 50,
    range: 80,
    cooldown: 0.8,
    size: 5,
    color: '#06F',
  },
};

const UPGRADE_COSTS = {
  attack: [50, 100, 200, 400, 800],
  defense: [50, 100, 200, 400, 800],
  spawnSpeed: [75, 150, 300, 600, 1200],
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function createCircleLayout(): Circle[] {
  const circles: Circle[] = [];
  const marginX = 120;
  const centerY = GAME_HEIGHT / 2;
  
  circles.push({
    id: generateId(),
    x: marginX,
    y: centerY,
    radius: 50,
    capturedByFaction: 1,
    captureProgress: 10000,
    maxCaptureProgress: 10000,
    isHQ: true,
    spawnRate: BASE_SPAWN_RATE * SPAWN_RATE_MULTIPLIER,
    lastSpawnTime: 0,
    selectedUnitType: 'fighter',
  });

  circles.push({
    id: generateId(),
    x: GAME_WIDTH - marginX,
    y: centerY,
    radius: 50,
    capturedByFaction: 2,
    captureProgress: 10000,
    maxCaptureProgress: 10000,
    isHQ: true,
    spawnRate: BASE_SPAWN_RATE * SPAWN_RATE_MULTIPLIER,
    lastSpawnTime: 0,
    selectedUnitType: 'fighter',
  });

  const rows = [3, 2, 3];
  const totalRows = rows.length;
  const rowSpacing = (GAME_WIDTH - 2 * marginX - 200) / (totalRows + 1);
  
  rows.forEach((count, rowIndex) => {
    const rowX = marginX + 100 + rowSpacing * (rowIndex + 1);
    const verticalSpacing = GAME_HEIGHT / (count + 1);
    
    for (let i = 0; i < count; i++) {
      circles.push({
        id: generateId(),
        x: rowX,
        y: verticalSpacing * (i + 1),
        radius: 40,
        capturedByFaction: 0,
        captureProgress: 0,
        maxCaptureProgress: 5000,
        isHQ: false,
        spawnRate: BASE_SPAWN_RATE * SPAWN_RATE_MULTIPLIER * 0.5,
        lastSpawnTime: 0,
        selectedUnitType: 'fighter',
      });
    }
  });

  return circles;
}

function createUnit(faction: number, x: number, y: number, type: 'fighter' | 'destroyer' | 'ranger', upgrades: GameState['upgrades']): Unit {
  const stats = UNIT_TYPES[type];
  const attackMod = 1 + upgrades.attack * 0.15;
  const defenseMod = 1 + upgrades.defense * 0.15;
  
  return {
    id: generateId(),
    faction,
    x,
    y,
    destX: x,
    destY: y,
    health: stats.health * defenseMod,
    maxHealth: stats.health * defenseMod,
    size: stats.size,
    moveSpeed: stats.speed,
    attackDamage: stats.damage * attackMod,
    attackRange: stats.range,
    attackCooldown: stats.cooldown,
    nextAttackTime: Math.random() * stats.cooldown,
    target: null,
    type,
    isDestroyed: false,
    isHolding: false,
    holdX: x,
    holdY: y,
    holdRadius: 60,
  };
}

export default function SwarmRTS() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    units: [],
    circles: [],
    gameStatus: 'menu',
    playerFaction: 1,
    coins: 0,
    upgrades: { attack: 0, defense: 0, spawnSpeed: 0 },
    time: 0,
    selection: null,
    selectedUnits: new Set(),
  });
  const [displayState, setDisplayState] = useState({
    coins: 0,
    units: [0, 0, 0],
    gameStatus: 'menu' as GameState['gameStatus'],
    upgrades: { attack: 0, defense: 0, spawnSpeed: 0 },
    selectedCircle: null as Circle | null,
  });
  
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Vector2>({ x: 0, y: 0 });

  const initGame = useCallback((playerFaction: number) => {
    const circles = createCircleLayout();
    const units: Unit[] = [];
    
    circles.forEach(circle => {
      if (circle.isHQ) {
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * circle.radius * 0.8;
          units.push(createUnit(
            circle.capturedByFaction,
            circle.x + Math.cos(angle) * dist,
            circle.y + Math.sin(angle) * dist,
            'fighter',
            { attack: 0, defense: 0, spawnSpeed: 0 }
          ));
        }
      }
    });

    gameStateRef.current = {
      units,
      circles,
      gameStatus: 'playing',
      playerFaction,
      coins: 0,
      upgrades: { attack: 0, defense: 0, spawnSpeed: 0 },
      time: 0,
      selection: null,
      selectedUnits: new Set(),
    };
    
    setDisplayState({
      coins: 0,
      units: [0, units.filter(u => u.faction === 1).length, units.filter(u => u.faction === 2).length],
      gameStatus: 'playing',
      upgrades: { attack: 0, defense: 0, spawnSpeed: 0 },
      selectedCircle: null,
    });
  }, []);

  const updateGame = useCallback((delta: number) => {
    const state = gameStateRef.current;
    if (state.gameStatus !== 'playing') return;

    state.time += delta;

    const aiFaction = state.playerFaction === 1 ? 2 : 1;
    const aiUnits = state.units.filter(u => u.faction === aiFaction && !u.isDestroyed);
    
    const neutralCircles = state.circles.filter(c => c.capturedByFaction === 0);
    const enemyCircles = state.circles.filter(c => c.capturedByFaction === state.playerFaction);
    const playerHQ = state.circles.find(c => c.isHQ && c.capturedByFaction === state.playerFaction);

    aiUnits.forEach((unit, index) => {
      if (unit.target) return;
      
      const isAtDest = Math.abs(unit.x - unit.destX) < 5 && Math.abs(unit.y - unit.destY) < 5;
      if (!isAtDest) return;

      let targetCircle: Circle | null = null;
      
      if (neutralCircles.length > 0 && index < aiUnits.length * 0.4) {
        neutralCircles.sort((a, b) => {
          const distA = distance(unit.x, unit.y, a.x, a.y);
          const distB = distance(unit.x, unit.y, b.x, b.y);
          return distA - distB;
        });
        targetCircle = neutralCircles[index % neutralCircles.length];
      } else if (playerHQ && aiUnits.length > 80) {
        targetCircle = playerHQ;
      } else if (enemyCircles.length > 0) {
        enemyCircles.sort((a, b) => {
          const distA = distance(unit.x, unit.y, a.x, a.y);
          const distB = distance(unit.x, unit.y, b.x, b.y);
          return distA - distB;
        });
        targetCircle = enemyCircles[0];
      }

      if (targetCircle) {
        const angle = Math.random() * Math.PI * 2;
        const spread = Math.random() * targetCircle.radius * 0.5;
        unit.destX = targetCircle.x + Math.cos(angle) * spread;
        unit.destY = targetCircle.y + Math.sin(angle) * spread;
      }
    });

    state.circles.forEach(circle => {
      if (circle.capturedByFaction !== 0 && circle.captureProgress >= circle.maxCaptureProgress) {
        const isPlayerCircle = circle.capturedByFaction === state.playerFaction;
        const spawnMod = isPlayerCircle ? (1 + state.upgrades.spawnSpeed * 0.2) : 1;
        const effectiveRate = circle.spawnRate * spawnMod;
        
        if (state.time - circle.lastSpawnTime >= 1 / effectiveRate) {
          circle.lastSpawnTime = state.time;
          
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * circle.radius * 0.5;
          const upgrades = circle.capturedByFaction === state.playerFaction ? state.upgrades : { attack: 0, defense: 0, spawnSpeed: 0 };
          
          state.units.push(createUnit(
            circle.capturedByFaction,
            circle.x + Math.cos(angle) * dist,
            circle.y + Math.sin(angle) * dist,
            circle.selectedUnitType,
            upgrades
          ));
        }
      }

      const unitsInCircle: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
      state.units.forEach(unit => {
        if (!unit.isDestroyed && distance(unit.x, unit.y, circle.x, circle.y) < circle.radius) {
          unitsInCircle[unit.faction]++;
        }
      });

      const faction1Count = unitsInCircle[1];
      const faction2Count = unitsInCircle[2];
      const dominantFaction = faction1Count > faction2Count ? 1 : faction2Count > faction1Count ? 2 : 0;
      const dominantCount = Math.max(faction1Count, faction2Count);
      const minorityCount = Math.min(faction1Count, faction2Count);
      const netCount = dominantCount - minorityCount;

      if (dominantFaction !== 0 && netCount > 0) {
        if (circle.capturedByFaction === dominantFaction) {
          circle.captureProgress = Math.min(circle.maxCaptureProgress, circle.captureProgress + netCount * delta * 50);
        } else if (circle.capturedByFaction === 0) {
          circle.capturedByFaction = dominantFaction;
          circle.captureProgress = netCount * delta * 50;
        } else {
          circle.captureProgress -= netCount * delta * 75;
          if (circle.captureProgress <= 0) {
            if (!circle.isHQ) {
              circle.capturedByFaction = 0;
              circle.captureProgress = 0;
            } else {
              circle.captureProgress = 0;
            }
          }
        }
      }
    });

    state.units.forEach(unit => {
      if (unit.isDestroyed) return;

      if (unit.x !== unit.destX || unit.y !== unit.destY) {
        let targetX = unit.destX;
        let targetY = unit.destY;
        
        if (unit.isHolding) {
          const distFromHold = distance(targetX, targetY, unit.holdX, unit.holdY);
          if (distFromHold > unit.holdRadius) {
            const angle = Math.atan2(targetY - unit.holdY, targetX - unit.holdX);
            targetX = unit.holdX + Math.cos(angle) * unit.holdRadius;
            targetY = unit.holdY + Math.sin(angle) * unit.holdRadius;
          }
        }
        
        const dist = distance(unit.x, unit.y, targetX, targetY);
        if (dist > 1) {
          const moveAmount = Math.min(unit.moveSpeed * delta, dist);
          const ratio = moveAmount / dist;
          unit.x += (targetX - unit.x) * ratio;
          unit.y += (targetY - unit.y) * ratio;
          unit.x = Math.max(0, Math.min(GAME_WIDTH, unit.x));
          unit.y = Math.max(0, Math.min(GAME_HEIGHT, unit.y));
        }
      }

      if (state.time >= unit.nextAttackTime) {
        let nearestEnemy: Unit | null = null;
        let nearestDist = Infinity;
        
        const searchRange = unit.isHolding ? unit.holdRadius + unit.attackRange : unit.attackRange * 1.5;
        
        state.units.forEach(other => {
          if (other.isDestroyed || other.faction === unit.faction || other.faction === 0) return;
          const d = distance(unit.x, unit.y, other.x, other.y);
          if (d < nearestDist && d < searchRange) {
            nearestDist = d;
            nearestEnemy = other;
          }
        });

        if (nearestEnemy !== null && nearestDist <= unit.attackRange) {
          const enemy = nearestEnemy as Unit;
          unit.target = enemy;
          enemy.health -= unit.attackDamage;
          unit.nextAttackTime = state.time + unit.attackCooldown;
          
          if (enemy.health <= 0) {
            enemy.isDestroyed = true;
            if (unit.faction === state.playerFaction) {
              state.coins += 1;
            }
          }
        } else if (nearestEnemy !== null && nearestDist > unit.attackRange) {
          const enemy = nearestEnemy as Unit;
          if (unit.isHolding) {
            const distToEnemy = distance(unit.holdX, unit.holdY, enemy.x, enemy.y);
            if (distToEnemy <= unit.holdRadius + unit.attackRange) {
              unit.destX = enemy.x;
              unit.destY = enemy.y;
            }
          } else {
            unit.destX = enemy.x;
            unit.destY = enemy.y;
          }
        }
      }
    });

    state.units = state.units.filter(u => !u.isDestroyed);

    const faction1Units = state.units.filter(u => u.faction === 1).length;
    const faction2Units = state.units.filter(u => u.faction === 2).length;
    const faction1HQ = state.circles.find(c => c.isHQ && c.capturedByFaction === 1);
    const faction2HQ = state.circles.find(c => c.isHQ && c.capturedByFaction === 2);

    if (!faction1HQ || (faction1Units === 0 && faction1HQ.captureProgress <= 0)) {
      state.gameStatus = state.playerFaction === 1 ? 'lost' : 'won';
    } else if (!faction2HQ || (faction2Units === 0 && faction2HQ.captureProgress <= 0)) {
      state.gameStatus = state.playerFaction === 2 ? 'lost' : 'won';
    }

    setDisplayState(prev => ({
      ...prev,
      coins: state.coins,
      units: [0, faction1Units, faction2Units],
      gameStatus: state.gameStatus,
      upgrades: state.upgrades,
    }));
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return;

    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return;

    const state = gameStateRef.current;

    bgCtx.fillStyle = '#0a0a0a';
    bgCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 200; i++) {
      const x = (i * 73) % GAME_WIDTH;
      const y = (i * 47) % GAME_HEIGHT;
      bgCtx.fillStyle = `rgba(100,100,100,${0.3 + Math.random() * 0.2})`;
      bgCtx.fillRect(x, y, 1, 1);
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    state.circles.forEach(circle => {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      if (circle.capturedByFaction === 1) {
        ctx.fillStyle = '#06F';
      } else if (circle.capturedByFaction === 2) {
        ctx.fillStyle = '#F00';
      } else {
        ctx.fillStyle = '#666';
      }
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.isHQ ? 15 : 10, 0, Math.PI * 2);
      ctx.fillStyle = circle.capturedByFaction === 1 ? '#06F' : circle.capturedByFaction === 2 ? '#F00' : '#888';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const progress = circle.captureProgress / circle.maxCaptureProgress;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(circle.x - 20, circle.y + (circle.isHQ ? 20 : 15), 40, 8);
      ctx.fillStyle = circle.capturedByFaction === 1 ? '#06F' : circle.capturedByFaction === 2 ? '#F00' : '#888';
      ctx.fillRect(circle.x - 19, circle.y + (circle.isHQ ? 21 : 16), 38 * progress, 6);

      if (circle.isHQ) {
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('HQ', circle.x, circle.y + 4);
      }
    });

    const faction1Units = state.units.filter(u => u.faction === 1);
    const faction2Units = state.units.filter(u => u.faction === 2);

    ctx.fillStyle = '#06F';
    faction1Units.forEach(unit => {
      const isSelected = state.selectedUnits.has(unit.id);
      
      if (unit.isHolding) {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(unit.holdX, unit.holdY, unit.holdRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 165, 0, 0.05)';
        ctx.fill();
        ctx.fillStyle = '#06F';
      }
      
      if (isSelected) {
        ctx.strokeStyle = '#0F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.size + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      if (unit.type === 'fighter') {
        ctx.fillStyle = isSelected ? '#4AF' : '#06F';
        ctx.fillRect(unit.x - unit.size / 2, unit.y - unit.size / 2, unit.size, unit.size);
      } else if (unit.type === 'destroyer') {
        ctx.fillStyle = isSelected ? '#4AF' : '#06F';
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y - unit.size);
        ctx.lineTo(unit.x - unit.size * 0.7, unit.y + unit.size * 0.5);
        ctx.lineTo(unit.x + unit.size * 0.7, unit.y + unit.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = isSelected ? '#4AF' : '#06F';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.fillStyle = '#F00';
    faction2Units.forEach(unit => {
      if (unit.type === 'fighter') {
        ctx.fillRect(unit.x - unit.size / 2, unit.y - unit.size / 2, unit.size, unit.size);
      } else if (unit.type === 'destroyer') {
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y - unit.size);
        ctx.lineTo(unit.x - unit.size * 0.7, unit.y + unit.size * 0.5);
        ctx.lineTo(unit.x + unit.size * 0.7, unit.y + unit.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    state.units.forEach(unit => {
      if (unit.target && !unit.target.isDestroyed && state.time < unit.nextAttackTime - unit.attackCooldown + 0.1) {
        ctx.strokeStyle = unit.faction === 1 ? '#0F0' : '#FF0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(unit.target.x, unit.target.y);
        ctx.stroke();
      }
    });

    if (state.selection && isDraggingRef.current) {
      ctx.strokeStyle = '#0F0';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(
        state.selection.x1,
        state.selection.y1,
        state.selection.x2 - state.selection.x1,
        state.selection.y2 - state.selection.y1
      );
      ctx.strokeRect(
        state.selection.x1,
        state.selection.y1,
        state.selection.x2 - state.selection.x1,
        state.selection.y2 - state.selection.y1
      );
    }
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const delta = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
    lastTimeRef.current = timestamp;

    updateGame(delta);
    render();

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updateGame, render]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        const state = gameStateRef.current;
        if (state.selectedUnits.size > 0) {
          state.units.forEach(unit => {
            if (state.selectedUnits.has(unit.id)) {
              unit.isHolding = true;
              unit.holdX = unit.x;
              unit.holdY = unit.y;
              unit.destX = unit.x;
              unit.destY = unit.y;
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    isDraggingRef.current = true;
    dragStartRef.current = { x, y };
    gameStateRef.current.selection = { x1: x, y1: y, x2: x, y2: y };
    gameStateRef.current.selectedUnits.clear();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameStateRef.current.selection = {
      x1: Math.min(dragStartRef.current.x, x),
      y1: Math.min(dragStartRef.current.y, y),
      x2: Math.max(dragStartRef.current.x, x),
      y2: Math.max(dragStartRef.current.y, y),
    };
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const state = gameStateRef.current;
    if (state.selection) {
      state.units.forEach(unit => {
        if (unit.faction === state.playerFaction &&
            unit.x >= state.selection!.x1 && unit.x <= state.selection!.x2 &&
            unit.y >= state.selection!.y1 && unit.y <= state.selection!.y2) {
          state.selectedUnits.add(unit.id);
        }
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;

    if (state.selectedUnits.size > 0) {
      const selectedUnitsList = state.units.filter(u => state.selectedUnits.has(u.id));
      if (selectedUnitsList.length > 0) {
        const centerX = selectedUnitsList.reduce((sum, u) => sum + u.x, 0) / selectedUnitsList.length;
        const centerY = selectedUnitsList.reduce((sum, u) => sum + u.y, 0) / selectedUnitsList.length;
        
        selectedUnitsList.forEach(unit => {
          const offsetX = (unit.x - centerX) * 0.5;
          const offsetY = (unit.y - centerY) * 0.5;
          unit.destX = Math.max(0, Math.min(GAME_WIDTH, x + offsetX));
          unit.destY = Math.max(0, Math.min(GAME_HEIGHT, y + offsetY));
          unit.isHolding = false;
        });
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;

    const clickedCircle = state.circles.find(c => 
      distance(x, y, c.x, c.y) < c.radius && c.capturedByFaction === state.playerFaction
    );

    setDisplayState(prev => ({
      ...prev,
      selectedCircle: clickedCircle || null,
    }));
  };

  const purchaseUpgrade = (type: 'attack' | 'defense' | 'spawnSpeed') => {
    const state = gameStateRef.current;
    const level = state.upgrades[type];
    if (level >= 5) return;
    
    const cost = UPGRADE_COSTS[type][level];
    if (state.coins >= cost) {
      state.coins -= cost;
      state.upgrades[type]++;
      setDisplayState(prev => ({
        ...prev,
        coins: state.coins,
        upgrades: { ...state.upgrades },
      }));
    }
  };

  const setUnitType = (type: 'fighter' | 'destroyer' | 'ranger') => {
    const state = gameStateRef.current;
    state.circles.forEach(c => {
      if (c.capturedByFaction === state.playerFaction) {
        c.selectedUnitType = type;
      }
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-4" data-testid="swarm-rts-page">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-home">
            <Home className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Swarm RTS</h1>
        <Badge className="bg-yellow-600 text-white" data-testid="badge-coins">
          <Coins className="w-4 h-4 mr-1" />
          {displayState.coins}
        </Badge>
      </div>

      <div className="flex gap-4">
        <div className="relative">
          <canvas
            ref={bgCanvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="absolute inset-0"
            data-testid="canvas-background"
          />
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="relative border border-gray-800 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
            data-testid="canvas-game"
          />

          {displayState.gameStatus === 'menu' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="flex flex-col gap-4 items-center">
                <h2 className="text-3xl font-bold text-white mb-4">Swarm RTS</h2>
                <p className="text-gray-400 max-w-md text-center mb-4">
                  Capture circles to spawn units. Each kill earns 1 coin.
                  Upgrade your army and conquer the enemy HQ!
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={() => initGame(1)}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-play-blue"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play as Blue
                  </Button>
                  <Button
                    onClick={() => initGame(2)}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-play-red"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play as Red
                  </Button>
                </div>
              </div>
            </div>
          )}

          {(displayState.gameStatus === 'won' || displayState.gameStatus === 'lost') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="flex flex-col gap-4 items-center">
                <h2 className={`text-4xl font-bold ${displayState.gameStatus === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                  {displayState.gameStatus === 'won' ? 'Victory!' : 'Defeat'}
                </h2>
                <Button
                  onClick={() => setDisplayState(prev => ({ ...prev, gameStatus: 'menu' }))}
                  variant="outline"
                  data-testid="button-restart"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
              </div>
            </div>
          )}
        </div>

        <Card className="w-64 p-4 bg-gray-900 border-gray-800">
          <h3 className="text-white font-bold mb-4">Controls</h3>
          <p className="text-gray-400 text-sm mb-2">Left-click drag: Select units</p>
          <p className="text-gray-400 text-sm mb-4">Right-click: Move selected</p>

          <h3 className="text-white font-bold mb-2">Unit Count</h3>
          <div className="flex justify-between mb-4">
            <span className="text-blue-400">Blue: {displayState.units[1]}</span>
            <span className="text-red-400">Red: {displayState.units[2]}</span>
          </div>

          <h3 className="text-white font-bold mb-2">Unit Type</h3>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => setUnitType('fighter')} data-testid="button-unit-fighter">
              Fighter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setUnitType('destroyer')} data-testid="button-unit-destroyer">
              Tank
            </Button>
            <Button size="sm" variant="outline" onClick={() => setUnitType('ranger')} data-testid="button-unit-ranger">
              Ranger
            </Button>
          </div>

          <h3 className="text-white font-bold mb-2">Upgrades</h3>
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-between"
              onClick={() => purchaseUpgrade('attack')}
              disabled={displayState.upgrades.attack >= 5 || displayState.coins < UPGRADE_COSTS.attack[displayState.upgrades.attack]}
              data-testid="button-upgrade-attack"
            >
              <span className="flex items-center">
                <Sword className="w-4 h-4 mr-2" />
                Attack Lv.{displayState.upgrades.attack}
              </span>
              <span>{displayState.upgrades.attack < 5 ? UPGRADE_COSTS.attack[displayState.upgrades.attack] : 'MAX'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-between"
              onClick={() => purchaseUpgrade('defense')}
              disabled={displayState.upgrades.defense >= 5 || displayState.coins < UPGRADE_COSTS.defense[displayState.upgrades.defense]}
              data-testid="button-upgrade-defense"
            >
              <span className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Defense Lv.{displayState.upgrades.defense}
              </span>
              <span>{displayState.upgrades.defense < 5 ? UPGRADE_COSTS.defense[displayState.upgrades.defense] : 'MAX'}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-between"
              onClick={() => purchaseUpgrade('spawnSpeed')}
              disabled={displayState.upgrades.spawnSpeed >= 5 || displayState.coins < UPGRADE_COSTS.spawnSpeed[displayState.upgrades.spawnSpeed]}
              data-testid="button-upgrade-spawn"
            >
              <span className="flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                Spawn Lv.{displayState.upgrades.spawnSpeed}
              </span>
              <span>{displayState.upgrades.spawnSpeed < 5 ? UPGRADE_COSTS.spawnSpeed[displayState.upgrades.spawnSpeed] : 'MAX'}</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
