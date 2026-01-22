import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface NPC {
  id: string;
  type: "enemy" | "friendly" | "neutral";
  subtype: string;
  x: number;
  y: number;
  direction: number;
  health: number;
  maxHealth: number;
  level: number;
  name: string;
  state: "idle" | "walking" | "attacking" | "dead";
}

interface NPCsLayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  npcs: NPC[];
  selectedId?: string;
  onNPCClick?: (npc: NPC) => void;
}

const NPC_COLORS: Record<string, { body: string; outline: string }> = {
  enemy: { body: "#8b0000", outline: "#ff4444" },
  friendly: { body: "#006400", outline: "#44ff44" },
  neutral: { body: "#4a4a4a", outline: "#888888" }
};

const SUBTYPE_SHAPES: Record<string, (ctx: CanvasRenderingContext2D, size: number) => void> = {
  skeleton: (ctx, size) => {
    ctx.beginPath();
    ctx.arc(0, -size * 0.4, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-size * 0.15, -size * 0.2, size * 0.3, size * 0.5);
    ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.8, size * 0.1);
  },
  goblin: (ctx, size) => {
    ctx.beginPath();
    ctx.arc(0, -size * 0.2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, -size * 0.4);
    ctx.lineTo(-size * 0.5, -size * 0.7);
    ctx.lineTo(-size * 0.2, -size * 0.35);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.35, -size * 0.4);
    ctx.lineTo(size * 0.5, -size * 0.7);
    ctx.lineTo(size * 0.2, -size * 0.35);
    ctx.fill();
  },
  wolf: (ctx, size) => {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-size * 0.4, -size * 0.1, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  },
  villager: (ctx, size) => {
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.15);
    ctx.lineTo(size * 0.3, -size * 0.15);
    ctx.lineTo(size * 0.2, size * 0.3);
    ctx.lineTo(-size * 0.2, size * 0.3);
    ctx.closePath();
    ctx.fill();
  },
  merchant: (ctx, size) => {
    ctx.beginPath();
    ctx.arc(0, -size * 0.35, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-size * 0.35, -size * 0.15, size * 0.7, size * 0.5, size * 0.1);
    ctx.fill();
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },
  default: (ctx, size) => {
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const NPCsLayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  npcs,
  selectedId,
  onNPCClick 
}: NPCsLayerProps) => {
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

    const time = Date.now() / 1000;
    
    for (const npc of npcs) {
      if (npc.state === "dead") continue;
      
      const x = npc.x - mapWidth / 2;
      const y = npc.y - mapHeight / 2;
      const isSelected = npc.id === selectedId;
      const size = 12 + npc.level * 0.5;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(npc.direction);
      
      if (isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      const colors = NPC_COLORS[npc.type];
      ctx.fillStyle = colors.body;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 1.5;
      
      const drawShape = SUBTYPE_SHAPES[npc.subtype] || SUBTYPE_SHAPES.default;
      drawShape(ctx, size);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.rotate(-npc.direction);
      
      if (npc.health < npc.maxHealth) {
        const healthPercent = npc.health / npc.maxHealth;
        const barWidth = size * 1.5;
        const barHeight = 3;
        const barY = -size * 0.7 - 8;
        
        ctx.fillStyle = "#333333";
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000";
        ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
      }
      
      ctx.restore();
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, npcs, selectedId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNPCClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clickX - centerX) / camera.zoom + camera.x + mapWidth / 2;
    const worldY = (clickY - centerY) / camera.zoom + camera.y + mapHeight / 2;
    
    for (const npc of npcs) {
      if (npc.state === "dead") continue;
      const dx = npc.x - worldX;
      const dy = npc.y - worldY;
      if (dx * dx + dy * dy < 400) {
        onNPCClick(npc);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 4,
        pointerEvents: "auto",
        cursor: "pointer"
      }}
      data-testid="npcs-layer"
    />
  );
});

NPCsLayer.displayName = "NPCsLayer";
