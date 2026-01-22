import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface TerrainTile {
  type: "grass" | "road" | "water" | "cliff" | "sand";
}

export interface TerrainFeature {
  id: string;
  type: "tree" | "rock" | "bush" | "flower";
  x: number;
  y: number;
  size: number;
  variant: number;
}

interface TerrainLayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  tiles?: TerrainTile[][];
  features?: TerrainFeature[];
}

const TILE_SIZE = 32;

const TERRAIN_COLORS: Record<string, string> = {
  grass: "#2d4a3e",
  road: "#5c5c5c",
  water: "#1a4a6e",
  cliff: "#4a3d2e",
  sand: "#c2b280"
};

const TREE_COLORS = ["#1a5c1a", "#228b22", "#2da32d", "#1e7b1e"];
const ROCK_COLORS = ["#6b6b6b", "#808080", "#5a5a5a"];

export const TerrainLayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  tiles,
  features = []
}: TerrainLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    if (tiles && tiles.length > 0) {
      for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < tiles[y].length; x++) {
          const tile = tiles[y][x];
          const worldX = (x - mapWidth / 2) * TILE_SIZE;
          const worldY = (y - mapHeight / 2) * TILE_SIZE;
          
          ctx.fillStyle = TERRAIN_COLORS[tile.type] || TERRAIN_COLORS.grass;
          ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
        }
      }
    } else {
      ctx.fillStyle = TERRAIN_COLORS.grass;
      ctx.fillRect(-mapWidth / 2, -mapHeight / 2, mapWidth, mapHeight);
      
      ctx.strokeStyle = "#3d5a4e";
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = -mapWidth / 2; x <= mapWidth / 2; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -mapHeight / 2);
        ctx.lineTo(x, mapHeight / 2);
        ctx.stroke();
      }
      for (let y = -mapHeight / 2; y <= mapHeight / 2; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-mapWidth / 2, y);
        ctx.lineTo(mapWidth / 2, y);
        ctx.stroke();
      }
    }

    for (const feature of features) {
      const x = feature.x - mapWidth / 2;
      const y = feature.y - mapHeight / 2;
      
      if (feature.type === "tree") {
        const baseColor = TREE_COLORS[feature.variant % TREE_COLORS.length];
        ctx.fillStyle = "#1a5c1a";
        ctx.beginPath();
        ctx.arc(x, y, feature.size * 1.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(x - feature.size * 0.2, y - feature.size * 0.2, feature.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#2da32d";
        ctx.beginPath();
        ctx.arc(x - feature.size * 0.4, y - feature.size * 0.4, feature.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (feature.type === "rock") {
        const rockColor = ROCK_COLORS[feature.variant % ROCK_COLORS.length];
        ctx.fillStyle = rockColor;
        ctx.beginPath();
        ctx.ellipse(x, y, feature.size * 1.2, feature.size * 0.8, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#8a8a8a";
        ctx.beginPath();
        ctx.ellipse(x - feature.size * 0.2, y - feature.size * 0.2, feature.size * 0.6, feature.size * 0.4, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (feature.type === "bush") {
        ctx.fillStyle = "#1e5c1e";
        ctx.beginPath();
        ctx.arc(x, y, feature.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.arc(x + feature.size * 0.3, y - feature.size * 0.2, feature.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.arc(x - feature.size * 0.3, y - feature.size * 0.2, feature.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (feature.type === "flower") {
        const flowerColors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff"];
        ctx.fillStyle = "#228b22";
        ctx.beginPath();
        ctx.arc(x, y, feature.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flowerColors[feature.variant % flowerColors.length];
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const px = x + Math.cos(angle) * feature.size * 0.4;
          const py = y + Math.sin(angle) * feature.size * 0.4;
          ctx.beginPath();
          ctx.arc(px, py, feature.size * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, tiles, features]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: "none"
      }}
      data-testid="terrain-layer"
    />
  );
});

TerrainLayer.displayName = "TerrainLayer";
